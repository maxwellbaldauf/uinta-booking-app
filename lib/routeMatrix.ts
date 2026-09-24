// Google's Route Matrix API (routes.googleapis.com computeRouteMatrix), not
// the legacy Distance Matrix API — Google is actively moving developers off
// the legacy one. GOOGLE_ROUTE_MATRIX_API_KEY is shared with
// uinta-field-app's own copy of this file (same literal key value, one
// Google Cloud budget alert covering both apps' combined spend) — see
// .env.local.example. This file itself is NOT shared/imported across repos,
// same convention as lib/geocode.ts and lib/ics.ts: each repo keeps its own
// copy, tuned to its own latency budget (this one serves a real customer
// waiting synchronously on the booking/reschedule slot picker).

export type LatLng = { lat: number; lng: number };

const ROUTE_MATRIX_URL = "https://routes.googleapis.com/distanceMatrix/v2:computeRouteMatrix";
const FIELD_MASK = "originIndex,destinationIndex,duration,distanceMeters,status,condition";
const MAX_DESTINATIONS_PER_CALL = 25;

type RouteMatrixElement = {
  originIndex?: number;
  destinationIndex?: number;
  status?: { code?: number; message?: string };
  condition?: string; // "ROUTE_EXISTS" | "ROUTE_NOT_FOUND" | ...
  duration?: string; // e.g. "1234s"
  distanceMeters?: number;
};

function parseDurationSeconds(duration: string | undefined): number | null {
  if (!duration) return null;
  const match = /^(\d+(?:\.\d+)?)s$/.exec(duration);
  return match ? Math.round(Number(match[1])) : null;
}

export class RouteMatrixError extends Error {
  constructor(
    message: string,
    public readonly status: number | null
  ) {
    super(message);
    this.name = "RouteMatrixError";
  }
}

// Transient failures (network blip, 429, 5xx) are worth a retry; a
// config/auth problem (400/401/403) never resolves itself on retry and
// should fail fast — this repo's retry budget is already tiny.
export function isRetryableRouteMatrixError(err: unknown): boolean {
  if (err instanceof RouteMatrixError) {
    if (err.status == null) return true; // network-level failure
    return err.status === 429 || err.status >= 500;
  }
  return true;
}

// Single origin, up to 25 destinations. Returns a map keyed by destination
// INDEX (matching the order `destinations` was passed in). A single element
// with an error status/no-route condition is simply absent from the result
// rather than failing the whole call. `opts.signal` should always be passed
// here from a caller enforcing its own overall timeout budget.
export async function getDrivingDurations(
  origin: LatLng,
  destinations: LatLng[],
  opts?: { signal?: AbortSignal }
): Promise<Map<number, number>> {
  const apiKey = process.env.GOOGLE_ROUTE_MATRIX_API_KEY;
  if (!apiKey) throw new RouteMatrixError("GOOGLE_ROUTE_MATRIX_API_KEY not configured", null);
  if (destinations.length === 0) return new Map();
  if (destinations.length > MAX_DESTINATIONS_PER_CALL) {
    throw new Error(
      `getDrivingDurations: chunk destinations to ${MAX_DESTINATIONS_PER_CALL} or fewer before calling`
    );
  }

  const body = {
    origins: [
      { waypoint: { location: { latLng: { latitude: origin.lat, longitude: origin.lng } } } },
    ],
    destinations: destinations.map((d) => ({
      waypoint: { location: { latLng: { latitude: d.lat, longitude: d.lng } } },
    })),
    travelMode: "DRIVE",
    routingPreference: "TRAFFIC_UNAWARE",
  };

  let res: Response;
  try {
    res = await fetch(ROUTE_MATRIX_URL, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "X-Goog-Api-Key": apiKey,
        "X-Goog-FieldMask": FIELD_MASK,
      },
      body: JSON.stringify(body),
      signal: opts?.signal,
    });
  } catch (err) {
    throw new RouteMatrixError(`Route Matrix request failed: ${(err as Error).message}`, null);
  }

  if (!res.ok) {
    const text = await res.text().catch(() => "");
    throw new RouteMatrixError(`Route Matrix request failed: ${res.status} ${text}`, res.status);
  }

  const elements = (await res.json()) as RouteMatrixElement[];
  const durations = new Map<number, number>();
  for (const el of elements) {
    if (el.destinationIndex == null) continue;
    if (el.condition && el.condition !== "ROUTE_EXISTS") continue;
    if (el.status?.code) continue;
    const seconds = parseDurationSeconds(el.duration);
    if (seconds != null) durations.set(el.destinationIndex, seconds);
  }
  return durations;
}
