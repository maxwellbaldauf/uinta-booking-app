import { NextResponse } from "next/server";
import { businessDb } from "@/lib/tenant/business";
import { findCustomerByAgreementToken } from "@/lib/customers";
import { agreementVersionFor, agreementIsCurrentFor } from "@/lib/agreement";
import { acceptanceFields, applyPendingSwitches, loadCustomerAgreement } from "@/lib/agreementFrequency";
import { sendBookingConfirmationEmail } from "@/lib/email/bookingConfirmation";

export const runtime = "nodejs";

// Records a one-time-payment-link customer's Service Agreement acceptance -
// the same two columns the card flows write (accepted_at + version) - with NO
// Stripe call and no card. The token is the only authorization. Re-checked on
// the server: the version the browser says it saw must be the current one.
//
// Afterwards, if the customer has an upcoming scheduled visit, they get the
// standard booking confirmation (date, window, .ics invite, agreement PDF) -
// the same email every other customer gets at booking.
export async function POST(req: Request) {
  let body: { token?: string; version?: string };
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: "Invalid request body" }, { status: 400 });
  }
  if (typeof body.token !== "string" || !body.token) {
    return NextResponse.json({ error: "token is required" }, { status: 400 });
  }
  const customer = await findCustomerByAgreementToken(body.token);
  if (!customer) {
    return NextResponse.json({ error: "This agreement link has expired or is invalid." }, { status: 404 });
  }
  // The text shown follows the customer's frequency, decided here on the server.
  const { frequency, lines } = await loadCustomerAgreement(customer.id);
  const requiredVersion = agreementVersionFor(customer.payment_mode, frequency, lines);
  const mode = customer.payment_mode;
  if (body.version !== requiredVersion) {
    return NextResponse.json({ error: "Please review and accept the current Service Agreement." }, { status: 400 });
  }

  const db = businessDb();
  // An explicit acceptance of the page they were shown: any requested frequency switch takes
  // effect now (the visit itself is not moved). Skipped if the terms changed since they were shown.
  const alreadyCurrent = agreementIsCurrentFor(customer.service_agreement_version, mode, frequency, lines);
  if (!alreadyCurrent) {
    const { error } = await db
      .from("customers")
      .update(acceptanceFields(mode, frequency, lines))
      .eq("id", customer.id);
    if (error) {
      console.error("agreement/accept: update failed", error, { customerId: customer.id });
      return NextResponse.json({ error: "We couldn't record your agreement. Please try again." }, { status: 500 });
    }
    const switched = await applyPendingSwitches(customer.id, mode, requiredVersion);

    // Standard confirmation for the next scheduled visit, if there is one (not for a
    // frequency switch: the visit is unchanged and the owner decides whether to move it).
    const { data: next } = await db
      .from("jobs")
      .select("id, scheduled_date, property:properties!inner(customer_id)")
      .eq("status", "scheduled")
      .eq("property.customer_id", customer.id)
      .order("scheduled_date", { ascending: true })
      .limit(1)
      .maybeSingle();
    if (next?.id && switched === 0) {
      const sent = await sendBookingConfirmationEmail(next.id, { attachAgreement: true });
      if (sent) {
        await db.from("jobs").update({ confirmation_sent_at: new Date().toISOString() }).eq("id", next.id);
      }
    }
  }
  else await applyPendingSwitches(customer.id, mode, requiredVersion);
  return NextResponse.json({ ok: true });
}
