import { after, NextResponse } from "next/server";
import { fetchFiveStarReviews } from "@/lib/googleReviews";
import { recordReviewsFetch } from "@/lib/googleReviewsHealth";
import { clientIpFromHeaders } from "@/lib/chat/rateLimit";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

// GET /api/reviews -> { reviews: GoogleReview[] } (the 5-star reviews, newest
// first; empty on any failure). Called by LazyGoogleReviews when a visitor
// scrolls near the pricing section.
//
// Every request that reaches Google is a BILLED Place Details call and
// Google's terms don't allow storing the result, so this is the cost choke
// point: no-store, same-site callers only, known crawlers skipped, and
// per-IP plus whole-instance rate limits. A Cloud Console daily quota on the
// key is the real hard ceiling; these just keep a single script from burning
// through it. Same in-memory-per-instance limitation as lib/chat/rateLimit.ts.
//
// Always answers with a JSON body of the same shape so the client can treat
// "no reviews" and "something failed" identically (render nothing).

const NO_STORE = { "Cache-Control": "no-store" };
const empty = (status = 200) =>
  NextResponse.json({ reviews: [] }, { status, headers: NO_STORE });

// Self-identifying crawlers and preview fetchers. Bots that run scripts and
// lie about their user agent still get through — the rate limit covers them.
const BOT_UA =
  /bot|crawl|spider|slurp|facebookexternalhit|embedly|preview|headless|lighthouse|pingdom|uptime|monitor|curl|wget|python-requests/i;

const PER_IP = { limit: 10, windowMs: 60 * 60_000 };
const PER_INSTANCE = { limit: 300, windowMs: 60 * 60_000 };
const MAX_TRACKED_IPS = 5000;

const STORE = Symbol.for("uinta.reviews.rateLimit");
const g = globalThis as typeof globalThis & {
  [STORE]?: { byIp: Map<string, number[]>; all: number[] };
};
const state = (g[STORE] ??= { byIp: new Map(), all: [] });

function allow(ip: string, now: number): boolean {
  const recent = (hits: number[], windowMs: number) =>
    hits.filter((t) => t > now - windowMs);

  state.all = recent(state.all, PER_INSTANCE.windowMs);
  if (state.all.length >= PER_INSTANCE.limit) return false;

  if (state.byIp.size > MAX_TRACKED_IPS) {
    for (const [k, hits] of state.byIp) {
      const kept = recent(hits, PER_IP.windowMs);
      if (kept.length === 0) state.byIp.delete(k);
      else state.byIp.set(k, kept);
    }
    if (state.byIp.size > MAX_TRACKED_IPS * 2) state.byIp.clear();
  }
  const mine = recent(state.byIp.get(ip) ?? [], PER_IP.windowMs);
  if (mine.length >= PER_IP.limit) {
    state.byIp.set(ip, mine);
    return false;
  }
  mine.push(now);
  state.byIp.set(ip, mine);
  state.all.push(now);
  return true;
}

export async function GET(req: Request) {
  const site = req.headers.get("sec-fetch-site");
  if (site && site !== "same-origin" && site !== "same-site") return empty(403);
  if (BOT_UA.test(req.headers.get("user-agent") ?? "")) return empty();
  if (!allow(clientIpFromHeaders(req.headers), Date.now())) return empty(429);

  const result = await fetchFiveStarReviews();
  if (result.status === "unconfigured") return empty();
  after(() =>
    recordReviewsFetch(
      result.status === "ok" ? { ok: true } : { ok: false, detail: result.detail }
    )
  );
  if (result.status !== "ok") return empty();
  return NextResponse.json({ reviews: result.reviews }, { headers: NO_STORE });
}
