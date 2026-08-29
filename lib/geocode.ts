// Copied verbatim from Project A's lib/geocode.ts — kept identical on purpose.

type GeocodeResult = { lat: number; lng: number } | null;

export async function geocodeAddress(address: string): Promise<GeocodeResult> {
  const apiKey = process.env.GOOGLE_MAPS_API_KEY;
  if (!apiKey) return null;

  const url = new URL("https://maps.googleapis.com/maps/api/geocode/json");
  url.searchParams.set("address", address);
  url.searchParams.set("key", apiKey);

  let response: Response;
  try {
    response = await fetch(url.toString());
  } catch {
    return null;
  }

  if (!response.ok) return null;

  const data = await response.json();

  // Google's Geocoding API wraps errors (ZERO_RESULTS, OVER_QUERY_LIMIT,
  // REQUEST_DENIED, ...) inside an HTTP 200 — response.ok alone doesn't
  // tell you whether this actually succeeded.
  if (data.status !== "OK" || !data.results?.[0]?.geometry?.location) {
    return null;
  }

  const { lat, lng } = data.results[0].geometry.location;
  return { lat, lng };
}
