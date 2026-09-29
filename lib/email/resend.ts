import { Resend } from "resend";
import { getBusiness } from "../tenant/business";

// RFC 5322 display name, always quoted: a business name with a comma or
// period ("Camelback Ice Co., LLC") would otherwise break the From header.
function formatFrom(name: string, email: string): string {
  const escaped = name.replace(/["\\]/g, (c) => `\\${c}`);
  return `"${escaped}" <${email}>`;
}

// Server-only. Returns null (rather than throwing) when email isn't
// configured — or the business row can't be read — so callers can
// log-and-continue: an email failure must never break a booking.
//
// The From is this deployment's business: its display name, and its own
// verified sending address (businesses.from_email, else RESEND_FROM_EMAIL —
// each business's booking deployment has its own env).
export async function getResend(): Promise<{ client: Resend; from: string } | null> {
  const apiKey = process.env.RESEND_API_KEY;
  let business;
  try {
    business = await getBusiness();
  } catch (err) {
    console.error("getResend: business lookup failed", err);
    return null;
  }
  const fromEmail = business.from_email ?? process.env.RESEND_FROM_EMAIL;
  if (!apiKey || !fromEmail) return null;
  return {
    client: new Resend(apiKey),
    from: formatFrom(business.from_name, fromEmail),
  };
}
