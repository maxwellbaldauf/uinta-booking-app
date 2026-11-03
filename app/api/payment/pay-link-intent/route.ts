import { NextResponse } from "next/server";
import { findJobByInvoiceToken, agreementFieldsToRecord, requestPayLinkIntent } from "@/lib/invoicePayment";
import { businessDb } from "@/lib/tenant/business";

export const runtime = "nodejs";

// A one-time-payment-link customer opened /invoice/[token]: hand back the
// single-use PaymentIntent client secret for the card form. Nothing here saves a
// card or creates a Stripe Customer. The amount is decided by the field app from
// the job's locked final price; this route never accepts one.
//
// The Service Agreement gate is the same as approve-invoice: recorded BEFORE any
// payment can happen.
type Body = { token: string; agreement?: { accepted?: boolean; version?: string } };

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

  const job = await findJobByInvoiceToken(body.token);
  if (!job) {
    return NextResponse.json({ error: "This invoice link has expired, is invalid, or is already settled." }, { status: 404 });
  }
  if (job.paymentMode !== "one_time_link") {
    return NextResponse.json({ error: "This invoice is paid another way." }, { status: 400 });
  }

  const agreementFields = agreementFieldsToRecord(job, body.agreement);
  if (!agreementFields) {
    return NextResponse.json(
      { error: "Please review and accept the current Service Agreement to continue.", agreementRequired: true },
      { status: 400 }
    );
  }
  if (Object.keys(agreementFields).length > 0) {
    const { error } = await businessDb().from("customers").update(agreementFields).eq("id", job.customerId);
    if (error) {
      console.error("pay-link-intent: recording agreement failed", error, { customerId: job.customerId });
      return NextResponse.json({ error: "We couldn't record your agreement. Please try again." }, { status: 500 });
    }
  }

  const result = await requestPayLinkIntent(job.id);
  if (!result.ok) return NextResponse.json({ error: result.error }, { status: 502 });
  if (result.state === "ready") {
    return NextResponse.json({ state: "ready", clientSecret: result.clientSecret, amountCents: result.amountCents });
  }
  return NextResponse.json({ state: result.state });
}
