// Signed, short-lived context for the month-at-a-time picker.
//
// The first availability POST geocodes the address, checks the service area,
// captures the lead, etc. (paid + side effects). Flipping to another month must
// repeat none of that, so that response carries a signed token holding only the
// already-validated coordinates; /api/booking/availability/month accepts it
// plus a month. The client can read its own coordinates but cannot change them
// (HMAC), cannot use the token for another business, and it expires.
//
// Key: derived from SUPABASE_SERVICE_ROLE_KEY with a fixed label, so no new
// env var is needed. The label keeps this key distinct from the raw secret.
import { createHmac, timingSafeEqual } from "node:crypto";
import { currentBusinessId } from "@/lib/tenant/business";

export type BookingContext = { lat: number; lng: number; blocks: number };

const TTL_MS = 2 * 60 * 60 * 1000;

function key(): Buffer {
  const secret = process.env.SUPABASE_SERVICE_ROLE_KEY;
  if (!secret) throw new Error("SUPABASE_SERVICE_ROLE_KEY is not set");
  return createHmac("sha256", secret).update("booking-ctx-v1").digest();
}

function mac(body: string): string {
  return createHmac("sha256", key()).update(body).digest("base64url");
}

export function signBookingContext(ctx: BookingContext, now = Date.now()): string {
  const body = Buffer.from(
    JSON.stringify({ ...ctx, biz: currentBusinessId(), exp: now + TTL_MS })
  ).toString("base64url");
  return `${body}.${mac(body)}`;
}

export function verifyBookingContext(token: unknown, now = Date.now()): BookingContext | null {
  if (typeof token !== "string" || token.length > 512) return null;
  const [body, sig, extra] = token.split(".");
  if (!body || !sig || extra !== undefined) return null;
  const expected = Buffer.from(mac(body));
  const given = Buffer.from(sig);
  if (expected.length !== given.length || !timingSafeEqual(expected, given)) return null;
  try {
    const p = JSON.parse(Buffer.from(body, "base64url").toString("utf8")) as {
      lat?: unknown; lng?: unknown; blocks?: unknown; biz?: unknown; exp?: unknown;
    };
    if (p.biz !== currentBusinessId()) return null;
    if (typeof p.exp !== "number" || p.exp < now) return null;
    if (typeof p.lat !== "number" || typeof p.lng !== "number" || typeof p.blocks !== "number") return null;
    return { lat: p.lat, lng: p.lng, blocks: p.blocks };
  } catch {
    return null;
  }
}
