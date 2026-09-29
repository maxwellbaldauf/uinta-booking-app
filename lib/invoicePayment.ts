import { businessDb } from "@/lib/tenant/business";
import { agreementIsCurrent, SERVICE_AGREEMENT_VERSION } from "@/lib/agreement";

export type InvoiceJob = {
  id: string;
  scheduledDate: string;
  arrivalBlock: number | null;
  blocksNeeded: number;
  amountCents: number;
  propertyLabel: string;
  customerId: string;
  customerName: string | null;
  stripeCustomerId: string | null;
  paymentDisplay: string | null;
  hasDefaultPaymentMethod: boolean;
  // The version of the Service Agreement this customer last accepted (null =
  // never). Manually-entered customers first reach a payment page here, after
  // their first visit, so this page is where they accept it.
  serviceAgreementVersion: string | null;
};

type JobRow = {
  id: string;
  status: string;
  scheduled_date: string;
  arrival_block: number | null;
  blocks_needed: number;
  final_price_cents: number | null;
  property:
    | PropertyRow
    | PropertyRow[]
    | null;
};
type PropertyRow = {
  nickname: string | null;
  address: string;
  customer:
    | CustomerRow
    | CustomerRow[]
    | null;
};
type CustomerRow = {
  id: string;
  full_name: string | null;
  stripe_customer_id: string | null;
  default_payment_method_id: string | null;
  payment_display: string | null;
  service_agreement_version: string | null;
};

function flatten<T>(v: T | T[] | null | undefined): T | null {
  return Array.isArray(v) ? v[0] ?? null : v ?? null;
}

// Look up a job by its invoice_token (the customer-approved-invoicing flow's
// own token — deliberately separate from jobs.access_token, which is the
// upcoming-visit reschedule/cancel token and expires the day after the
// visit; an invoice must stay payable well past that). Mirrors
// findCustomerByPaymentSetupToken / getVisitByToken's shape: returns null for
// an unknown token OR a job that isn't actually awaiting payment anymore (already
// charged, or never invoiced) — the caller shows a friendly "not valid" page,
// never a raw error, same as every other token-authorized page in this app.
export async function findJobByInvoiceToken(token: string): Promise<InvoiceJob | null> {
  if (!token || token.length < 16) return null;

  const supabase = businessDb();
  const { data, error } = await supabase
    .from("jobs")
    .select(
      "id, status, scheduled_date, arrival_block, blocks_needed, final_price_cents, property:properties(nickname, address, customer:customers(id, full_name, stripe_customer_id, default_payment_method_id, payment_display, service_agreement_version))"
    )
    .eq("invoice_token", token)
    .maybeSingle();

  if (error || !data) return null;
  const job = data as unknown as JobRow;

  // Only a job still sitting in "completed" is actually payable — "charged"
  // means this token has already done its job (customer already paid, or the
  // owner charged it manually), and every other status means it was never a
  // valid target for this flow in the first place.
  if (job.status !== "completed") return null;

  const property = flatten(job.property);
  const customer = flatten(property?.customer);
  if (!property || !customer) return null;

  const amountCents = job.final_price_cents ?? 0;
  if (amountCents <= 0) return null;

  return {
    id: job.id,
    scheduledDate: job.scheduled_date,
    arrivalBlock: job.arrival_block,
    blocksNeeded: job.blocks_needed,
    amountCents,
    propertyLabel: property.nickname || property.address,
    customerId: customer.id,
    customerName: customer.full_name,
    stripeCustomerId: customer.stripe_customer_id,
    paymentDisplay: customer.payment_display,
    hasDefaultPaymentMethod: customer.default_payment_method_id != null,
    serviceAgreementVersion: customer.service_agreement_version,
  };
}

// Server-side agreement gate for the invoice routes — same rule as
// finalize-backlog and createBookingRecord: required unless the customer's
// accepted version is already current, and never satisfied by the client's
// bare flag alone (the version it accepted must be the current one).
// Returns the customer-row fields to write when acceptance is being recorded
// now, {} when nothing needs recording, or null when acceptance is missing.
export function agreementFieldsToRecord(
  job: InvoiceJob,
  agreement: { accepted?: boolean; version?: string } | undefined
): Record<string, string> | null {
  if (agreementIsCurrent(job.serviceAgreementVersion)) return {};
  if (!(agreement?.accepted && agreement.version === SERVICE_AGREEMENT_VERSION)) return null;
  return {
    service_agreement_accepted_at: new Date().toISOString(),
    service_agreement_version: SERVICE_AGREEMENT_VERSION,
  };
}

export type ChargeInvoiceResult = { ok: true } | { ok: false; error: string };

// The one place any of this app's payment flows calls uinta-field-app's
// internal charge-job endpoint — /api/payment/approve-invoice (charge the
// card already on file), /api/payment/finalize-invoice-card (charge right
// after saving an updated card), and /api/payment/finalize-backlog's own
// chargeBacklogJob (thin wrapper kept for its existing ChargeResult[]
// response shape) all go through this rather than each keeping its own copy
// of the fetch/env-var/error-handling. createChargeForJob's own idempotency
// (Stripe idempotency key = jobId) means it's harmless if the owner's manual
// "Charge card on file" fallback and a customer's approval click land at
// nearly the same time — both resolve to the same PaymentIntent.
export async function chargeInvoiceJob(jobId: string): Promise<ChargeInvoiceResult> {
  const baseUrl = (process.env.FIELD_APP_BASE_URL ?? "").trim().replace(/\/+$/, "");
  const secret = process.env.CHARGE_JOB_API_SECRET;
  if (!baseUrl || !secret) {
    console.error("chargeInvoiceJob: FIELD_APP_BASE_URL or CHARGE_JOB_API_SECRET not configured");
    return { ok: false, error: "Charging isn't configured yet" };
  }

  try {
    const res = await fetch(`${baseUrl}/api/internal/charge-job`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${secret}`,
      },
      body: JSON.stringify({ jobId }),
    });
    const data = await res.json().catch(() => ({}));
    if (!res.ok || !data.ok) {
      return { ok: false, error: data?.error ?? "Charge failed" };
    }
    return { ok: true };
  } catch (err) {
    console.error("chargeInvoiceJob: charge-job request failed", jobId, err);
    return { ok: false, error: "Could not reach the charging service" };
  }
}
