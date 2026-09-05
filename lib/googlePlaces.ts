// Client-only loader for the Google Maps JavaScript API's "places" library
// (the current Autocomplete Data API — google.maps.places.AutocompleteSuggestion
// / AutocompleteSessionToken — not the legacy google.maps.places.Autocomplete
// widget, which Google no longer recommends for new integrations).
//
// Uses NEXT_PUBLIC_GOOGLE_PLACES_API_KEY, a separate browser-restricted key
// (HTTP referrer restriction, scoped to the Places API) — never the
// server-only GOOGLE_MAPS_API_KEY used for geocoding in lib/geocode.ts.
//
// google.maps.importLibrary is NOT automatically available just because a
// Maps script tag exists on the page — it only exists once Google's own
// bootstrap loader has installed it as a stub, before the real script has
// even started loading (see
// https://developers.google.com/maps/documentation/javascript/load-maps-js-api
// and Google's own AutocompleteSuggestion example, which embeds this exact
// bootstrap). This ports that bootstrap's structure/sequencing faithfully
// (readable names, not Google's literal minified source) rather than
// hand-rolling a simpler "add a script tag, wait for onload, call
// importLibrary" approach — that shape shipped to production as a crash
// (TypeError: google.maps.importLibrary is not a function), because
// nothing had ever defined importLibrary before it was called.
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

type GoogleMapsNamespace = {
  importLibrary?: (name: string) => Promise<unknown>;
  __ib__?: () => void;
};
type GoogleNamespace = { maps: GoogleMapsNamespace };

function getGoogleMaps(): GoogleMapsNamespace {
  const w = window as unknown as { google?: GoogleNamespace };
  w.google ??= { maps: {} };
  w.google.maps ??= {};
  return w.google.maps;
}

let scriptLoadPromise: Promise<void> | null = null;
const requestedLibraries = new Set<string>();

function loadScript(apiKey: string): Promise<void> {
  if (scriptLoadPromise) return scriptLoadPromise;
  scriptLoadPromise = new Promise<void>((resolve, reject) => {
    // Deferred by a tick (awaiting an already-resolved value just yields
    // once) so any other importLibrary() calls made in the same synchronous
    // block of code all land in requestedLibraries before the `libraries=`
    // param below is read — matching Google's own bootstrap's batching.
    void Promise.resolve().then(() => {
      const params = new URLSearchParams({
        key: apiKey,
        v: "weekly",
        libraries: [...requestedLibraries].join(","),
        callback: "google.maps.__ib__",
      });
      const script = document.createElement("script");
      script.src = `https://maps.googleapis.com/maps/api/js?${params}`;
      script.async = true;
      script.nonce = document.querySelector<HTMLScriptElement>("script[nonce]")?.nonce ?? "";
      script.onerror = () => reject(new Error("The Google Maps JavaScript API could not load."));
      getGoogleMaps().__ib__ = resolve;
      document.head.appendChild(script);
    });
  });
  return scriptLoadPromise;
}

// Installs the stub described above: queues the requested library name,
// triggers (or reuses) the single real script load, and re-dispatches to
// whatever importLibrary has become by the time that resolves — Google's
// real implementation, since loading the full API overwrites this stub as
// a side effect of running.
function installBootstrap(apiKey: string) {
  const maps = getGoogleMaps();
  if (maps.importLibrary) return; // already installed (stub or real)

  maps.importLibrary = (name: string): Promise<unknown> => {
    requestedLibraries.add(name);
    return loadScript(apiKey).then(() => getGoogleMaps().importLibrary!(name));
  };
}

// Returns null (not a rejected promise) when no key is configured, so callers
// can fall back to a plain text input instead of surfacing a load error.
export function loadPlacesLibrary(): Promise<PlacesLibrary> | null {
  const apiKey = process.env.NEXT_PUBLIC_GOOGLE_PLACES_API_KEY;
  if (!apiKey) return null;

  installBootstrap(apiKey);
  return getGoogleMaps().importLibrary!("places") as Promise<PlacesLibrary>;
}
