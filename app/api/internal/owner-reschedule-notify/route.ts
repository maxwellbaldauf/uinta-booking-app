import { NextResponse } from "next/server";
import { sendBookingConfirmationEmail } from "@/lib/email/bookingConfirmation";

export const runtime = "nodejs";

// Called by uinta-field-app, server-to-server, right after the owner/tech
// changes a job's scheduled_date or arrival_block directly on the field-app
// job edit page (or its blocks_needed override). That page writes the job
// row itself (Project A owns the schema) and then calls here purely to send
// the customer the same updated-.ics confirmation email the self-service
// /visit/[token] reschedule flow already sends — reusing
// sendBookingConfirmationEmail rather than duplicating the .ics/email logic
// on the field-app side. variant: "owner_rescheduled" swaps in owner-voiced
// copy ("We've updated your appointment") instead of "rescheduled"'s
// customer-voiced copy, since the customer didn't do this themselves.
//
// Auth: a dedicated OWNER_RESCHEDULE_API_SECRET as a bearer token, mirroring
// IMPORT_API_SECRET's existing pattern. Scoped to this one endpoint so a leak
// of it can't do anything else.
//
// POST { jobId }  ->  { ok: true } | { ok: false; error }
function timingSafeEqual(a: string, b: string): boolean {
  if (a.length !== b.length) return false;
  let diff = 0;
  for (let i = 0; i < a.length; i++) diff |= a.charCodeAt(i) ^ b.charCodeAt(i);
  return diff === 0;
}

export async function POST(req: Request) {
  const secret = process.env.OWNER_RESCHEDULE_API_SECRET;
  const presented = (req.headers.get("authorization") ?? "").replace(/^Bearer\s+/i, "");
  if (!secret || !timingSafeEqual(presented, secret)) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  let body: { jobId?: string };
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: "Invalid body" }, { status: 400 });
  }
  if (!body.jobId) {
    return NextResponse.json({ error: "jobId required" }, { status: 400 });
  }

  const sent = await sendBookingConfirmationEmail(body.jobId, { variant: "owner_rescheduled" });
  if (!sent) {
    return NextResponse.json({ ok: false, error: "Email failed to send" }, { status: 502 });
  }

  return NextResponse.json({ ok: true });
}
