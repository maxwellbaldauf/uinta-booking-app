import { NextResponse } from "next/server";
import { createAdminClient } from "@/lib/supabase/admin";
import {
  ensureStripeCustomerForRow,
  resolveConfirmedSetupIntent,
  setStripeDefaultPaymentMethod,
} from "@/lib/stripe/payments";
import { findPendingBacklogJobsForToken } from "@/lib/backlogPayment";
import { agreementIsCurrent, SERVICE_AGREEMENT_VERSION } from "@/lib/agreement";
import { chargeInvoiceJob } from "@/lib/invoicePayment";

export const runtime = "nodejs";

// Persists a confirmed SetupIntent's card onto a backlog customer, then
// charges every unpaid backlog job for them. Kept separate from
// /api/payment/finalize on purpose — that route's own comment states "the
// booking flow does NOT use this route," establishing single-purpose-per-
// route as this app's convention; bolting the agreement gate and multi-charge
// side effects onto it would blur that boundary.
type Body = {
  token: string;
  setupIntentId: string;
  authorized: boolean;
  agreement?: { accepted: boolean; version: string };
};

type ChargeResult = { jobId: string; ok: boolean; error?: string };

async function chargeBacklogJob(jobId: string): Promise<ChargeResult> {
  const result = await chargeInvoiceJob(jobId);
  return result.ok ? { jobId, ok: true } : { jobId, ok: false, error: result.error };
}

export async function POST(req: Request) {
  let body: Body;
  try {
    body = (await req.json()) as Body;
  } catch {
    return NextResponse.json({ error: "Invalid request body" }, { status: 400 });
  }

  if (body.authorized !== true) {
    return NextResponse.json(
      { error: "Card-on-file authorization is required." },
      { status: 400 }
    );
  }
  if (typeof body.setupIntentId !== "string" || !body.setupIntentId) {
    return NextResponse.json({ error: "setupIntentId is required" }, { status: 400 });
  }

  try {
    const pending = await findPendingBacklogJobsForToken(body.token);
    if (!pending || pending.jobs.length === 0) {
      return NextResponse.json(
        { error: "This payment link has expired, is invalid, or is already settled." },
        { status: 404 }
      );
    }
    const { customer } = pending;

    // Same rule createBookingRecord uses: required unless already current —
    // never trusts the client's bare agreement.accepted flag alone.
    const agreementNeeded = !agreementIsCurrent(customer.service_agreement_version);
    if (
      agreementNeeded &&
      !(body.agreement?.accepted && body.agreement.version === SERVICE_AGREEMENT_VERSION)
    ) {
      return NextResponse.json(
        {
          error: "Please review and accept the current Service Agreement to continue.",
          agreementRequired: true,
        },
        { status: 400 }
      );
    }

    const { stripeCustomerId } = await ensureStripeCustomerForRow(customer.id);
    const { paymentMethodId, displayLabel } = await resolveConfirmedSetupIntent(
      body.setupIntentId,
      stripeCustomerId
    );

    await setStripeDefaultPaymentMethod(stripeCustomerId, paymentMethodId);

    const supabase = createAdminClient();
    // Guarded on payment_setup_token still matching, and .select() so we can
    // tell whether a row actually changed — a double-tap or two open tabs
    // can both pass findPendingBacklogJobsForToken before either update
    // commits; whichever request's UPDATE loses the race matches zero rows
    // here (the token was already consumed by the other one) and must not
    // go on to charge the same jobs a second time.
    const { data: updatedRows, error: updateError } = await supabase
      .from("customers")
      .update({
        default_payment_method_id: paymentMethodId,
        default_payment_method_type: "card",
        payment_display: displayLabel,
        payment_authorized_at: new Date().toISOString(),
        // Single-use link: consume the token once a card is on file.
        payment_setup_token: null,
        payment_setup_token_expires_at: null,
        ...(agreementNeeded
          ? {
              service_agreement_accepted_at: new Date().toISOString(),
              service_agreement_version: SERVICE_AGREEMENT_VERSION,
            }
          : {}),
      })
      .eq("id", customer.id)
      .eq("payment_setup_token", body.token)
      .select("id");

    if (updateError) {
      console.error("finalize-backlog: customer update failed", updateError, {
        customerId: customer.id,
      });
      return NextResponse.json(
        { error: "Your card was saved but we couldn't finish. Please contact us." },
        { status: 500 }
      );
    }

    if (!updatedRows || updatedRows.length === 0) {
      // Lost the race — a concurrent request already consumed this token
      // and is handling (or has handled) the charge. The card is saved
      // either way; don't charge the same jobs again here.
      return NextResponse.json({ ok: true, paymentDisplay: displayLabel, results: [] });
    }

    // Card is already durably saved above — a charge failure here doesn't
    // block the response. It surfaces on Project A's dashboard (Failed
    // charges) rather than needing its own owner-facing surface here.
    const results = await Promise.all(pending.jobs.map((job) => chargeBacklogJob(job.id)));

    return NextResponse.json({ ok: true, paymentDisplay: displayLabel, results });
  } catch (err) {
    console.error("finalize-backlog route error", err);
    const message = err instanceof Error ? err.message : "Could not save your card";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
