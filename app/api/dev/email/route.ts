import { NextResponse } from "next/server";
import { isDev } from "@/lib/dev";
import { buildBookingConfirmationEmail, sendBookingConfirmationEmail } from "@/lib/email/bookingConfirmation";
import { buildSameDayBookingAlert, sendSameDayBookingAlert } from "@/lib/email/sameDayAlert";
import { buildCancellationEmail, sendCancellationEmail } from "@/lib/email/cancellation";
import { buildPaymentSetupRequestEmail, sendPaymentSetupRequestEmail } from "@/lib/email/paymentSetupRequest";

export const runtime = "nodejs";

// DEV ONLY. Preview / test-send the emails without spamming customers.
//   GET  ?jobId=X&kind=confirmation|rescheduled|same_day|cancel[&part=html|text|ics]
//   GET  ?token=X&kind=payment_setup[&part=html|text]
//   POST { jobId|token, kind, to }
function guard() {
  return isDev() ? null : NextResponse.json({ error: "Not found" }, { status: 404 });
}

async function build(jobId: string, token: string, kind: string) {
  if (kind === "payment_setup") return buildPaymentSetupRequestEmail(token);
  if (kind === "same_day") return buildSameDayBookingAlert(jobId);
  if (kind === "cancel") return buildCancellationEmail(jobId, { planCancelled: true });
  if (kind === "rescheduled") return buildBookingConfirmationEmail(jobId, { variant: "rescheduled" });
  return buildBookingConfirmationEmail(jobId);
}

export async function GET(req: Request) {
  const denied = guard();
  if (denied) return denied;

  const url = new URL(req.url);
  const jobId = url.searchParams.get("jobId") ?? "";
  const token = url.searchParams.get("token") ?? "";
  const kind = url.searchParams.get("kind") ?? "confirmation";
  const part = url.searchParams.get("part") ?? "html";

  const built = await build(jobId, token, kind);

  if ("error" in built) {
    return NextResponse.json({ error: built.error }, { status: 404 });
  }

  if (part === "text") {
    return new NextResponse(built.text, { headers: { "Content-Type": "text/plain; charset=utf-8" } });
  }
  if (part === "ics") {
    const ics = built.attachments?.[0]?.content?.toString("utf-8") ?? "(no attachment)";
    return new NextResponse(ics, { headers: { "Content-Type": "text/plain; charset=utf-8" } });
  }
  return new NextResponse(built.html, { headers: { "Content-Type": "text/html; charset=utf-8" } });
}

export async function POST(req: Request) {
  const denied = guard();
  if (denied) return denied;

  let body: { jobId?: string; token?: string; kind?: string; to?: string };
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: "bad body" }, { status: 400 });
  }
  if (!body.to) {
    return NextResponse.json({ error: "to required" }, { status: 400 });
  }

  if (body.kind === "payment_setup") {
    if (!body.token) return NextResponse.json({ error: "token required" }, { status: 400 });
    const sent = await sendPaymentSetupRequestEmail(body.token, { overrideTo: body.to });
    return NextResponse.json({ ok: sent });
  }

  if (!body.jobId) {
    return NextResponse.json({ error: "jobId required" }, { status: 400 });
  }

  if (body.kind === "same_day") {
    await sendSameDayBookingAlert(body.jobId, { overrideTo: body.to });
    return NextResponse.json({ ok: true, note: "check server logs for send status" });
  }
  if (body.kind === "cancel") {
    const sent = await sendCancellationEmail(body.jobId, { planCancelled: true, overrideTo: body.to });
    return NextResponse.json({ ok: sent });
  }
  const sent = await sendBookingConfirmationEmail(body.jobId, {
    overrideTo: body.to,
    variant: body.kind === "rescheduled" ? "rescheduled" : "new",
  });
  return NextResponse.json({ ok: sent });
}
