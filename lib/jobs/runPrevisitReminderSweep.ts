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
  "id, scheduled_date, arrival_block, blocks_needed, access_token, property:properties(address, service_type, custom_price_cents, customer:customers(full_name, email))";

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
  const priceText = `$${(
    getEffectivePriceCents(property, params.tiers) / 100
  ).toFixed(2)}`;
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

export async function runPrevisitReminderSweep(): Promise<PrevisitReminderSweepResult> {
  const supabase = createAdminClient();
  const today = todayDenverISODate();

  const appBaseUrl = (process.env.APP_BASE_URL ?? "").trim().replace(/\/+$/, "");
  if (!/^https?:\/\//i.test(appBaseUrl)) {
    console.error("pre-visit-reminders: APP_BASE_URL is not a full http(s):// URL — skipping sweep entirely.");
    return { sevenDaySent: 0, sevenDayFailed: 0, twentyFourHourSent: 0, twentyFourHourFailed: 0 };
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

  let sevenDaySent = 0;
  let sevenDayFailed = 0;
  for (const job of (sevenDayRows.data ?? []) as ReminderJobRow[]) {
    try {
      const ok = await sendReminder({ kind: "7day", job, appBaseUrl, tiers });
      if (ok) {
        await supabase.from("jobs").update({ reminder_7day_sent_at: new Date().toISOString() }).eq("id", job.id);
        sevenDaySent++;
      } else {
        sevenDayFailed++;
      }
    } catch (err) {
      // One bad row must never abort the rest of the batch.
      console.error("pre-visit-reminders: unexpected error (7-day)", job.id, err);
      sevenDayFailed++;
    }
  }

  let twentyFourHourSent = 0;
  let twentyFourHourFailed = 0;
  for (const job of (oneDayRows.data ?? []) as ReminderJobRow[]) {
    try {
      const ok = await sendReminder({ kind: "24hr", job, appBaseUrl, tiers });
      if (ok) {
        await supabase.from("jobs").update({ reminder_24hr_sent_at: new Date().toISOString() }).eq("id", job.id);
        twentyFourHourSent++;
      } else {
        twentyFourHourFailed++;
      }
    } catch (err) {
      console.error("pre-visit-reminders: unexpected error (24hr)", job.id, err);
      twentyFourHourFailed++;
    }
  }

  return { sevenDaySent, sevenDayFailed, twentyFourHourSent, twentyFourHourFailed };
}
