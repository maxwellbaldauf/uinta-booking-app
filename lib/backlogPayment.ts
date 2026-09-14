import { createAdminClient } from "@/lib/supabase/admin";
import { findCustomerByPaymentSetupToken, type ImportedCustomer } from "@/lib/customers";

export type PendingBacklogJob = {
  id: string;
  scheduledDate: string | null;
  priceCents: number;
  propertyLabel: string;
};

export type PendingBacklogLookup = {
  customer: ImportedCustomer;
  jobs: PendingBacklogJob[];
};

// Extends the plain payment_setup_token lookup (used by the plain-import
// /pay/[token] case) to also find any unpaid backlog jobs for that customer
// — app/(app)/backlog/new/actions.ts in uinta-field-app marks these with
// jobs.source:"backlog" at creation, status:"completed" until charged.
// findCustomerByPaymentSetupToken stays the single source of truth for
// token validity; this only adds to what it returns.
export async function findPendingBacklogJobsForToken(
  token: string
): Promise<PendingBacklogLookup | null> {
  const customer = await findCustomerByPaymentSetupToken(token);
  if (!customer) return null;

  const supabase = createAdminClient();

  const { data: properties } = await supabase
    .from("properties")
    .select("id, nickname, address")
    .eq("customer_id", customer.id);

  if (!properties || properties.length === 0) {
    return { customer, jobs: [] };
  }

  const propertyLabelById = new Map(
    properties.map((p) => [p.id, p.nickname || p.address])
  );

  const { data: jobs } = await supabase
    .from("jobs")
    .select("id, scheduled_date, quoted_price_cents, property_id")
    .in(
      "property_id",
      properties.map((p) => p.id)
    )
    .eq("source", "backlog")
    .eq("status", "completed")
    // Excludes a job with no valid price rather than showing it as a
    // misleading $0 line item — Project A's /api/internal/charge-job
    // would reject charging it anyway (422, no valid quoted price). It
    // stays visible on Project A's dashboard for the owner to fix.
    .gt("quoted_price_cents", 0)
    .order("created_at", { ascending: true });

  const pendingJobs: PendingBacklogJob[] = (jobs ?? []).map((j) => ({
    id: j.id,
    scheduledDate: j.scheduled_date,
    priceCents: j.quoted_price_cents ?? 0,
    propertyLabel: propertyLabelById.get(j.property_id) ?? "Property",
  }));

  return { customer, jobs: pendingJobs };
}
