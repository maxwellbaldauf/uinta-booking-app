import { NextResponse } from "next/server";
import {
  createStripeCustomerForBooking,
  ensureStripeCustomerForRow,
  createCardSetupIntent,
} from "@/lib/stripe/payments";
import {
  findCustomerByPaymentSetupToken,
  matchCustomerByEmailOrPhone,
} from "@/lib/customers";

export const runtime = "nodejs";

// Creates (or reuses) a Stripe Customer and returns a card-only SetupIntent
// client secret for Stripe Elements. Two callers:
//
//   booking       the booking flow. Re-matches the customer by email/phone
//                 server-side: reuse their Stripe id, lazily create one for a
//                 matched-but-never-charged customer, or create a fresh one.
//                 The client never holds a customer id.
//   setup_token   the imported-customer payment page (spec §6).
type Body =
  | { context: "booking"; email: string; name?: string; phone?: string }
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

    if (body.context === "booking") {
      if (!isEmail(body.email)) {
        return NextResponse.json(
          { error: "A valid email is required" },
          { status: 400 }
        );
      }
      const matched = await matchCustomerByEmailOrPhone(body.email, body.phone);
      if (matched?.stripe_customer_id) {
        stripeCustomerId = matched.stripe_customer_id;
      } else if (matched) {
        ({ stripeCustomerId } = await ensureStripeCustomerForRow(matched.id));
      } else {
        stripeCustomerId = await createStripeCustomerForBooking({
          email: body.email,
          name: body.name,
          phone: body.phone,
        });
      }
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
