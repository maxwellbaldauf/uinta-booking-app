// Live Google reviews for the home page, via Place Details (Places API New).
//
// NOT cached, on purpose. Google's Maps Platform Service Specific Terms
// (§14.3, Places API) allow caching only lat/lng (30 days) and the place ID;
// the Places policies page: "You must not pre-fetch, cache, or store Places
// API content beyond the allowed exceptions." So there is no reviews table, no
// "last known-good" copy, and no Next fetch cache (`cache: "no-store"`) —
// every request to /api/reviews asks Google directly, server-side, and if Google
// doesn't answer in time the reviews block simply doesn't render. The only
// thing persisted is fetch health (lib/googleReviewsHealth.ts), which holds
// no Google content.
//
// (A two-week snapshot version existed briefly — 7b96b2a — and was reverted
// at Max's request.)
//
// Key: GOOGLE_PLACES_REVIEWS_API_KEY — a server-only key, API-restricted to
// Places API (New). NEXT_PUBLIC_GOOGLE_PLACES_API_KEY can't be used: it's
// HTTP-referrer restricted and Google rejects it server-side
// (API_KEY_HTTP_REFERRER_BLOCKED — verified 2026-09-30).
// Place: GOOGLE_PLACE_ID — the Google Business Profile's place ID (storable
// indefinitely per the terms above).
//
// Cost note: the `reviews` field puts every call in a higher Place Details
// pricing tier. It's only called from app/api/reviews, which the home page hits
// when a visitor scrolls near the pricing section (not on page load).

const PLACES_BASE = "https://places.googleapis.com/v1/places/";
const TIMEOUT_MS = 3_500;
// Display cap. Google returns at most 5 reviews per request, so this is also
// the most that can ever come back.
export const MAX_REVIEWS = 5;

export type GoogleReview = {
  authorName: string;
  authorUri: string | null;
  authorPhotoUri: string | null;
  rating: number;
  text: string;
  translated: boolean;
  relativeTime: string | null;
  publishedAt: number; // ms since epoch, 0 if Google omitted it
  googleMapsUri: string | null;
};

export type ReviewsResult =
  // Not configured (no key / place ID) — the feature is simply off. Not a
  // fetch failure: deploying before the key exists must not trip the alert.
  | { status: "unconfigured" }
  | { status: "ok"; reviews: GoogleReview[] }
  | { status: "error"; detail: string };

// Only ever render https links/images from the response — never a javascript:
// or data: URL that a malformed payload could smuggle into an href or src.
function httpsUrl(v: unknown): string | null {
  if (typeof v !== "string") return null;
  try {
    const u = new URL(v);
    return u.protocol === "https:" ? u.toString() : null;
  } catch {
    return null;
  }
}

function str(v: unknown): string {
  return typeof v === "string" ? v.trim() : "";
}

type RawReview = {
  rating?: unknown;
  text?: { text?: unknown; languageCode?: unknown };
  originalText?: { text?: unknown; languageCode?: unknown };
  relativePublishTimeDescription?: unknown;
  publishTime?: unknown;
  googleMapsUri?: unknown;
  authorAttribution?: { displayName?: unknown; uri?: unknown; photoUri?: unknown };
};

// Pure: raw Place Details `reviews` → the 5-star reviews we display, newest
// first (the on-page notice says so). Google decides WHICH reviews come back
// (at most 5, chosen by relevance); we only order and filter that set. A
// review without an author name or any text is dropped: attribution is
// mandatory and an empty card says nothing.
export function toFiveStarReviews(raw: unknown): GoogleReview[] {
  if (!Array.isArray(raw)) return [];
  const out: GoogleReview[] = [];
  for (const r of raw as RawReview[]) {
    if (!r || typeof r !== "object" || r.rating !== 5) continue;
    const authorName = str(r.authorAttribution?.displayName);
    const text = str(r.text?.text) || str(r.originalText?.text);
    if (!authorName || !text) continue;
    const lang = str(r.text?.languageCode);
    const origLang = str(r.originalText?.languageCode);
    out.push({
      authorName,
      authorUri: httpsUrl(r.authorAttribution?.uri),
      authorPhotoUri: httpsUrl(r.authorAttribution?.photoUri),
      rating: 5,
      text,
      translated: !!lang && !!origLang && lang !== origLang,
      relativeTime: str(r.relativePublishTimeDescription) || null,
      publishedAt: Date.parse(str(r.publishTime)) || 0,
      googleMapsUri: httpsUrl(r.googleMapsUri),
    });
  }
  return out.sort((a, b) => b.publishedAt - a.publishedAt).slice(0, MAX_REVIEWS);
}

export async function fetchFiveStarReviews(): Promise<ReviewsResult> {
  const apiKey = process.env.GOOGLE_PLACES_REVIEWS_API_KEY?.trim();
  const placeId = process.env.GOOGLE_PLACE_ID?.trim();
  if (!apiKey || !placeId) return { status: "unconfigured" };

  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), TIMEOUT_MS);
  try {
    const res = await fetch(
      `${PLACES_BASE}${encodeURIComponent(placeId)}?languageCode=en`,
      {
        headers: {
          "X-Goog-Api-Key": apiKey,
          "X-Goog-FieldMask": "reviews",
        },
        cache: "no-store",
        signal: controller.signal,
      }
    );
    if (!res.ok) {
      let body = "";
      try {
        body = (await res.text()).slice(0, 300);
      } catch {
        // keep the status alone
      }
      return { status: "error", detail: `HTTP ${res.status} ${body}`.trim() };
    }
    const json = (await res.json()) as { reviews?: unknown };
    return { status: "ok", reviews: toFiveStarReviews(json.reviews) };
  } catch (err) {
    const detail =
      err instanceof Error && err.name === "AbortError"
        ? `timed out after ${TIMEOUT_MS}ms`
        : err instanceof Error
          ? err.message
          : String(err);
    return { status: "error", detail };
  } finally {
    clearTimeout(timer);
  }
}
