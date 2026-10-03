// The one place this app asks uinta-field-app to sync a job's Google Calendar
// event. Field app owns the Google OAuth connection and the Calendar API calls;
// this is just the bearer-secret internal call (same pattern as
// chargeInvoiceJob in lib/invoicePayment.ts, and owner-reschedule-notify in
// the other direction).
//
// Call it AFTER a job change has committed — new booking, customer
// reschedule, customer cancel, accepted clustering suggestion, applied day
// re-sequence. The field app reads the job's current state and creates,
// updates or deletes its event, so this never needs to say what happened and
// a double call is harmless.
//
// Deliberately never throws, and bounded by a timeout: a calendar failure
// must never fail or hang the customer action that triggered it. The field
// app tracks repeated failures and emails the owner.
const SYNC_TIMEOUT_MS = 8000;

export async function syncJobCalendar(jobId: string): Promise<boolean> {
  const baseUrl = (process.env.FIELD_APP_BASE_URL ?? "").trim().replace(/\/+$/, "");
  const secret = process.env.CALENDAR_SYNC_API_SECRET;
  if (!baseUrl || !secret) {
    // Not configured (e.g. local dev) — the calendar just isn't synced.
    console.error("syncJobCalendar: FIELD_APP_BASE_URL or CALENDAR_SYNC_API_SECRET not configured");
    return false;
  }

  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), SYNC_TIMEOUT_MS);
  try {
    const res = await fetch(`${baseUrl}/api/internal/calendar-sync`, {
      method: "POST",
      headers: { "Content-Type": "application/json", Authorization: `Bearer ${secret}` },
      body: JSON.stringify({ jobId }),
      signal: controller.signal,
    });
    const data = await res.json().catch(() => ({}));
    if (!res.ok || !data.ok) {
      console.error("syncJobCalendar: request failed", jobId, res.status, data);
      return false;
    }
    return true;
  } catch (err) {
    console.error("syncJobCalendar: unexpected error", jobId, err);
    return false;
  } finally {
    clearTimeout(timeout);
  }
}
