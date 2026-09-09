// In-memory per-IP rate limiter for the chat route.
//
// LIMITATION: this lives in the memory of one serverless instance. Netlify may
// run several, so a determined abuser spread across instances isn't fully
// contained. It does stop a single script hammering a warm instance, at zero
// infra cost, and it layers with the hard message/length caps in the route. If
// exact global limits are ever needed, move this to Upstash Redis or Netlify's
// platform rate limiting.

import { RATE_LIMIT_BURST, RATE_LIMIT_SUSTAINED } from "@/lib/chat/config";

type Window = { limit: number; windowMs: number };
type Bucket = { hits: number[] }; // request timestamps (ms), ascending

const MAX_TRACKED_IPS = 5000;

// Survive HMR in dev and warm-instance reuse in prod by hanging the store off
// globalThis rather than a module-scoped const.
const STORE = Symbol.for("uinta.chat.rateLimit");
const g = globalThis as typeof globalThis & { [STORE]?: Map<string, Bucket> };
const store: Map<string, Bucket> = (g[STORE] ??= new Map());

function countWithin(hits: number[], now: number, windowMs: number): number {
  const cutoff = now - windowMs;
  let n = 0;
  for (let i = hits.length - 1; i >= 0; i--) {
    if (hits[i] > cutoff) n++;
    else break; // ascending — everything earlier is older still
  }
  return n;
}

function retryAfterSec(hits: number[], now: number, w: Window): number {
  const cutoff = now - w.windowMs;
  const oldestInWindow = hits.find((t) => t > cutoff) ?? now;
  return Math.max(1, Math.ceil((oldestInWindow + w.windowMs - now) / 1000));
}

function sweep(now: number): void {
  const longest = Math.max(
    RATE_LIMIT_BURST.windowMs,
    RATE_LIMIT_SUSTAINED.windowMs,
  );
  const cutoff = now - longest;
  for (const [ip, bucket] of store) {
    const kept = bucket.hits.filter((t) => t > cutoff);
    if (kept.length === 0) store.delete(ip);
    else bucket.hits = kept;
  }
}

export type RateLimitResult = { ok: true } | { ok: false; retryAfterSec: number };

// Records one request against `ip` and reports whether it is allowed. Call once
// per POST, before doing any real work.
export function checkRateLimit(ip: string): RateLimitResult {
  const now = Date.now();
  const longest = Math.max(
    RATE_LIMIT_BURST.windowMs,
    RATE_LIMIT_SUSTAINED.windowMs,
  );

  if (store.size > MAX_TRACKED_IPS) {
    sweep(now);
    // If a flood of distinct IPs keeps the map oversized even after pruning
    // expired entries, drop it wholesale. Everyone gets a fresh window — an
    // acceptable trade for a hard memory bound on a warm instance.
    if (store.size > MAX_TRACKED_IPS * 2) store.clear();
  }

  const bucket = store.get(ip) ?? { hits: [] };
  bucket.hits = bucket.hits.filter((t) => t > now - longest);

  for (const w of [RATE_LIMIT_BURST, RATE_LIMIT_SUSTAINED]) {
    if (countWithin(bucket.hits, now, w.windowMs) >= w.limit) {
      store.set(ip, bucket);
      return { ok: false, retryAfterSec: retryAfterSec(bucket.hits, now, w) };
    }
  }

  bucket.hits.push(now);
  store.set(ip, bucket);
  return { ok: true };
}

// x-nf-client-connection-ip is Netlify's real client IP; x-forwarded-for is the
// standard fallback (first hop). "unknown" buckets together, which is safe
// enough given both headers are normally present in this deployment.
export function clientIpFromHeaders(headers: Headers): string {
  const nf = headers.get("x-nf-client-connection-ip");
  if (nf) return nf.trim();
  const fwd = headers.get("x-forwarded-for");
  if (fwd) return fwd.split(",")[0]!.trim();
  return "unknown";
}
