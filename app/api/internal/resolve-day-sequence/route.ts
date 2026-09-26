import { NextResponse } from "next/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { resolvePendingDaySequenceMoves } from "@/lib/resolveDaySequence";

export const runtime = "nodejs";

// Safety-net trigger, called by uinta-field-app's nightly sweep. The common
// case (a day_sequence swap/rotation fully resolving) already happens
// synchronously, in-process, right when a customer accepts or declines (see
// app/cluster-consent/[token]/actions.ts) — this exists only to catch up on
// anything left accepted-but-unapplied because that in-process attempt
// didn't run to completion (e.g. a crash mid-request).
//
// Auth: reuses CLUSTERING_CONSENT_API_SECRET as a bearer token — same
// mirrored pattern as /api/internal/cluster-consent-notify, and the same
// secret, since this is the same feature's second cross-repo call rather
// than a distinct capability.
//
// POST (no body) -> { ok: true, resolved: number }
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

  const supabase = createAdminClient();
  const { data: rows, error } = await supabase
    .from("cluster_suggestion_jobs")
    .select("cluster_suggestion_id, cluster_suggestion:cluster_suggestions!inner(kind)")
    .eq("consent_status", "accepted")
    .is("applied_at", null)
    .eq("cluster_suggestion.kind", "day_sequence");

  if (error) {
    return NextResponse.json({ ok: false, error: error.message }, { status: 500 });
  }

  const suggestionIds = [...new Set((rows ?? []).map((r) => r.cluster_suggestion_id))];
  for (const id of suggestionIds) {
    await resolvePendingDaySequenceMoves(id);
  }

  return NextResponse.json({ ok: true, resolved: suggestionIds.length });
}
