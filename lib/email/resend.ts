import { Resend } from "resend";

// Server-only. Returns null (rather than throwing) when email isn't configured
// so callers can log-and-continue — an email failure must never break a booking.
export function getResend(): { client: Resend; from: string } | null {
  const apiKey = process.env.RESEND_API_KEY;
  const fromEmail = process.env.RESEND_FROM_EMAIL;
  if (!apiKey || !fromEmail) return null;
  return {
    client: new Resend(apiKey),
    from: `Uinta Ice Co <${fromEmail}>`,
  };
}
