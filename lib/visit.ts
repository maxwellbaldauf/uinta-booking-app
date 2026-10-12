import { businessDb, businessTz } from "@/lib/tenant/business";
import { todayISODate } from "@/lib/time/zone";
import { arrivalBlockLabel } from "@/lib/schedule/blocks";
import { getOfferedSlots, getFirstOpenMonth, getOfferedSlotsForMonth } from "@/lib/scheduling";

export type Visit = {
  jobId: string;
  status: string;
  scheduledDate: string;
  arrivalBlock: number;
  blocksNeeded: number;
  arrivalWindowLabel: string;
  address: string;
  customerName: string | null;
  customerEmail: string | null;
  propertyId: string;
  latitude: number | null;
  longitude: number | null;
  planStatus: string;
  expiresAt: string | null;
  // Reschedule / cancel are only offered while the visit is still upcoming.
  canModify: boolean;
};

type JobRow = {
  id: string;
  status: string;
  scheduled_date: string;
  arrival_block: number;
  blocks_needed: number;
  access_token_expires_at: string | null;
  property:
    | {
        id: string;
        address: string;
        plan_status: string;
        latitude: number | null;
        longitude: number | null;
        customer: { full_name: string | null; email: string | null } | { full_name: string | null; email: string | null }[] | null;
      }
    | {
        id: string;
        address: string;
        plan_status: string;
        latitude: number | null;
        longitude: number | null;
        customer: { full_name: string | null; email: string | null } | { full_name: string | null; email: string | null }[] | null;
      }[]
    | null;
};

function flatten<T>(v: T | T[] | null | undefined): T | null {
  return Array.isArray(v) ? v[0] ?? null : v ?? null;
}

// Look up a visit by its magic-link token (spec §3). A NULL expiry is treated
// as valid, not expired — a customer must never be locked out of their own
// appointment by a bug on our side (Project A's recurring scheduler always
// sets one now, but this stays tolerant of an older/legacy row that doesn't).
export async function getVisitByToken(token: string): Promise<Visit | null> {
  if (!token || token.length < 16) return null;

  const supabase = businessDb();
  const res = await supabase
    .from("jobs")
    .select(
      "id, status, scheduled_date, arrival_block, blocks_needed, access_token_expires_at, " +
        "property:properties(id, address, plan_status, latitude, longitude, customer:customers(full_name, email))"
    )
    .eq("access_token", token)
    .maybeSingle();

  if (res.error || !res.data) return null;
  const data = res.data as unknown as JobRow;

  const expiresAt = data.access_token_expires_at;
  if (expiresAt && new Date(expiresAt).getTime() < Date.now()) return null;

  const property = flatten(data.property);
  const customer = flatten(property?.customer);

  return {
    jobId: data.id,
    status: data.status,
    scheduledDate: data.scheduled_date,
    arrivalBlock: data.arrival_block,
    blocksNeeded: data.blocks_needed,
    arrivalWindowLabel: arrivalBlockLabel(data.arrival_block, data.blocks_needed),
    address: property?.address ?? "",
    customerName: customer?.full_name ?? null,
    customerEmail: customer?.email ?? null,
    propertyId: property?.id ?? "",
    latitude: property?.latitude ?? null,
    longitude: property?.longitude ?? null,
    planStatus: property?.plan_status ?? "active",
    expiresAt,
    // A past-dated visit that was never closed out must not be cancellable or
    // movable through the (now 14-day) link: that would void a delivered service.
    canModify: data.status === "scheduled" && data.scheduled_date >= todayISODate(await businessTz()),
  };
}

// Open windows for rescheduling this visit — route-matched only, same as
// booking (spec §3). Empty if the property has no coordinates. Passes the
// job's own id so get_available_slots doesn't treat it as its own route match
// (which pinned the picker to the visit's current date).
//
// Uses the JOB'S OWN blocksNeeded, never the property's current service_type
// — a property that changed tier after this job was scheduled must leave the
// job's existing reservation alone (the field app warns the owner instead of
// auto-resizing it), so a reschedule has to preserve the same block count the
// job already holds, not recompute it from whatever the property is today.
export async function getRescheduleSlots(visit: Visit) {
  if (visit.latitude == null || visit.longitude == null) return [];
  const slots = await getOfferedSlots(visit.latitude, visit.longitude, visit.blocksNeeded, {
    excludeJobId: visit.jobId,
  });
  // Don't offer the exact window it's already in.
  return toView(slots.filter((s) => !isCurrentWindow(visit)(s)));
}

// ---- month-at-a-time reschedule (booking horizon set) ----------------------

export type RescheduleMonthView = {
  month: string;
  minMonth: string;
  maxMonth: string;
  slots: { slotDate: string; arrivalBlock: number; blockLabel: string }[];
};

// Same exclusions as getRescheduleSlots: the visit's own id never counts as a
// route match, its blocks_needed is the JOB'S, and its current window is hidden.
function isCurrentWindow(visit: Visit) {
  return (s: { slotDate: string; arrivalBlock: number }) =>
    s.slotDate === visit.scheduledDate && s.arrivalBlock === visit.arrivalBlock;
}

function toView(slots: { slotDate: string; arrivalBlock: number; blockLabel: string }[]) {
  return slots.map((s) => ({ slotDate: s.slotDate, arrivalBlock: s.arrivalBlock, blockLabel: s.blockLabel }));
}

// null = this business has no booking horizon set (use the legacy list).
export async function getRescheduleFirstMonth(visit: Visit): Promise<RescheduleMonthView | null> {
  if (visit.latitude == null || visit.longitude == null) return null;
  const res = await getFirstOpenMonth(visit.latitude, visit.longitude, visit.blocksNeeded, {
    excludeJobId: visit.jobId,
    hideSlot: isCurrentWindow(visit),
  });
  return res && { ...res, slots: toView(res.slots) };
}

export async function getRescheduleMonth(visit: Visit, month: string): Promise<RescheduleMonthView | null> {
  if (visit.latitude == null || visit.longitude == null) return null;
  const res = await getOfferedSlotsForMonth(visit.latitude, visit.longitude, visit.blocksNeeded, month, {
    excludeJobId: visit.jobId,
  });
  return res && { ...res, slots: toView(res.slots.filter((s) => !isCurrentWindow(visit)(s))) };
}
