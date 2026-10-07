// Copied verbatim from Project A's lib/geocode.ts — kept identical on purpose.

// city comes from Google's structured address_components (never parsed from the
// free-text address). null when Google returned none.
type GeocodeResult = { lat: number; lng: number; city: string | null } | null;

type AddressComponent = { long_name?: string; types?: string[] };

// Municipality name: `locality`, then `postal_town` (UK-style countries). No
// neighborhood/township fallbacks: a missing city shows as "No city found"
// rather than a name that fragments the ranking.
export function cityFromComponents(components: AddressComponent[] | undefined): string | null {
  for (const type of ["locality", "postal_town"]) {
    const hit = components?.find((c) => c.types?.includes(type) && c.long_name);
    if (hit?.long_name) return hit.long_name;
  }
  return null;
}

export async function geocodeAddress(address: string): Promise<GeocodeResult> {
  const apiKey = process.env.GOOGLE_MAPS_API_KEY;
  if (!apiKey) {
    console.error("geocode: GOOGLE_MAPS_API_KEY is not set");
    return null;
  }

  const url = new URL("https://maps.googleapis.com/maps/api/geocode/json");
  url.searchParams.set("address", address);
  url.searchParams.set("key", apiKey);

  let response: Response;
  try {
    response = await fetch(url.toString());
  } catch (err) {
    console.error("geocode: fetch failed", err);
    return null;
  }

  if (!response.ok) {
    console.error("geocode: non-OK HTTP response", {
      status: response.status,
      statusText: response.statusText,
    });
    return null;
  }

  const data = await response.json();

  // Google's Geocoding API wraps errors (ZERO_RESULTS, OVER_QUERY_LIMIT,
  // REQUEST_DENIED, ...) inside an HTTP 200 — response.ok alone doesn't
  // tell you whether this actually succeeded.
  if (data.status !== "OK" || !data.results?.[0]?.geometry?.location) {
    // ZERO_RESULTS is a routine outcome (a mistyped or incomplete address),
    // not an infrastructure failure — logging it at error level would drown
    // out genuine issues (REQUEST_DENIED, OVER_QUERY_LIMIT, ...).
    const log = data.status === "ZERO_RESULTS" ? console.warn : console.error;
    log("geocode: Google API returned a non-OK status", {
      status: data.status,
      error_message: data.error_message,
    });
    return null;
  }

  const { lat, lng } = data.results[0].geometry.location;
  return { lat, lng, city: cityFromComponents(data.results[0].address_components) };
}
