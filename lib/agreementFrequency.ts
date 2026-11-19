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

// includePending: true (the default, for token pages) counts a requested switch the customer is
// being asked to sign. The public /book flow passes false: it must never sign or apply a switch.
export async function loadCustomerAgreement(
  customerId: string,
  opts: { includePending?: boolean } = {}
): Promise<CustomerAgreement> {
  const includePending = opts.includePending ?? true;
  const [{ data, error }, settings] = await Promise.all([
    businessDb()
      .from("properties")
      .select("id, nickname, address, plan_status, service_interval_months, pending_interval_months")
      .eq("customer_id", customerId)
      .neq("plan_status", "cancelled")
      .order("created_at", { ascending: true }),
    getSettings(),
  ]);
  // Never guess the text on a failed read (it would silently re-prompt for, or record, the wrong version).
  if (error) throw new Error(`loadCustomerAgreement: ${error.message}`);
  const lines = ((data ?? []) as PropRow[]).map((p) => ({
    address: p.nickname ? `${p.nickname} (${p.address})` : p.address,
    months: (includePending ? p.pending_interval_months : null) ?? p.service_interval_months ?? settings.service_interval_months,
  }));
  return { frequency: frequencyOf(lines.map((l) => l.months)), lines };
}

// Called wherever a customer's acceptance is recorded: the fields to write on
// the customer row (timestamp + version + the frequency they accepted).
export function acceptanceFields(
  mode: string | null | undefined,
  frequency: AgreementFrequency,
  lines: readonly FrequencyLine[]
): { service_agreement_accepted_at: string; service_agreement_version: string; service_agreement_frequency: AgreementFrequency } {
  return {
    service_agreement_accepted_at: new Date().toISOString(),
    service_agreement_version: agreementVersionFor(mode, frequency, lines),
    service_agreement_frequency: frequency,
  };
}

// The customer accepted: any requested switch now takes effect (the property's
// real interval changes, with a paper-trail row, and the pending request
// clears). Nothing is rescheduled here - the owner is asked about the already
// booked visit in the field app. Never throws; returns how many switched.
// acceptedVersion is what the customer just accepted: if the pending requests changed since they
// were shown (the owner edited them meanwhile), nothing is applied - they never saw those terms.
export async function applyPendingSwitches(
  customerId: string,
  mode: string | null | undefined,
  acceptedVersion: string
): Promise<number> {
  const db = businessDb();
  try {
    const now = await loadCustomerAgreement(customerId);
    if (agreementVersionFor(mode, now.frequency, now.lines) !== acceptedVersion) {
      console.error("applyPendingSwitches: terms changed since shown, not applying", { customerId });
      return 0;
    }
  } catch (err) {
    console.error("applyPendingSwitches: could not re-check the terms", err, { customerId });
    return 0;
  }
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
        // Asks the owner (field app) whether to also move the already-booked visit.
        interval_move_prompt: true,
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
