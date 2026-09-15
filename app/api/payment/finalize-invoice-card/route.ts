import { NextResponse } from "next/server";
import { createAdminClient } from "@/lib/supabase/admin";
import {
  ensureStripeCustomerForRow,
  resolveConfirmedSetupIntent,
  setStripeDefaultPaymentMethod,
} from "@/lib/stripe/payments";
import { findJobByInvoiceToken, chargeInvoiceJob } from "@/lib/invoicePayment";

export const runtime = "nodejs";

// The customer-approved-invoicing flow's "update card and retry" action —
// used only after /api/payment/approve-invoice's card-on-file charge came
// back declined/expired. Saves the newly-confirmed card as the customer's
// new default, then charges this one job. Kept separate from
// approve-invoice on purpose (this app's single-purpose-per-route
// convention) since this path needs Stripe Elements / a SetupIntent and the
// happy path doesn't.
type Body = { token: string; setupIntentId: string };

export async function POST(req: Request) {
  let body: Body;
  try {
    body = (await req.json()) as Body;
  } catch {
    return NextResponse.json({ error: "Invalid request body" }, { status: 400 });
  }
  if (typeof body.token !== "string" || !body.token) {
    return NextResponse.json({ error: "token is required" }, { status: 400 });
  }
  if (typeof body.setupIntentId !== "string" || !body.setupIntentId) {
    return NextResponse.json({ error: "setupIntentId is required" }, { status: 400 });
  }

  const job = await findJobByInvoiceToken(body.token);
  if (!job) {
    return NextResponse.json(
      { error: "This invoice link has expired, is invalid, or is already settled." },
      { status: 404 }
    );
  }

  try {
    const { stripeCustomerId } = await ensureStripeCustomerForRow(job.customerId);
    const { paymentMethodId, displayLabel } = await resolveConfirmedSetupIntent(
      body.setupIntentId,
      stripeCustomerId
    );

    await setStripeDefaultPaymentMethod(stripeCustomerId, paymentMethodId);

    const supabase = createAdminClient();
    const { error: updateError } = await supabase
      .from("customers")
      .update({
        default_payment_method_id: paymentMethodId,
        default_payment_method_type: "card",
        payment_display: displayLabel,
        payment_authorized_at: new Date().toISOString(),
      })
      .eq("id", job.customerId);

    if (updateError) {
      console.error("finalize-invoice-card: customer update failed", updateError, {
        customerId: job.customerId,
      });
      return NextResponse.json(
        { error: "Your card was saved but we couldn't finish. Please contact us." },
        { status: 500 }
      );
    }

    const result = await chargeInvoiceJob(job.id);
    if (!result.ok) {
      return NextResponse.json({ error: result.error, paymentDisplay: displayLabel }, { status: 402 });
    }

    return NextResponse.json({ ok: true, paymentDisplay: displayLabel });
  } catch (err) {
    console.error("finalize-invoice-card route error", err, { jobId: job.id });
    const message = err instanceof Error ? err.message : "Could not save your card";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
