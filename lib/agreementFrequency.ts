import { businessDb } from "@/lib/tenant/business";
import { getSettings } from "@/lib/settings";
import {
  agreementVersionFor,
  frequencyOf,
  type AgreementFrequency,
  type FrequencyLine,
} from "@/lib/agreement";

// Server-only. Which frequency the customer's agreement states, from their
// properties' visit intervals (the field app owns the setting). A requested
// switch the customer hasn't accepted yet (pending_interval_months) counts
// here: it is exactly what they're being asked to sign. Cancelled properties
// are ignored. The result is plain data, safe to hand to client components.
export type CustomerAgreement = {
  frequency: AgreementFrequency;
  lines: FrequencyLine[]; // every property, for the "mixed" listing
};

type PropRow = {
  id: string;
  nickname: string | null;
  address: string;
  plan_status: string;
  service_interval_months: number | null;
  pending_interval_months: number | null;
};

export async function loadCustomerAgreement(customerId: string): Promise<CustomerAgreement> {
  const [{ data }, settings] = await Promise.all([
    businessDb()
      .from("properties")
      .select("id, nickname, address, plan_status, service_interval_months, pending_interval_months")
      .eq("customer_id", customerId)
      .neq("plan_status", "cancelled")
      .order("created_at", { ascending: true }),
    getSettings(),
  ]);
  const lines = ((data ?? []) as PropRow[]).map((p) => ({
    address: p.nickname ? `${p.nickname} (${p.address})` : p.address,
    months: p.pending_interval_months ?? p.service_interval_months ?? settings.service_interval_months,
  }));
  return { frequency: frequencyOf(lines.map((l) => l.months)), lines };
}

// Called wherever a customer's acceptance is recorded: the fields to write on
// the customer row (timestamp + version + the frequency they accepted).
export function acceptanceFields(
  mode: string | null | undefined,
  frequency: AgreementFrequency
): { service_agreement_accepted_at: string; service_agreement_version: string; service_agreement_frequency: AgreementFrequency } {
  return {
    service_agreement_accepted_at: new Date().toISOString(),
    service_agreement_version: agreementVersionFor(mode, frequency),
    service_agreement_frequency: frequency,
  };
}

// The customer accepted: any requested switch now takes effect (the property's
// real interval changes, with a paper-trail row, and the pending request
// clears). Nothing is rescheduled here - the owner is asked about the already
// booked visit in the field app. Never throws; returns how many switched.
export async function applyPendingSwitches(customerId: string): Promise<number> {
  const db = businessDb();
  const { data, error } = await db
    .from("properties")
    .select("id, service_interval_months, pending_interval_months")
    .eq("customer_id", customerId)
    .not("pending_interval_months", "is", null);
  if (error) {
    console.error("applyPendingSwitches: lookup failed", error, { customerId });
    return 0;
  }
  let applied = 0;
  for (const p of (data ?? []) as { id: string; service_interval_months: number | null; pending_interval_months: number }[]) {
    const { data: updated, error: upErr } = await db
      .from("properties")
      .update({
        service_interval_months: p.pending_interval_months,
        pending_interval_months: null,
        pending_interval_requested_at: null,
        // Surfaces the "move the already-booked visit?" question in the field app.
        needs_attention: true,
      })
      .eq("id", p.id)
      .eq("pending_interval_months", p.pending_interval_months)
      .select("id");
    if (upErr || !updated?.length) {
      console.error("applyPendingSwitches: update failed", upErr, { propertyId: p.id });
      continue;
    }
    const { error: logErr } = await db.from("property_interval_changes").insert({
      property_id: p.id,
      old_interval_months: p.service_interval_months,
      new_interval_months: p.pending_interval_months,
    });
    if (logErr) console.error("applyPendingSwitches: paper-trail insert failed", logErr, { propertyId: p.id });
    applied++;
  }
  return applied;
}
