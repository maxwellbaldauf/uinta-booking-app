"use server";

import { createAdminClient } from "@/lib/supabase/admin";
import { getClusterConsentByToken } from "@/lib/clusterConsent";
import { slotStillAvailable } from "@/lib/scheduling";
import { addDaysToISODate, denverMidnightUtcISO } from "@/lib/time/denver";
import { sendBookingConfirmationEmail } from "@/lib/email/bookingConfirmation";
import { sendClusterDeclineOwnerAlert } from "@/lib/email/clusterDeclineOwnerAlert";

type PropRow = { latitude: number | null; longitude: number | null };
type JobRow = { property: PropRow | PropRow[] | null };

function flatten<T>(v: T | T[] | null | undefined): T | null {
  return Array.isArray(v) ? (v[0] ?? null) : (v ?? null);
}

export type ClusterConsentResponse = { ok: true } | { ok: false; error: string };

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

    const supabase = createAdminClient();
    const { data: jobRow } = await supabase
      .from("jobs")
      .select("property:properties(latitude, longitude)")
      .eq("id", consent.jobId)
      .single();
    const property = flatten((jobRow as JobRow | null)?.property);
    if (!property || property.latitude == null || property.longitude == null) {
      return { ok: false, error: "We can't confirm this online right now — please contact us." };
    }

    const fresh = await slotStillAvailable(
      property.latitude,
      property.longitude,
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
        access_token_expires_at: denverMidnightUtcISO(addDaysToISODate(consent.proposedDate, 2)),
        reminder_7day_sent_at: null,
        reminder_24hr_sent_at: null,
      })
      .eq("id", consent.jobId);

    if (error) {
      console.error("acceptClusterSuggestion: job update failed", error, { jobId: consent.jobId });
      return { ok: false, error: "We couldn't save that change. Please try again." };
    }

    await supabase
      .from("cluster_suggestion_jobs")
      .update({
        consent_status: "accepted",
        consent_responded_at: new Date().toISOString(),
        applied_at: new Date().toISOString(),
      })
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

    const supabase = createAdminClient();
    const { error } = await supabase
      .from("cluster_suggestion_jobs")
      .update({ consent_status: "declined", consent_responded_at: new Date().toISOString() })
      .eq("id", consent.id);

    if (error) {
      console.error("declineClusterSuggestion: update failed", error);
      return { ok: false, error: "Something went wrong. Please try again." };
    }

    const sent = await sendClusterDeclineOwnerAlert(consent.jobId, consent.originalDate, consent.proposedDate);
    if (!sent) {
      await supabase
        .from("cluster_suggestion_jobs")
        .update({ owner_notify_failed: true })
        .eq("id", consent.id);
    }

    return { ok: true };
  } catch (err) {
    console.error("declineClusterSuggestion: unexpected error", err);
    return { ok: false, error: "Something went wrong. Please try again." };
  }
}
