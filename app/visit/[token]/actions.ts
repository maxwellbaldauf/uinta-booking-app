"use server";

import { businessDb, businessTz } from "@/lib/tenant/business";
import { getVisitByToken, getRescheduleSlots } from "@/lib/visit";
import { slotStillAvailable } from "@/lib/scheduling";
import { addDaysToISODate, localMidnightUtcISO, todayISODate } from "@/lib/time/zone";
import { sendBookingConfirmationEmail } from "@/lib/email/bookingConfirmation";
import { sendCancellationEmail } from "@/lib/email/cancellation";
import { sendOwnerBookingAlert } from "@/lib/email/ownerBookingAlert";
import { syncJobCalendar } from "@/lib/calendarSync";
import { arrivalBlockLabel } from "@/lib/schedule/blocks";

export type RescheduleOption = { slotDate: string; arrivalBlock: number; blockLabel: string };

export async function getRescheduleOptions(
  token: string
): Promise<{ ok: true; slots: RescheduleOption[] } | { ok: false; error: string }> {
  const visit = await getVisitByToken(token);
  if (!visit) return { ok: false, error: "This link has expired." };
  if (!visit.canModify) return { ok: false, error: "This visit can no longer be changed online." };
  const slots = await getRescheduleSlots(visit);
  return { ok: true, slots };
}

export type RescheduleResponse =
  | { ok: true; scheduledDate: string; arrivalBlock: number; blockLabel: string }
  | { ok: false; error: string; slotTaken?: boolean };

export async function rescheduleVisit(
  token: string,
  choice: { slotDate: string; arrivalBlock: number }
): Promise<RescheduleResponse> {
  try {
    const visit = await getVisitByToken(token);
    if (!visit) return { ok: false, error: "This link has expired." };
    if (!visit.canModify) {
      return { ok: false, error: "This visit can no longer be changed online." };
    }
    if (visit.latitude == null || visit.longitude == null) {
      return { ok: false, error: "We can't reschedule this visit online — please contact us." };
    }

    const fresh = await slotStillAvailable(
      visit.latitude,
      visit.longitude,
      choice.slotDate,
      choice.arrivalBlock,
      visit.blocksNeeded,
      { excludeJobId: visit.jobId }
    );
    if (!fresh) {
      return { ok: false, error: "That time was just taken. Please pick another.", slotTaken: true };
    }

    const today = todayISODate(await businessTz());
    const supabase = businessDb();
    const { error } = await supabase
      .from("jobs")
      .update({
        scheduled_date: choice.slotDate,
        arrival_block: choice.arrivalBlock,
        booking_match_type: fresh.isFallback ? "fallback" : "route_matched",
        // Token unchanged (spec §3); only the expiry follows the new date.
        access_token_expires_at: localMidnightUtcISO(await businessTz(), addDaysToISODate(choice.slotDate, 2)),
        // Reset both pre-visit reminder stamps so a rescheduled visit gets
        // its own fresh 7-day/24-hour window off the new date, rather than
        // silently inheriting (or skipping) reminders keyed to the old one.
        reminder_7day_sent_at: null,
        reminder_24hr_sent_at: null,
      })
      .eq("id", visit.jobId);

    if (error) {
      console.error("rescheduleVisit: job update failed", error, { jobId: visit.jobId });
      return { ok: false, error: "We couldn't save that change. Please try again." };
    }

    // Updated confirmation + .ics, plus an owner alert (same-day flagged in
    // it). Independent of each other, so sent together.
    await Promise.all([
      sendBookingConfirmationEmail(visit.jobId, { variant: "rescheduled" }),
      syncJobCalendar(visit.jobId), // moves the existing Google Calendar event in place
      sendOwnerBookingAlert(visit.jobId, {
        kind: "rescheduled",
        today,
        previous: {
          date: visit.scheduledDate,
          arrivalBlock: visit.arrivalBlock,
          blocksNeeded: visit.blocksNeeded,
        },
      }),
    ]);

    return {
      ok: true,
      scheduledDate: choice.slotDate,
      arrivalBlock: choice.arrivalBlock,
      blockLabel: arrivalBlockLabel(choice.arrivalBlock, visit.blocksNeeded),
    };
  } catch (err) {
    console.error("rescheduleVisit: unexpected error", err);
    return { ok: false, error: "Something went wrong. Please try again." };
  }
}

export type CancelScope = "visit" | "property";
export type CancelResponse = { ok: true; scope: CancelScope } | { ok: false; error: string };

export async function cancelVisit(token: string, scope: CancelScope): Promise<CancelResponse> {
  try {
    const visit = await getVisitByToken(token);
    if (!visit) return { ok: false, error: "This link has expired." };
    if (visit.status === "cancelled") return { ok: true, scope };
    if (!visit.canModify) {
      return { ok: false, error: "This visit can no longer be changed online." };
    }

    const supabase = businessDb();
    const { error: jobError } = await supabase
      .from("jobs")
      .update({ status: "cancelled" })
      .eq("id", visit.jobId);
    if (jobError) {
      console.error("cancelVisit: job update failed", jobError, { jobId: visit.jobId });
      return { ok: false, error: "We couldn't cancel that. Please try again." };
    }

    if (scope === "property" && visit.propertyId) {
      const { error: propError } = await supabase
        .from("properties")
        .update({ plan_status: "cancelled", plan_cancelled_at: new Date().toISOString() })
        .eq("id", visit.propertyId);
      if (propError) {
        console.error("cancelVisit: property plan cancel failed", propError, { propertyId: visit.propertyId });
        // The visit is cancelled; surface the partial failure so it can be retried.
        return { ok: false, error: "The visit was cancelled, but we couldn't stop the plan. Please contact us." };
      }
    }

    // Payment method is deliberately left on file either way (spec §3).
    // The calendar event is deleted via the field app (job is now cancelled).
    await Promise.all([
      sendCancellationEmail(visit.jobId, { planCancelled: scope === "property" }),
      syncJobCalendar(visit.jobId),
    ]);

    return { ok: true, scope };
  } catch (err) {
    console.error("cancelVisit: unexpected error", err);
    return { ok: false, error: "Something went wrong. Please try again." };
  }
}
