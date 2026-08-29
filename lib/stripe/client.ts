import Stripe from "stripe";

let stripeClient: Stripe | null = null;

// Server-only. No apiVersion pinned deliberately — let the SDK use its own
// default rather than hardcoding a version that could drift from what's
// actually enabled on the account. Copied from Project A's lib/stripe/client.ts.
export function getStripe(): Stripe {
  if (!stripeClient) {
    stripeClient = new Stripe(process.env.STRIPE_SECRET_KEY!);
  }
  return stripeClient;
}
