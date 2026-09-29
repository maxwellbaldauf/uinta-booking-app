import { NextResponse } from "next/server";
import { findJobByInvoiceToken, chargeInvoiceJob, agreementFieldsToRecord } from "@/lib/invoicePayment";
import { businessDb } from "@/lib/tenant/business";

export const runtime = "nodejs";

// The customer-approved-invoicing flow's "approve and pay" action — charges
// the card already on file for a completed-but-unpaid job. Kept separate
// from /api/payment/finalize-invoice-card (which saves a new card first) on
// purpose, matching this app's single-purpose-per-route convention
// (see /api/payment/finalize-backlog's own header comment): the happy path
// here needs no Stripe Elements / SetupIntent at all, since these customers
// already have a card on file — unlike the backlog/import case this app was
// originally built around.
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
    return NextResponse.json(
      { error: "This invoice link has expired, is invalid, or is already settled." },
      { status: 404 }
    );
  }

  if (!job.hasDefaultPaymentMethod) {
    return NextResponse.json(
      { error: "No card on file yet — add one to continue.", noCardOnFile: true },
      { status: 400 }
    );
  }

  // The customer accepts the Service Agreement here (scroll-gated on the
  // page) if they haven't accepted the current version — recorded BEFORE the
  // charge, so a card is never charged without a recorded acceptance.
  const agreementFields = agreementFieldsToRecord(job, body.agreement);
  if (!agreementFields) {
    return NextResponse.json(
      { error: "Please review and accept the current Service Agreement to continue.", agreementRequired: true },
      { status: 400 }
    );
  }
  if (Object.keys(agreementFields).length > 0) {
    const { error: agreementError } = await businessDb()
      .from("customers")
      .update(agreementFields)
      .eq("id", job.customerId);
    if (agreementError) {
      console.error("approve-invoice: recording agreement failed", agreementError, { customerId: job.customerId });
      return NextResponse.json({ error: "We couldn't record your agreement. Please try again." }, { status: 500 });
    }
  }

  const result = await chargeInvoiceJob(job.id);
  if (!result.ok) {
    return NextResponse.json({ error: result.error }, { status: 402 });
  }

  return NextResponse.json({ ok: true });
}
