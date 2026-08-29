import { NextResponse } from "next/server";
import {
  createStripeCustomerForBooking,
  ensureStripeCustomerForRow,
  createCardSetupIntent,
} from "@/lib/stripe/payments";
import { findCustomerByPaymentSetupToken } from "@/lib/customers";

export const runtime = "nodejs";

// Creates (or reuses) a Stripe Customer and returns a card-only SetupIntent
// client secret for Stripe Elements. Three callers:
//
//   new_customer      booking flow, no customers row yet — the returned
//                     stripeCustomerId is carried into createBooking
//   existing_customer a matched customer / per-property override during booking
//   setup_token       the imported-customer payment page (spec §6)
//
// Each branch does its own authorization: new_customer needs only a valid
// email; the others resolve a real customer row (setup_token also checks
// expiry) before touching Stripe.
type Body =
  | { context: "new_customer"; email: string; name?: string; phone?: string }
  | { context: "existing_customer"; customerId: string }
  | { context: "setup_token"; token: string };

function isEmail(v: unknown): v is string {
  return typeof v === "string" && /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(v);
}

export async function POST(req: Request) {
  let body: Body;
  try {
    body = (await req.json()) as Body;
  } catch {
    return NextResponse.json({ error: "Invalid request body" }, { status: 400 });
  }

  try {
    let stripeCustomerId: string;

    if (body.context === "new_customer") {
      if (!isEmail(body.email)) {
        return NextResponse.json(
          { error: "A valid email is required" },
          { status: 400 }
        );
      }
      stripeCustomerId = await createStripeCustomerForBooking({
        email: body.email,
        name: body.name,
        phone: body.phone,
      });
    } else if (body.context === "existing_customer") {
      if (typeof body.customerId !== "string" || !body.customerId) {
        return NextResponse.json(
          { error: "customerId is required" },
          { status: 400 }
        );
      }
      ({ stripeCustomerId } = await ensureStripeCustomerForRow(body.customerId));
    } else if (body.context === "setup_token") {
      const customer = await findCustomerByPaymentSetupToken(body.token);
      if (!customer) {
        return NextResponse.json(
          { error: "This payment link has expired or is invalid." },
          { status: 404 }
        );
      }
      ({ stripeCustomerId } = await ensureStripeCustomerForRow(customer.id));
    } else {
      return NextResponse.json({ error: "Unknown context" }, { status: 400 });
    }

    const setupIntent = await createCardSetupIntent(stripeCustomerId);
    if (!setupIntent.client_secret) {
      return NextResponse.json(
        { error: "Stripe did not return a client secret" },
        { status: 502 }
      );
    }

    return NextResponse.json({
      clientSecret: setupIntent.client_secret,
      stripeCustomerId,
    });
  } catch (err) {
    console.error("setup-intent route error", err);
    const message =
      err instanceof Error ? err.message : "Could not start card setup";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
