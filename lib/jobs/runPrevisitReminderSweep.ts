// The pre-visit reminder sweep — called from
// netlify/functions/pre-visit-reminders.mts (a real Netlify Scheduled
// Function, not a Next.js route: Netlify Runtime v5 deprecated scheduled
// functions implemented as Next.js API routes in favor of framework-agnostic
// Netlify Functions). Netlify Functions are bundled standalone by esbuild,
// which does NOT resolve this project's "@/" tsconfig path aliases — so
// every import in this file, and everything it in turn imports, must be a
// plain relative path (this is also why lib/settings.ts's own internal
// import was changed from "@/lib/supabase/admin" to "./supabase/admin").
// Kept in lib/ (importable, testable, not bundler-specific) rather than
// inside netlify/functions/ itself, which is nothing but the thin scheduled
// entry point.
//
// The Service Agreement has promised this since day one ("we'll contact you
// multiple times in the week leading up to your visit"), but no version of
// it ever existed — confirmed by grep and by checking the linked Supabase
// project for pg_cron jobs before building this.
//
// Kept genuinely separate from uinta-field-app's unpaid-invoice reminder
// sweep — different repo, different table columns, different query,
// different content. One reminds about an upcoming visit; the other chases
// an unpaid invoice for a past one. They must never share logic or state.
import { createAdminClient } from "../supabase/admin";
import { todayDenverISODate, addDaysToISODate } from "../time/denver";
import { getSettings } from "../settings";
import { getEffectivePriceCents } from "../pricing";
import { arrivalBlockLabel } from "../schedule/blocks";
import { formatVisitDate } from "../format";
import { renderEmail, detailsTable, buttonRow, escapeHtml } from "../email/shell";
import { getResend } from "../email/resend";

type ReminderJobRow = {
  id: string;
  scheduled_date: string;
  arrival_block: number;
  blocks_needed: number;
  access_token: string | null;
  quoted_price_cents: number | null;
  property:
    | ReminderProperty
    | ReminderProperty[]
    | null;
};
type ReminderProperty = {
  address: string;
  service_type: "residential" | "commercial";
  custom_price_cents: number | null;
  customer: { full_name: string | null; email: string | null } | { full_name: string | null; email: string | null }[] | null;
};

function flatten<T>(v: T | T[] | null | undefined): T | null {
  return Array.isArray(v) ? v[0] ?? null : v ?? null;
}

const JOB_COLUMNS =
  "id, scheduled_date, arrival_block, blocks_needed, access_token, quoted_price_cents, property:properties(address, service_type, custom_price_cents, customer:customers(full_name, email))";

type ReminderKind = "7day" | "24hr";

async function sendReminder(params: {
  kind: ReminderKind;
  job: ReminderJobRow;
  appBaseUrl: string;
  tiers: { basePriceCents: number; commercialPriceCents: number };
}): Promise<boolean> {
  const property = flatten(params.job.property);
  const customer = flatten(property?.customer);
  if (!customer?.email || !property) return false;

  const name = customer.full_name?.trim() || "there";
  const dateLong = formatVisitDate(params.job.scheduled_date, { withYear: true });
  const windowLabel = arrivalBlockLabel(params.job.arrival_block, params.job.blocks_needed);
  // The price actually locked in at booking/scheduling time (same source
  // bookingConfirmation.ts trusts: job.quoted_price_cents) — not recomputed
  // live from current settings/property state, which could have changed
  // since booking and would then quote a different amount than what the
  // customer will actually be charged. getEffectivePriceCents is only a
  // fallback for the edge case of a legacy row with no quoted price at all.
  const priceCents =
    params.job.quoted_price_cents ?? getEffectivePriceCents(property, params.tiers);
  const priceText = `$${(priceCents / 100).toFixed(2)}`;
  const manageUrl = params.job.access_token
    ? `${params.appBaseUrl}/visit/${params.job.access_token}`
    : params.appBaseUrl;

  const headline =
    params.kind === "7day"
      ? "Your cleaning is coming up next week."
      : "Your cleaning is tomorrow.";

  const inner = `
    <p style="margin:0 0 12px;">Hi ${escapeHtml(name)},</p>
    <p style="margin:0 0 4px;font-size:16px;font-weight:700;">${escapeHtml(headline)}</p>
    ${detailsTable([
      { label: "Date", value: dateLong },
      { label: "Arrival window", value: windowLabel },
      { label: "Address", value: property.address },
      { label: "Price", value: `${priceText} per visit` },
    ])}
    ${buttonRow(manageUrl, "Reschedule or cancel")}
  `;

  const html = renderEmail({
    title: `Uinta Ice Co — ${headline}`,
    preheader: `${dateLong}, ${windowLabel} — ${property.address}`,
    inner,
  });

  const text = [
    `Hi ${name},`,
    ``,
    headline,
    ``,
    `Date:           ${dateLong}`,
    `Arrival window: ${windowLabel}`,
    `Address:        ${property.address}`,
    `Price:          ${priceText} per visit`,
    ``,
    `Reschedule or cancel: ${manageUrl}`,
    ``,
    `— Uinta Ice Co`,
  ].join("\n");

  const resend = getResend();
  if (!resend) {
    console.error("pre-visit-reminders: Resend not configured");
    return false;
  }

  const { error } = await resend.client.emails.send({
    from: resend.from,
    to: customer.email,
    subject:
      params.kind === "7day"
        ? `Reminder: your visit is ${dateLong}`
        : `Reminder: your visit is tomorrow — ${dateLong}`,
    html,
    text,
  });

  if (error) {
    console.error("pre-visit-reminders: Resend send failed", error, { jobId: params.job.id, kind: params.kind });
    return false;
  }
  return true;
}

