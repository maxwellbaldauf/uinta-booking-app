import { businessDb, businessTz } from "@/lib/tenant/business";
import { getSettings } from "@/lib/settings";
import { ARRIVAL_BLOCKS, arrivalBlockLabel } from "@/lib/schedule/blocks";
import {
  todayISODate,
  nowMinutesIn,
  timeToMinutes,
  addDaysToISODate,
  addMonthsToISODate,
  diffISODays,
  monthOf,
  monthStart,
  monthEnd,
} from "@/lib/time/zone";
import { fetchNearbyScheduledJobs } from "@/lib/clustering/nearbyJobs";
import { rerankCandidatesByDrivingTime } from "@/lib/clustering/rerank";

type RawSlot = {
  slot_date: string;
  arrival_block: number;
  closest_miles: number | null;
  is_fallback: boolean;
};

export type OfferedSlot = {
  slotDate: string;
  arrivalBlock: number;
  blockLabel: string;
  isFallback: boolean; // internal only — never shown to the customer
};

// Calls the shared get_available_slots function (Project A's, in the DB) and
// then applies Project B's same-day rule on top — never inside the SQL, since
// Project A calls the same function for windows six months out where same-day
// logic is meaningless.
//
// Same-day rule (settings.same_day_cutoff default 15:00, business-local time):
//   * once "now" is past the cutoff, no same-day blocks at all
//   * otherwise a today block is offered only with >= 1 hour of notice
//     (now + 60 min must still be before the block's start)
// Future-dated slots pass through untouched. This filter only ever removes.
//
// excludeJobId: rescheduling — the job being moved must not count as its own
// nearby match (it would pin the picker to that job's current date) or occupy
// its own block.
//
// blocksNeeded: 2 for a commercial booking (always, never customer-chosen —
// see ServiceTypeStep), 1 for residential. A reschedule must pass the JOB'S
// OWN current blocks_needed here, never recompute from the property's live
// service_type — a type-changed property leaves its existing job's
// reservation alone, so the reschedule picker has to match what the job
// actually holds today, not what a new booking would request now.
export async function getOfferedSlots(
  lat: number,
  lng: number,
  blocksNeeded = 1,
  opts?: {
    excludeJobId?: string;
    skipRerank?: boolean;
    fromDate?: string;
    windowDays?: number;
    // Only the month picker passes this (see getOfferedSlotsForMonth); omitted
    // = the function's own default of 30, i.e. exactly the legacy behavior.
    fallbackLimit?: number;
  }
): Promise<OfferedSlot[]> {
  const supabase = businessDb();
  const settings = await getSettings();
  const tz = await businessTz();
  const today = todayISODate(tz);
  // Defaults preserve the booking-flow/reschedule-picker's original
  // behavior exactly. slotStillAvailable overrides both below — checking a
  // clustering-suggestion's proposed date (which can be months out) against
  // this function's default today+lookahead_days window would never find
  // it, since get_available_slots would never even consider a date outside
  // whatever window it's asked to search.
  const fromDate = opts?.fromDate ?? today;
  const windowDays = opts?.windowDays ?? settings.lookahead_days;

  const { data, error } = await supabase.rpc("get_available_slots", {
    target_lat: lat,
    target_lng: lng,
    from_date: fromDate,
    window_days: windowDays,
    p_blocks_needed: blocksNeeded,
    ...(opts?.excludeJobId ? { exclude_job_id: opts.excludeJobId } : {}),
    ...(opts?.fallbackLimit ? { p_fallback_limit: opts.fallbackLimit } : {}),
  });
  if (error) throw new Error(`get_available_slots failed: ${error.message}`);

  let rows = (data ?? []) as RawSlot[];

  // Real-driving-time reranking — skipped entirely (zero added latency,
  // identical to today's behavior) when paused, when nothing came back
  // route-matched (no nearby neighbor to rank against), or when the caller
  // only needs SET membership rather than order (slotStillAvailable below —
  // reranking is a pure sort, it can never add or remove a candidate, so
  // skipping it can't change that answer, only save the latency/cost of
  // computing an order nobody will look at).
  if (!opts?.skipRerank && !settings.clustering_paused && rows.some((r) => !r.is_fallback)) {
    const toDate = addDaysToISODate(fromDate, windowDays);
    const nearby = await fetchNearbyScheduledJobs({
      fromDate,
      toDate,
      excludeJobId: opts?.excludeJobId,
    });
    rows = (await rerankCandidatesByDrivingTime({ lat, lng }, rows, nearby)) as RawSlot[];
  }

  if (rows.some((r) => r.slot_date === today)) {
    const cutoffMin = timeToMinutes(settings.same_day_cutoff);
    const nowMin = nowMinutesIn(tz);

    return rows
      .filter((r) => keepSlot(r, today, nowMin, cutoffMin))
      .map((r) => toOffered(r, blocksNeeded));
  }

  return rows.map((r) => toOffered(r, blocksNeeded));
}

