"use server";

import { businessDb, businessTz } from "@/lib/tenant/business";
import { getClusterConsentByToken } from "@/lib/clusterConsent";
import { slotStillAvailable } from "@/lib/scheduling";
import { addDaysToISODate, localMidnightUtcISO } from "@/lib/time/zone";
import { sendBookingConfirmationEmail } from "@/lib/email/bookingConfirmation";
import { sendClusterDeclineOwnerAlert } from "@/lib/email/clusterDeclineOwnerAlert";
import { resolvePendingDaySequenceMoves } from "@/lib/resolveDaySequence";

export type ClusterConsentResponse = { ok: true } | { ok: false; error: string };

// Atomically claims a pending consent row for exactly one caller. A
// double-tapped button, a retried request, or the same link open in two
// tabs can otherwise both pass a plain "is this still pending" read-then-
// check before either write lands; the `.eq("consent_status", "pending")`
// on the UPDATE itself is what makes only one of them actually win —
// `claimed` comes back null for every loser.
async function claimPendingConsent(
  supabase: ReturnType<typeof businessDb>,
  consentId: string,
  nextStatus: "accepted" | "declined"
): Promise<boolean> {
  const { data: claimed } = await supabase
    .from("cluster_suggestion_jobs")
    .update({ consent_status: nextStatus, consent_responded_at: new Date().toISOString() })
    .eq("id", consentId)
    .eq("consent_status", "pending")
    .select("id")
    .maybeSingle();
  return !!claimed;
}

// Accepting is a genuinely new primitive for this codebase: unlike
// rescheduleVisit (customer picks their own slot and it's applied
// immediately), here the slot was already proposed and stored — this just
// re-validates it's still open (same slotStillAvailable race guard) and
// applies it. Reuses the existing .ics-SEQUENCE-bump confirmation email
// mechanism via the new "cluster_matched" variant — no second notification
// path.
export async function acceptClusterSuggestion(token: string): Promise<ClusterConsentResponse> {
  try {
    const consent = await getClusterConsentByToken(token);
    if (!consent) return { ok: false, error: "This link has expired or is no longer valid." };
    if (consent.status !== "pending") {
      return { ok: false, error: "This suggestion has already been responded to." };
    }

    const supabase = businessDb();

    const claimed = await claimPendingConsent(supabase, consent.id, "accepted");
    if (!claimed) {
      return { ok: false, error: "This suggestion has already been responded to." };
    }

    // The job must still be exactly as it was when the suggestion was
    // generated — not cancelled, not already moved by an unrelated owner
    // edit in the meantime — or this claim is stale and must be unwound
    // rather than applied. Reuses the read from getClusterConsentByToken's
    // own join above rather than a second query.
    const stillMatchesOriginal =
      consent.jobStatus === "scheduled" &&
      consent.jobCurrentScheduledDate === consent.originalDate &&
      consent.jobCurrentArrivalBlock === consent.originalArrivalBlock;

    if (!stillMatchesOriginal || consent.latitude == null || consent.longitude == null) {
      await supabase
        .from("cluster_suggestion_jobs")
        .update({ consent_status: "unavailable" })
        .eq("id", consent.id);
      return { ok: false, error: "That visit can't be updated online right now — please contact us." };
    }

    // day_sequence's proposed target routinely belongs to ANOTHER mover in
    // this same group who hasn't vacated it yet (a same-day swap/rotation)
    // rather than a genuinely-free block, unlike geo_cluster. slotStillAvailable
    // can only ever exclude THIS one job, so it can't tell "blocked by a
    // sibling who's also about to move" apart from a real conflict —
    // resolvePendingDaySequenceMoves handles that distinction (and applies
    // this and any other now-unblocked sibling in the same pass). The
    // customer's own consent is recorded either way (see claimPendingConsent
    // above) — {ok:true} here means "your choice was recorded," not
    // necessarily "applied this instant."
    if (consent.kind === "day_sequence") {
      await resolvePendingDaySequenceMoves(consent.clusterSuggestionId);
      return { ok: true };
    }

    const fresh = await slotStillAvailable(
      consent.latitude,
      consent.longitude,
      consent.proposedDate,
      consent.proposedArrivalBlock,
      consent.blocksNeeded,
      { excludeJobId: consent.jobId }
    );
    if (!fresh) {
      await supabase
        .from("cluster_suggestion_jobs")
        .update({ consent_status: "unavailable" })
        .eq("id", consent.id);
      return {
        ok: false,
        error: "That time is no longer available — your original visit stays as scheduled.",
      };
    }

    const { error } = await supabase
      .from("jobs")
      .update({
        scheduled_date: consent.proposedDate,
        arrival_block: consent.proposedArrivalBlock,
        booking_match_type: fresh.isFallback ? "fallback" : "route_matched",
        access_token_expires_at: localMidnightUtcISO(await businessTz(), addDaysToISODate(consent.proposedDate, 2)),
        reminder_7day_sent_at: null,
        reminder_24hr_sent_at: null,
      })
      .eq("id", consent.jobId);

    if (error) {
      console.error("acceptClusterSuggestion: job update failed", error, { jobId: consent.jobId });
      // The claim already committed the row to "accepted" — leave it as-is
      // rather than reopening it to "pending" (which would recreate the
      // exact race this claim exists to prevent). applied_at staying null
      // is the durable signal that this accepted row never actually applied.
      return { ok: false, error: "We couldn't save that change. Please try again." };
    }

    await supabase
      .from("cluster_suggestion_jobs")
      .update({ applied_at: new Date().toISOString() })
      .eq("id", consent.id);

    await sendBookingConfirmationEmail(consent.jobId, { variant: "cluster_matched" });

    return { ok: true };
  } catch (err) {
    console.error("acceptClusterSuggestion: unexpected error", err);
    return { ok: false, error: "Something went wrong. Please try again." };
  }
}

export async function declineClusterSuggestion(token: string): Promise<ClusterConsentResponse> {
  try {
    const consent = await getClusterConsentByToken(token);
    if (!consent) return { ok: false, error: "This link has expired or is no longer valid." };
    if (consent.status !== "pending") {
      return { ok: false, error: "This suggestion has already been responded to." };
    }

    const supabase = businessDb();

    const claimed = await claimPendingConsent(supabase, consent.id, "declined");
    if (!claimed) {
      return { ok: false, error: "This suggestion has already been responded to." };
    }

    const sent = await sendClusterDeclineOwnerAlert(consent.jobId, consent.originalDate, consent.proposedDate);
    if (!sent) {
      await supabase
        .from("cluster_suggestion_jobs")
        .update({ owner_notify_failed: true })
        .eq("id", consent.id);
    }

    // A decline never frees anything by itself (the decliner stays exactly
    // where they were) — but it can be the piece of information that
    // determines a sibling's cycle is now permanently dead (see
    // resolveDaySequence.ts). Cheap no-op in the common case; harmless to
    // call unconditionally rather than trying to predict when it matters.
    if (consent.kind === "day_sequence") {
      await resolvePendingDaySequenceMoves(consent.clusterSuggestionId);
    }

    return { ok: true };
  } catch (err) {
    console.error("declineClusterSuggestion: unexpected error", err);
    return { ok: false, error: "Something went wrong. Please try again." };
  }
}
