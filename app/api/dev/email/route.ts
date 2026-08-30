import { NextResponse } from "next/server";
import { isDev } from "@/lib/dev";
import { buildBookingConfirmationEmail, sendBookingConfirmationEmail } from "@/lib/email/bookingConfirmation";
import { buildSameDayBookingAlert, sendSameDayBookingAlert } from "@/lib/email/sameDayAlert";
import { buildCancellationEmail, sendCancellationEmail } from "@/lib/email/cancellation";

export const runtime = "nodejs";

// DEV ONLY. Preview / test-send the emails without spamming customers.
//   GET  ?jobId=X&kind=confirmation|rescheduled|same_day|cancel[&part=html|text|ics]
//   POST { jobId, kind, to }
function guard() {
  return isDev() ? null : NextResponse.json({ error: "Not found" }, { status: 404 });
}

async function build(jobId: string, kind: string) {
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
  const kind = url.searchParams.get("kind") ?? "confirmation";
  const part = url.searchParams.get("part") ?? "html";

  const built = await build(jobId, kind);

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

  let body: { jobId?: string; kind?: string; to?: string };
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: "bad body" }, { status: 400 });
  }
  if (!body.jobId || !body.to) {
    return NextResponse.json({ error: "jobId and to required" }, { status: 400 });
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
