import { createAdminClient } from "@/lib/supabase/admin";
import { getSettings } from "@/lib/settings";
import { ARRIVAL_BLOCKS, arrivalBlockLabel } from "@/lib/schedule/blocks";
import { todayDenverISODate, nowDenverMinutes, timeToMinutes, addDaysToISODate } from "@/lib/time/denver";
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
// Same-day rule (settings.same_day_cutoff default 15:00, America/Denver):
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
  opts?: { excludeJobId?: string; skipRerank?: boolean; fromDate?: string; windowDays?: number }
): Promise<OfferedSlot[]> {
  const supabase = createAdminClient();
  const settings = await getSettings();
  const today = todayDenverISODate();
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
    const nowMin = nowDenverMinutes();

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
