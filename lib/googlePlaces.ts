// Client-only loader for the Google Maps JavaScript API's "places" library
// (the current Autocomplete Data API — google.maps.places.AutocompleteSuggestion
// / AutocompleteSessionToken — not the legacy google.maps.places.Autocomplete
// widget, which Google no longer recommends for new integrations).
//
// Uses NEXT_PUBLIC_GOOGLE_PLACES_API_KEY, a separate browser-restricted key
// (HTTP referrer restriction, scoped to the Places API) — never the
// server-only GOOGLE_MAPS_API_KEY used for geocoding in lib/geocode.ts.
//
// Minimal local types for exactly the surface used here, rather than pulling
// in the full @types/google.maps package for a handful of calls.

export type PlacePrediction = {
  text: { toString(): string };
  toPlace(): Place;
};

export type Place = {
  formattedAddress: string | null;
  fetchFields(options: { fields: string[] }): Promise<{ place: Place }>;
};

export type AutocompleteSessionToken = Record<string, never>;

type AutocompleteRequest = {
  input: string;
  sessionToken: AutocompleteSessionToken;
  includedPrimaryTypes?: string[];
  region?: string;
};

type PlacesLibrary = {
  AutocompleteSessionToken: new () => AutocompleteSessionToken;
  AutocompleteSuggestion: {
    fetchAutocompleteSuggestions(
      request: AutocompleteRequest
    ): Promise<{ suggestions: { placePrediction: PlacePrediction | null }[] }>;
  };
};

type GoogleNamespace = { maps: { importLibrary(name: string): Promise<unknown> } };

let placesLibraryPromise: Promise<PlacesLibrary> | null = null;

// Returns null (not a rejected promise) when no key is configured, so callers
// can fall back to a plain text input instead of surfacing a load error.
export function loadPlacesLibrary(): Promise<PlacesLibrary> | null {
  const apiKey = process.env.NEXT_PUBLIC_GOOGLE_PLACES_API_KEY;
  if (!apiKey) return null;

  if (!placesLibraryPromise) {
    placesLibraryPromise = new Promise<PlacesLibrary>((resolve, reject) => {
      const script = document.createElement("script");
      // No `libraries=` param: importLibrary() below loads "places" on
      // demand, which is the whole point of the importLibrary pattern.
      script.src = `https://maps.googleapis.com/maps/api/js?key=${encodeURIComponent(apiKey)}&loading=async&v=weekly`;
      script.async = true;
      // Read the live IDL property, not getAttribute() — browsers blank the
      // nonce content attribute once it's applied (to stop exfiltration via
      // innerHTML/attribute reads), so getAttribute("nonce") always returns
      // "" here even when a real page-wide CSP nonce exists.
      script.nonce = document.querySelector<HTMLScriptElement>("script[nonce]")?.nonce ?? "";
      script.onerror = () => reject(new Error("The Google Maps JavaScript API could not load."));
      script.onload = () => {
        const google = (window as unknown as { google?: GoogleNamespace }).google;
        if (!google) {
          reject(new Error("Google Maps script loaded but window.google is missing."));
          return;
        }
        google.maps
          .importLibrary("places")
          .then((lib) => resolve(lib as PlacesLibrary))
          .catch(reject);
      };
      document.head.appendChild(script);
    });
  }

  return placesLibraryPromise;
}