function keepSlot(r: RawSlot, today: string, nowMin: number, cutoffMin: number): boolean {
  if (r.slot_date !== today) return true;
  if (nowMin >= cutoffMin) return false;
  const block = ARRIVAL_BLOCKS.find((b) => b.index === r.arrival_block);
  if (!block) return false;
  return nowMin + 60 <= timeToMinutes(block.startsAt);
}

function toOffered(r: RawSlot, blocksNeeded: number): OfferedSlot {
  return {
    slotDate: r.slot_date,
    arrivalBlock: r.arrival_block,
    blockLabel: arrivalBlockLabel(r.arrival_block, blocksNeeded),
    isFallback: r.is_fallback,
  };
}

// Is a specific (date, block) still in the freshly-computed offer set? Used by
// createBooking, rescheduleVisit, and acceptClusterSuggestion to re-validate
// the chosen slot right before writing, so a slot someone else grabbed
// mid-flow is caught. Searches a window bracketing exactly slotDate itself
// (not the default today+lookahead_days window) — a clustering suggestion's
// proposed date can be months out, well outside the normal booking horizon,
// and get_available_slots can only ever return dates inside whatever window
// it's asked to search.
export async function slotStillAvailable(
  lat: number,
  lng: number,
  slotDate: string,
  arrivalBlock: number,
  blocksNeeded = 1,
  opts?: { excludeJobId?: string }
): Promise<OfferedSlot | null> {
  const fresh = await getOfferedSlots(lat, lng, blocksNeeded, {
    ...opts,
    skipRerank: true,
    fromDate: slotDate,
    windowDays: 0,
  });
  return (
    fresh.find((s) => s.slotDate === slotDate && s.arrivalBlock === arrivalBlock) ?? null
  );
}

// ---------------------------------------------------------------------------
// Booking horizon (settings.booking_horizon_months) and the month-at-a-time
// picker.
//
// booking_horizon_months NULL (the shipped state) = legacy: customers see the
// settings.lookahead_days window, rendered by the old SlotGrid. 1..6 = the
// month picker, up to that many CALENDAR months from the business's own
// "today". It is read tolerantly (any error -> NULL) so this code is safe to
// deploy before migration 024 reaches the database.

export const MAX_HORIZON_MONTHS = 6; // ceiling regardless of the setting

export type BookingHorizon = {
  months: number | null; // null = legacy window
  today: string; // business-local
  maxDate: string; // last bookable date, inclusive
};

let horizonCache: { at: number; months: number | null } | null = null;

async function readHorizonMonths(): Promise<number | null> {
  if (horizonCache && Date.now() - horizonCache.at < 60_000) return horizonCache.months;
  const { data, error } = await businessDb().from("settings").select("booking_horizon_months").single();
  if (error) {
    // Only "the column isn't there yet" (code deployed before migration 024)
    // means legacy mode. Any other failure is a real error: surface it rather
    // than silently showing a business that HAS a horizon the legacy window.
    const missingColumn =
      error.code === "42703" || error.code === "PGRST204" || /booking_horizon_months/.test(error.message ?? "");
    if (!missingColumn) throw new Error(`booking horizon read failed: ${error.message}`);
    horizonCache = { at: Date.now(), months: null };
    return null;
  }
  const raw = (data as unknown as { booking_horizon_months: number | null } | null)?.booking_horizon_months;
  const months =
    typeof raw === "number" && Number.isInteger(raw) && raw >= 1 ? Math.min(raw, MAX_HORIZON_MONTHS) : null;
  horizonCache = { at: Date.now(), months };
  return months;
}

