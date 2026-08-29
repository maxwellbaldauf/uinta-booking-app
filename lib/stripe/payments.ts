import type Stripe from "stripe";
import { getStripe } from "./client";
import { createAdminClient } from "@/lib/supabase/admin";

// ---------------------------------------------------------------------------
// Stripe Customer + SetupIntent + payment-method persistence.
//
// This app only ever SAVES a card (SetupIntent), never charges it — Project A's
// webhook + Complete & Charge own the charge path. Cards only: SetupIntents are
// created with payment_method_types: ["card"] and usage: "off_session" so
// Project A can charge them later with off_session: true.
// ---------------------------------------------------------------------------

// A brand-new Stripe Customer for a booking whose Supabase customers row does
// not exist yet. The caller carries the returned id into createBooking, which
// writes it onto the new row.
export async function createStripeCustomerForBooking(input: {
  email: string;
  name?: string | null;
  phone?: string | null;
}): Promise<string> {
  const customer = await getStripe().customers.create({
    email: input.email,
    name: input.name ?? undefined,
    phone: input.phone ?? undefined,
    metadata: { source: "booking" },
  });
  return customer.id;
}

// Resolve (or lazily create) the Stripe Customer for an existing Supabase
// customers row, writing stripe_customer_id back if we had to create it.
export async function ensureStripeCustomerForRow(customerId: string): Promise<{
  stripeCustomerId: string;
  email: string | null;
}> {
  const supabase = createAdminClient();
  const { data: row, error } = await supabase
    .from("customers")
    .select("id, full_name, email, phone, stripe_customer_id")
    .eq("id", customerId)
    .single();
  if (error || !row) throw new Error("Customer not found");

  if (row.stripe_customer_id) {
    return { stripeCustomerId: row.stripe_customer_id, email: row.email };
  }

  const customer = await getStripe().customers.create({
    email: row.email ?? undefined,
    name: row.full_name ?? undefined,
    phone: row.phone ?? undefined,
    metadata: { supabase_customer_id: row.id },
  });

  const { error: updateError } = await supabase
    .from("customers")
    .update({ stripe_customer_id: customer.id })
    .eq("id", row.id);
  if (updateError) {
    throw new Error(`Failed to save stripe_customer_id: ${updateError.message}`);
  }

  return { stripeCustomerId: customer.id, email: row.email };
}

export async function createCardSetupIntent(
  stripeCustomerId: string
): Promise<Stripe.SetupIntent> {
  return getStripe().setupIntents.create({
    customer: stripeCustomerId,
    payment_method_types: ["card"],
    usage: "off_session",
  });
}

export type ResolvedPaymentMethod = {
  paymentMethodId: string;
  // e.g. "Visa •••• 4242"
  displayLabel: string;
};

// Retrieve a confirmed SetupIntent, verify it belongs to the expected customer,
// and pull the saved payment method + a human display string. Throws unless the
// SetupIntent actually succeeded — this is the server-side source of truth, not
// whatever the browser reported.
export async function resolveConfirmedSetupIntent(
  setupIntentId: string,
  expectedStripeCustomerId: string
): Promise<ResolvedPaymentMethod> {
  const si = await getStripe().setupIntents.retrieve(setupIntentId, {
    expand: ["payment_method"],
  });

  const siCustomer =
    typeof si.customer === "string" ? si.customer : si.customer?.id ?? null;
  if (siCustomer !== expectedStripeCustomerId) {
    throw new Error("SetupIntent does not belong to this customer");
  }
  if (si.status !== "succeeded") {
    throw new Error(`Card setup is not complete (status: ${si.status})`);
  }

  const pm = si.payment_method;
  if (!pm || typeof pm === "string") {
    throw new Error("SetupIntent has no attached payment method");
  }

  const card = pm.card;
  const displayLabel = card
    ? `${card.brand.charAt(0).toUpperCase()}${card.brand.slice(1)} •••• ${card.last4}`
    : "Card on file";

  return { paymentMethodId: pm.id, displayLabel };
}

// Make the saved card the customer's Stripe-side default too. Project A charges
// with an explicit payment_method id, so this isn't strictly required, but it
// keeps the Stripe dashboard sane and matches scripts/create-test-customer.js.
export async function setStripeDefaultPaymentMethod(
  stripeCustomerId: string,
  paymentMethodId: string
): Promise<void> {
  await getStripe().customers.update(stripeCustomerId, {
    invoice_settings: { default_payment_method: paymentMethodId },
  });
}
