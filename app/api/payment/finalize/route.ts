import { NextResponse } from "next/server";
import { businessDb } from "@/lib/tenant/business";
import {
  ensureStripeCustomerForRow,
  resolveConfirmedSetupIntent,
  setStripeDefaultPaymentMethod,
} from "@/lib/stripe/payments";
import { findCustomerByPaymentSetupToken } from "@/lib/customers";
import { agreementIsCurrentFor, agreementVersionFor } from "@/lib/agreement";
import { acceptanceFields, applyPendingSwitches, loadCustomerAgreement } from "@/lib/agreementFrequency";

export const runtime = "nodejs";

// Persists a confirmed SetupIntent's card onto an existing customer. Used by the
// imported-customer payment page (spec §6). The browser tells us a SetupIntent
// id; we re-retrieve it from Stripe and treat THAT as the source of truth
// (status must be "succeeded", customer must match) rather than trusting the
// client. `authorized` must be true — the required authorization checkbox.
//
// The booking flow does NOT use this route: its card is persisted inside
// createBooking, alongside the customer/property/job it creates.
type Body = {
  context: "setup_token";
  token: string;
  setupIntentId: string;
  authorized: boolean;
  agreement?: { accepted?: boolean; version?: string };
};

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
    return NextResponse.json(
      { error: "setupIntentId is required" },
      { status: 400 }
    );
  }
  if (body.context !== "setup_token") {
    return NextResponse.json({ error: "Unknown context" }, { status: 400 });
  }

  try {
    const customer = await findCustomerByPaymentSetupToken(body.token);
    if (!customer) {
      return NextResponse.json(
        { error: "This payment link has expired or is invalid." },
        { status: 404 }
      );
    }

    // Same Service Agreement gate as finalize-backlog: required unless the
    // customer's accepted version is already current; checked before Stripe.
    // The text (and version) follows the customer's frequency, decided on the server.
    const { frequency, lines } = await loadCustomerAgreement(customer.id);
    const requiredVersion = agreementVersionFor("card_on_file", frequency, lines);
    const agreementNeeded = !agreementIsCurrentFor(customer.service_agreement_version, "card_on_file", frequency, lines);
    if (
      agreementNeeded &&
      !(body.agreement?.accepted && body.agreement.version === requiredVersion)
    ) {
      return NextResponse.json(
        { error: "Please review and accept the current Service Agreement to continue.", agreementRequired: true },
        { status: 400 }
      );
    }

    const { stripeCustomerId } = await ensureStripeCustomerForRow(customer.id);
    const { paymentMethodId, displayLabel } = await resolveConfirmedSetupIntent(
      body.setupIntentId,
      stripeCustomerId
    );

    await setStripeDefaultPaymentMethod(stripeCustomerId, paymentMethodId);

    const supabase = businessDb();
    const { error: updateError } = await supabase
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
          ? acceptanceFields("card_on_file", frequency, lines)
          : {}),
      })
      .eq("id", customer.id);

    if (updateError) {
      // The card is saved in Stripe; only our row write failed. Surface it so
      // it can be retried rather than silently leaving the customer without a
      // recorded payment method.
      console.error("finalize: customer update failed", updateError, {
        customerId: customer.id,
      });
      return NextResponse.json(
        { error: "Your card was saved but we couldn't finish. Please contact us." },
        { status: 500 }
      );
    }

    // Accepting the updated agreement makes any requested frequency switch take effect.
    if (agreementNeeded) await applyPendingSwitches(customer.id, "card_on_file", requiredVersion);

    return NextResponse.json({ ok: true, paymentDisplay: displayLabel });
  } catch (err) {
    console.error("finalize route error", err);
    const message =
      err instanceof Error ? err.message : "Could not save your card";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
