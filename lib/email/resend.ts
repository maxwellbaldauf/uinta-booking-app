import { Resend } from "resend";
import { getBusiness } from "../tenant/business";

// Server-only. Returns null (rather than throwing) when email isn't configured
// so callers can log-and-continue — an email failure must never break a booking.
//
// The From is this deployment's business: its display name, and its own
// verified sending address (businesses.from_email, else RESEND_FROM_EMAIL —
// each business's booking deployment has its own env).
export async function getResend(): Promise<{ client: Resend; from: string } | null> {
  const apiKey = process.env.RESEND_API_KEY;
  const business = await getBusiness();
  const fromEmail = business.from_email ?? process.env.RESEND_FROM_EMAIL;
  if (!apiKey || !fromEmail) return null;
  return {
    client: new Resend(apiKey),
    from: `${business.from_name} <${fromEmail}>`,
  };
}
