import { NextResponse } from "next/server";
import { sendClusterConsentEmail } from "@/lib/email/clusterConsentEmail";

export const runtime = "nodejs";

// Called by uinta-field-app, server-to-server, right after the owner
// approves a geographic-clustering suggestion for one or more
// already-scheduled jobs. Project A stamps each moving job's consent_token/
// consent_deadline itself (it owns the schema) and calls here purely to
// send the customer-facing consent-request email(s) — reusing this repo's
// Resend/email-shell infrastructure rather than duplicating it on the
// field-app side, same reasoning as owner-reschedule-notify.
//
// Auth: a dedicated CLUSTERING_CONSENT_API_SECRET as a bearer token,
// mirroring OWNER_RESCHEDULE_API_SECRET's existing pattern. Scoped to this
// one endpoint so a leak of it can't do anything else.
//
// POST { clusterSuggestionJobIds: string[] }  ->  { ok: true } | { ok: false; error }
function timingSafeEqual(a: string, b: string): boolean {
  if (a.length !== b.length) return false;
  let diff = 0;
  for (let i = 0; i < a.length; i++) diff |= a.charCodeAt(i) ^ b.charCodeAt(i);
  return diff === 0;
}

export async function POST(req: Request) {
  const secret = process.env.CLUSTERING_CONSENT_API_SECRET;
  const presented = (req.headers.get("authorization") ?? "").replace(/^Bearer\s+/i, "");
  if (!secret || !timingSafeEqual(presented, secret)) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  let body: { clusterSuggestionJobIds?: string[] };
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: "Invalid body" }, { status: 400 });
  }
  if (!body.clusterSuggestionJobIds || body.clusterSuggestionJobIds.length === 0) {
    return NextResponse.json({ error: "clusterSuggestionJobIds required" }, { status: 400 });
  }

  // Independent sends — run concurrently rather than one at a time.
  const results = await Promise.all(body.clusterSuggestionJobIds.map(sendClusterConsentEmail));
  const allSent = results.every(Boolean);

  if (!allSent) {
    return NextResponse.json(
      { ok: false, error: "One or more consent emails failed to send" },
      { status: 502 }
    );
  }

  return NextResponse.json({ ok: true });
}