export type PrevisitReminderSweepResult = {
  sevenDaySent: number;
  sevenDayFailed: number;
  twentyFourHourSent: number;
  twentyFourHourFailed: number;
};

const REMINDER_COLUMN: Record<ReminderKind, "reminder_7day_sent_at" | "reminder_24hr_sent_at"> = {
  "7day": "reminder_7day_sent_at",
  "24hr": "reminder_24hr_sent_at",
};

// Runs a batch's sends concurrently (Resend round-trips otherwise add up
// linearly, and Netlify Scheduled Functions have a 30-second execution cap)
// while keeping every job's failure fully isolated — one bad row must never
// abort the rest of the batch, and a job whose email send succeeds but whose
// sent-at stamp fails to write is logged loudly rather than silently risking
// a duplicate send on the next run.
async function processReminderBatch(
  jobs: ReminderJobRow[],
  kind: ReminderKind,
  supabase: ReturnType<typeof createAdminClient>,
  appBaseUrl: string,
  tiers: { basePriceCents: number; commercialPriceCents: number }
): Promise<{ sent: number; failed: number }> {
  const results = await Promise.all(
    jobs.map(async (job) => {
      try {
        const ok = await sendReminder({ kind, job, appBaseUrl, tiers });
        if (!ok) return false;

        const { error } = await supabase
          .from("jobs")
          .update({ [REMINDER_COLUMN[kind]]: new Date().toISOString() })
          .eq("id", job.id);
        if (error) {
          // The email already went out — this is a "will re-send tomorrow"
          // risk, not a lost reminder, but it needs to be visible rather
          // than silently swallowed.
          console.error(`pre-visit-reminders: failed to stamp ${REMINDER_COLUMN[kind]}`, error, { jobId: job.id });
        }
        return true;
      } catch (err) {
        console.error(`pre-visit-reminders: unexpected error (${kind})`, job.id, err);
        return false;
      }
    })
  );

  const sent = results.filter(Boolean).length;
  return { sent, failed: results.length - sent };
}

export async function runPrevisitReminderSweep(): Promise<PrevisitReminderSweepResult> {
  const empty = { sevenDaySent: 0, sevenDayFailed: 0, twentyFourHourSent: 0, twentyFourHourFailed: 0 };

  try {
    const supabase = createAdminClient();
    const today = todayDenverISODate();

    const appBaseUrl = (process.env.APP_BASE_URL ?? "").trim().replace(/\/+$/, "");
    if (!/^https?:\/\//i.test(appBaseUrl)) {
      console.error("pre-visit-reminders: APP_BASE_URL is not a full http(s):// URL — skipping sweep entirely.");
      return empty;
    }

    const settings = await getSettings();
    const tiers = {
      basePriceCents: settings.base_price_cents,
      commercialPriceCents: settings.commercial_price_cents,
    };

    const sevenDayTarget = addDaysToISODate(today, 7);
    const oneDayTarget = addDaysToISODate(today, 1);

    const [sevenDayRows, oneDayRows] = await Promise.all([
      supabase
        .from("jobs")
        .select(JOB_COLUMNS)
        .eq("status", "scheduled")
        .eq("scheduled_date", sevenDayTarget)
        .is("reminder_7day_sent_at", null),
      supabase
        .from("jobs")
        .select(JOB_COLUMNS)
        .eq("status", "scheduled")
        .eq("scheduled_date", oneDayTarget)
        .is("reminder_24hr_sent_at", null),
    ]);

    if (sevenDayRows.error) console.error("pre-visit-reminders: 7-day query failed", sevenDayRows.error);
    if (oneDayRows.error) console.error("pre-visit-reminders: 24hr query failed", oneDayRows.error);

    const [sevenDay, twentyFourHour] = await Promise.all([
      processReminderBatch((sevenDayRows.data ?? []) as ReminderJobRow[], "7day", supabase, appBaseUrl, tiers),
      processReminderBatch((oneDayRows.data ?? []) as ReminderJobRow[], "24hr", supabase, appBaseUrl, tiers),
    ]);

    return {
      sevenDaySent: sevenDay.sent,
      sevenDayFailed: sevenDay.failed,
      twentyFourHourSent: twentyFourHour.sent,
      twentyFourHourFailed: twentyFourHour.failed,
    };
  } catch (err) {
    // A failure before either batch even starts (e.g. getSettings()
    // throwing) must not silently skip the entire day's reminders with no
    // trace — log loudly and return zeroed counts rather than let the
    // rejection propagate to the Netlify Function's handler unhandled.
    console.error("pre-visit-reminders: sweep failed before processing any jobs", err);
    return empty;
  }
}
