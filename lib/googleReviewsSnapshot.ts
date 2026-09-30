// Two-week snapshot of the live 5-star Google reviews, so the home page asks
// Google about once every other week instead of on every render.
//
// KNOWN DEVIATION FROM GOOGLE'S TERMS — Max's explicit call (2026-09-30), made
// after being told: Google's Maps Platform Service Terms (§14.3) and the
// Places policies ("You must not pre-fetch, cache, or store Places API
// content beyond the allowed exceptions") don't allow keeping review content
// beyond the place ID and lat/lng. The risk is Google revoking the API key or
// flagging the project. If that ever bites, the fix is one line: set
// REFRESH_MS to 0 and this becomes a live fetch on every render again.
//
// Stored in Netlify Blobs (per-deployment, no shared-schema change) beside the
// fetch-health state (lib/googleReviewsHealth.ts). Where Blobs isn't
// available (plain `next dev`), there's no snapshot and every render fetches
// live, exactly as before.
import { getStore } from "@netlify/blobs";
import { fetchFiveStarReviews, type GoogleReview } from "@/lib/googleReviews";

export const REFRESH_MS = 14 * 24 * 60 * 60_000;
// After a failed refresh, wait this long before trying Google again, so an
// outage isn't hammered by every page view — but short enough that the
// failure alert (3 failures over 15+ minutes) still trips promptly.
export const RETRY_MS = 10 * 60_000;
// Display cap. Google returns at most 5 reviews per request, so this is
// headroom for the layout, not a target.
export const MAX_REVIEWS = 7;

const STORE = "google-reviews";
const KEY = "snapshot";

type Snapshot = {
  reviews: GoogleReview[];
  fetchedAt: string; // last SUCCESSFUL fetch (epoch 0 if none yet)
  lastAttemptAt: string; // last attempt, successful or not
};

export type ReviewsView =
  | { unconfigured: true }
  | {
      unconfigured?: false;
      reviews: GoogleReview[];
      // Present only when THIS call actually asked Google — feeds the health
      // tracking. Absent when served from the snapshot.
      fetched?: { ok: true } | { ok: false; detail: string };
    };

// Pure: what to do with the stored snapshot.
export function decideRefresh(
  snap: { fetchedAt: string; lastAttemptAt: string } | null,
  nowMs: number
): "fresh" | "backoff" | "refresh" {
  if (!snap) return "refresh";
  if (nowMs - Date.parse(snap.fetchedAt) < REFRESH_MS) return "fresh";
  if (nowMs - Date.parse(snap.lastAttemptAt) < RETRY_MS) return "backoff";
  return "refresh";
}

export async function getReviews(): Promise<ReviewsView> {
  let store: ReturnType<typeof getStore> | null = null;
  let snap: Snapshot | null = null;
  try {
    store = getStore({ name: STORE, consistency: "strong" });
    snap = ((await store.get(KEY, { type: "json" })) as Snapshot | null) ?? null;
  } catch {
    store = null; // no Blobs context — fall back to a live fetch per render
    snap = null;
  }

  const now = Date.now();
  if (store && snap) {
    const action = decideRefresh(snap, now);
    if (action !== "refresh") return { reviews: snap.reviews.slice(0, MAX_REVIEWS) };
  }

  const nowIso = new Date(now).toISOString();
  // Stamp the attempt first so concurrent renders (and a failing Google) back
  // off instead of all fetching at once.
  const base: Snapshot = snap ?? {
    reviews: [],
    fetchedAt: new Date(0).toISOString(),
    lastAttemptAt: nowIso,
  };
  if (store) await store.setJSON(KEY, { ...base, lastAttemptAt: nowIso }).catch(() => {});

  const result = await fetchFiveStarReviews();
  if (result.status === "unconfigured") return { unconfigured: true };
  if (result.status === "error") {
    // Keep serving whatever the last good snapshot was.
    return {
      reviews: base.reviews.slice(0, MAX_REVIEWS),
      fetched: { ok: false, detail: result.detail },
    };
  }
  const reviews = result.reviews.slice(0, MAX_REVIEWS);
  if (store) {
    await store
      .setJSON(KEY, { reviews, fetchedAt: nowIso, lastAttemptAt: nowIso } satisfies Snapshot)
      .catch(() => {});
  }
  return { reviews, fetched: { ok: true } };
}
