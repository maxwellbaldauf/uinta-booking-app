import { createAdminClient } from "@/lib/supabase/admin";
import { getSettings } from "@/lib/settings";
import { ARRIVAL_BLOCKS, arrivalBlockLabel } from "@/lib/schedule/blocks";
import { todayDenverISODate, nowDenverMinutes, timeToMinutes } from "@/lib/time/denver";

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
  opts?: { excludeJobId?: string }
): Promise<OfferedSlot[]> {
  const supabase = createAdminClient();
  const { data, error } = await supabase.rpc("get_available_slots", {
    target_lat: lat,
    target_lng: lng,
    p_blocks_needed: blocksNeeded,
    ...(opts?.excludeJobId ? { exclude_job_id: opts.excludeJobId } : {}),
  });
  if (error) throw new Error(`get_available_slots failed: ${error.message}`);

  const rows = (data ?? []) as RawSlot[];
  const today = todayDenverISODate();

  if (rows.some((r) => r.slot_date === today)) {
    const settings = await getSettings();
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
// createBooking and rescheduleVisit to re-validate the customer's choice right
// before writing, so a slot someone else grabbed mid-flow is caught.
export async function slotStillAvailable(
  lat: number,
  lng: number,
  slotDate: string,
  arrivalBlock: number,
  blocksNeeded = 1,
  opts?: { excludeJobId?: string }
): Promise<OfferedSlot | null> {
  const fresh = await getOfferedSlots(lat, lng, blocksNeeded, opts);
  return (
    fresh.find((s) => s.slotDate === slotDate && s.arrivalBlock === arrivalBlock) ?? null
  );
}
