import { NextResponse } from "next/server";
import { findJobByInvoiceToken, chargeInvoiceJob } from "@/lib/invoicePayment";

export const runtime = "nodejs";

// The customer-approved-invoicing flow's "approve and pay" action — charges
// the card already on file for a completed-but-unpaid job. Kept separate
// from /api/payment/finalize-invoice-card (which saves a new card first) on
// purpose, matching this app's single-purpose-per-route convention
// (see /api/payment/finalize-backlog's own header comment): the happy path
// here needs no Stripe Elements / SetupIntent at all, since these customers
// already have a card on file — unlike the backlog/import case this app was
// originally built around.
type Body = { token: string };

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

  const result = await chargeInvoiceJob(job.id);
  if (!result.ok) {
    return NextResponse.json({ error: result.error }, { status: 402 });
  }

  return NextResponse.json({ ok: true });
}
