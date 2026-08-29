import { createAdminClient } from "@/lib/supabase/admin";
import { arrivalBlockLabel } from "@/lib/schedule/blocks";

export type Visit = {
  jobId: string;
  status: string;
  scheduledDate: string;
  arrivalBlock: number;
  arrivalWindowLabel: string;
  address: string;
  customerName: string | null;
  propertyId: string;
  planStatus: string;
  expiresAt: string | null;
};

// Look up a visit by its magic-link token (spec §3). A NULL expiry is treated
// as valid, not expired — Project A's recurring scheduler currently ships jobs
// without one, and a customer must never be locked out of their own
// appointment by a bug on our side.
export async function getVisitByToken(token: string): Promise<Visit | null> {
  if (!token || token.length < 16) return null;

  const supabase = createAdminClient();
  const res = await supabase
    .from("jobs")
    .select(
      "id, status, scheduled_date, arrival_block, access_token_expires_at, " +
        "property:properties(id, address, plan_status, customer:customers(full_name))"
    )
    .eq("access_token", token)
    .maybeSingle();

  if (res.error || !res.data) return null;
  const data = res.data as unknown as {
    id: string;
    status: string;
    scheduled_date: string;
    arrival_block: number;
    access_token_expires_at: string | null;
    property:
      | { id: string; address: string; plan_status: string; customer: { full_name: string | null } | { full_name: string | null }[] | null }
      | { id: string; address: string; plan_status: string; customer: { full_name: string | null } | { full_name: string | null }[] | null }[]
      | null;
  };

  const expiresAt = data.access_token_expires_at;
  if (expiresAt && new Date(expiresAt).getTime() < Date.now()) return null;

  const property = Array.isArray(data.property) ? data.property[0] : data.property;
  const customer = property
    ? Array.isArray(property.customer)
      ? property.customer[0]
      : property.customer
    : null;

  return {
    jobId: data.id,
    status: data.status,
    scheduledDate: data.scheduled_date,
    arrivalBlock: data.arrival_block,
    arrivalWindowLabel: arrivalBlockLabel(data.arrival_block),
    address: property?.address ?? "",
    customerName: customer?.full_name ?? null,
    propertyId: property?.id ?? "",
    planStatus: property?.plan_status ?? "active",
    expiresAt,
  };
}