export async function getBookingHorizon(): Promise<BookingHorizon> {
  const [settings, tz, months] = await Promise.all([getSettings(), businessTz(), readHorizonMonths()]);
  const today = todayISODate(tz);
  return {
    months,
    today,
    maxDate:
      months == null ? addDaysToISODate(today, settings.lookahead_days) : addMonthsToISODate(today, months),
  };
}

// Server-side enforcement for anything that books or moves a visit to a
// customer-chosen date: refuses past dates and anything beyond the horizon.
export async function dateOutsideHorizon(slotDate: string): Promise<boolean> {
  const h = await getBookingHorizon();
  return slotDate < h.today || slotDate > h.maxDate;
}

export type MonthSlots = {
  month: string; // "YYYY-MM"
  slots: OfferedSlot[];
  minMonth: string;
  maxMonth: string;
};

// One calendar month of offers (the month being viewed), clamped to
// [today, maxDate]. NEVER calls the Route Matrix: SlotGrid / the month picker
// order by date, so the driving-time rerank has no customer-visible effect
// here (it only re-sorts rows; is_fallback/booking_match_type are per-row
// flags it never alters). Zero paid lookups, any number of months.
export async function getOfferedSlotsForMonth(
  lat: number,
  lng: number,
  blocksNeeded: number,
  month: string,
  opts?: { excludeJobId?: string }
): Promise<MonthSlots | null> {
  const h = await getBookingHorizon();
  if (h.months == null) return null;
  return monthSlotsFor(h, lat, lng, blocksNeeded, month, opts);
}

// The month query itself, against an ALREADY-resolved horizon (so a caller
// walking several months resolves it once and sees one consistent range).
async function monthSlotsFor(
  h: BookingHorizon,
  lat: number,
  lng: number,
  blocksNeeded: number,
  month: string,
  opts?: { excludeJobId?: string }
): Promise<MonthSlots> {
  const minMonth = monthOf(h.today);
  const maxMonth = monthOf(h.maxDate);
  const result = (slots: OfferedSlot[]): MonthSlots => ({ month, slots, minMonth, maxMonth });
  if (month < minMonth || month > maxMonth) return result([]);

  const from = monthStart(month) > h.today ? monthStart(month) : h.today;
  const to = monthEnd(month) < h.maxDate ? monthEnd(month) : h.maxDate;
  if (from > to) return result([]);

  const slots = await getOfferedSlots(lat, lng, blocksNeeded, {
    ...opts,
    skipRerank: true,
    fromDate: from,
    windowDays: diffISODays(from, to),
    fallbackLimit: 2000,
  });
  return result(slots);
}

// The first month (from this month on) that has any offer — where the picker
// opens. Stops at the first non-empty month; at most MAX_HORIZON_MONTHS + 1
// cheap SQL calls, usually one.
export async function getFirstOpenMonth(
  lat: number,
  lng: number,
  blocksNeeded: number,
  opts?: { excludeJobId?: string; hideSlot?: (s: OfferedSlot) => boolean }
): Promise<MonthSlots | null> {
  const h = await getBookingHorizon();
  if (h.months == null) return null;
  const first = monthOf(h.today);
  const last = monthOf(h.maxDate);
  for (let month = first; month <= last; month = monthOf(addDaysToISODate(monthEnd(month), 1))) {
    const res = await monthSlotsFor(h, lat, lng, blocksNeeded, month, opts);
    const slots = opts?.hideSlot ? res.slots.filter((s) => !opts.hideSlot!(s)) : res.slots;
    if (slots.length > 0) return { ...res, slots };
  }
  // Nothing open anywhere in the horizon: show the current month, empty.
  return { month: first, slots: [], minMonth: first, maxMonth: last };
}
