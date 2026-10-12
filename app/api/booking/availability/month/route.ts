import { NextResponse } from "next/server";
import { getOfferedSlotsForMonth } from "@/lib/scheduling";
import { verifyBookingContext } from "@/lib/bookingContext";
import { allowMonthRead, clientIpFromHeaders } from "@/lib/chat/rateLimit";
import { isMonthString } from "@/lib/time/zone";

export const runtime = "nodejs";

// POST { ctx, month: "YYYY-MM" } -> one calendar month of open windows.
//
// `ctx` is the signed token the first availability response returned (it holds
// the already-validated coordinates), so flipping months repeats no geocoding,
// service-area check or lead capture. No Route Matrix call is ever made here.
// Months outside [this month, the business's horizon] come back empty — the
// horizon is enforced in getOfferedSlotsForMonth, not by the client.

type Cached = { at: number; body: unknown };
const CACHE_TTL_MS = 30_000;
const CACHE_MAX = 500;
const cache = new Map<string, Cached>();

export async function POST(req: Request) {
  let body: { ctx?: unknown; month?: unknown };
  try {
    body = (await req.json()) as { ctx?: unknown; month?: unknown };
  } catch {
    return NextResponse.json({ error: "Invalid request body" }, { status: 400 });
  }

  const ctx = verifyBookingContext(body.ctx);
  if (!ctx || !isMonthString(body.month)) {
    return NextResponse.json({ error: "Please start your booking again." }, { status: 400 });
  }

  if (!allowMonthRead(clientIpFromHeaders(req.headers))) {
    return NextResponse.json({ error: "Too many requests. Please wait a moment." }, { status: 429 });
  }

  try {
    const key = `${ctx.lat.toFixed(4)},${ctx.lng.toFixed(4)}|${ctx.blocks}|${body.month}`;
    const hit = cache.get(key);
    if (hit && Date.now() - hit.at < CACHE_TTL_MS) return NextResponse.json(hit.body);

    const res = await getOfferedSlotsForMonth(ctx.lat, ctx.lng, ctx.blocks, body.month);
    if (!res) {
      return NextResponse.json({ error: "Month selection isn't available." }, { status: 404 });
    }
    const payload = {
      month: res.month,
      minMonth: res.minMonth,
      maxMonth: res.maxMonth,
      // isFallback is internal and never leaves the server.
      slots: res.slots.map((s) => ({
        slotDate: s.slotDate,
        arrivalBlock: s.arrivalBlock,
        blockLabel: s.blockLabel,
      })),
    };
    if (cache.size >= CACHE_MAX) cache.clear();
    cache.set(key, { at: Date.now(), body: payload });
    return NextResponse.json(payload);
  } catch (err) {
    console.error("availability month route error", err);
    return NextResponse.json(
      { error: "We couldn't check availability just now. Please try again." },
      { status: 500 }
    );
  }
}
