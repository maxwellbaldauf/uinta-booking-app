import { createAdminClient } from "@/lib/supabase/admin";
import { arrivalBlockLabel } from "@/lib/schedule/blocks";
import { getOfferedSlots } from "@/lib/scheduling";

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

  const supabase = createAdminClient();
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
    canModify: data.status === "scheduled",
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
  return slots
    .filter((s) => !(s.slotDate === visit.scheduledDate && s.arrivalBlock === visit.arrivalBlock))
    .map((s) => ({ slotDate: s.slotDate, arrivalBlock: s.arrivalBlock, blockLabel: s.blockLabel }));
}
