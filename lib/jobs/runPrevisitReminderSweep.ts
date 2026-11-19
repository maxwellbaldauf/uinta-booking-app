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
import { businessDb, businessTz } from "../tenant/business";
import { getEmailBrand, type EmailBrand } from "../email/brand";
import { todayISODate, addDaysToISODate } from "../time/zone";
import { getSettings } from "../settings";
import { getEffectivePriceCents } from "../pricing";
import { arrivalBlockLabel } from "../schedule/blocks";
import { formatVisitDate } from "../format";
import { renderEmail, detailsTable, buttonRow, escapeHtml } from "../email/shell";
import { getResend } from "../email/resend";
import { loadRecipients, deliverToRecipients, toOutcome } from "../email/recipients";
import { getStripe } from "../stripe/client";
import { newPaymentSetupToken, expiresInDays } from "../tokens";

export type ReminderJobRow = {
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
export type SweepCustomer = {
  id: string;
  full_name: string | null;
  email: string | null;
  payment_mode: string | null;
  stripe_customer_id: string | null;
  default_payment_method_id: string | null;
  payment_setup_token: string | null;
  payment_setup_token_expires_at: string | null;
};
type ReminderProperty = {
  address: string;
  service_interval_months: number | null;
  service_type: "residential" | "commercial";
  custom_price_cents: number | null;
  customer: SweepCustomer | SweepCustomer[] | null;
};

function flatten<T>(v: T | T[] | null | undefined): T | null {
  return Array.isArray(v) ? v[0] ?? null : v ?? null;
}

const JOB_COLUMNS =
  "id, scheduled_date, arrival_block, blocks_needed, access_token, quoted_price_cents, property:properties(address, service_interval_months, service_type, custom_price_cents, customer:customers(id, full_name, email, payment_mode, stripe_customer_id, default_payment_method_id, payment_setup_token, payment_setup_token_expires_at))";

// The 30-day heads-up is for annual service only: a property on the 12-month interval.
export function selectAnnualJobs(jobs: ReminderJobRow[]): ReminderJobRow[] {
  return jobs.filter((j) => flatten(j.property)?.service_interval_months === 12);
}

export type ReminderKind = "30day" | "7day" | "24hr";

// Annual service: the 30-day heads-up. If the saved card will have expired by the visit date,
// returns a link to update it (the existing /pay/[token] card page, with a token minted or
// reused here); null when no link is needed (or Stripe could not be read - the email still goes).
export async function expiringCardUpdateLink(
  customer: SweepCustomer,
  visitDate: string,
  appBaseUrl: string,
  // Injectable so the expiry rule can be checked without a Stripe call.
  retrieve?: (id: string) => Promise<{ card?: { exp_year: number; exp_month: number; brand: string; last4: string } | null }>
): Promise<{ link: string; label: string } | null> {
  if (customer.payment_mode === "one_time_link" || !customer.default_payment_method_id) return null;
  try {
    const pm = await (retrieve ? retrieve(customer.default_payment_method_id) : getStripe().paymentMethods.retrieve(customer.default_payment_method_id));
    const card = pm.card;
    if (!card) return null;
    const validThrough = `${card.exp_year}-${String(card.exp_month).padStart(2, "0")}`; // good through the end of this month
    if (visitDate.slice(0, 7) <= validThrough) return null;
    const live = customer.payment_setup_token && customer.payment_setup_token_expires_at && new Date(customer.payment_setup_token_expires_at).getTime() > Date.now() + 7 * 86400000;
    let token = customer.payment_setup_token;
    if (!live || !token) {
      token = newPaymentSetupToken();
      const { error } = await businessDb().from("customers").update({ payment_setup_token: token, payment_setup_token_expires_at: expiresInDays(45) }).eq("id", customer.id);
      if (error) {
        console.error("pre-visit-reminders: could not mint a card-update token", error, { customerId: customer.id });
        return null;
      }
    }
    return { link: `${appBaseUrl}/pay/${token}`, label: `${card.brand.charAt(0).toUpperCase()}${card.brand.slice(1)} •••• ${card.last4}` };
  } catch (err) {
    console.error("pre-visit-reminders: card expiry check failed (sending without it)", err, { customerId: customer.id });
    return null;
  }
}

// The email's content, separate from sending so it can be checked without sending anything.
export function buildReminderContent(params: {
  kind: ReminderKind;
  job: ReminderJobRow;
  appBaseUrl: string;
  tiers: { basePriceCents: number; commercialPriceCents: number };
  brand: EmailBrand;
  cardUpdate: { link: string; label: string } | null;
}): { subject: string; html: string; text: string } | null {
  const { brand, cardUpdate } = params;
  const property = flatten(params.job.property);
  const customer = flatten(property?.customer);
  if (!customer || !property) return null;

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
    params.kind === "30day"
      ? "Your annual cleaning is coming up in about a month."
      : params.kind === "7day"
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
    ${buttonRow(manageUrl, params.kind === "30day" ? "Manage this visit" : "Reschedule", brand.accent)}
    ${
      cardUpdate
        ? `<p style="margin:16px 0 8px;color:#5b6470;">The card we have on file (${escapeHtml(cardUpdate.label)}) expires before this visit. To avoid a failed payment afterwards, please update it:</p>${buttonRow(cardUpdate.link, "Update my card", brand.accent)}`
        : ""
    }
  `;

  const html = renderEmail({
    brand,
    title: `${brand.name} — ${headline}`,
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
    `${params.kind === "30day" ? "Manage this visit" : "Reschedule"}: ${manageUrl}`,
    ...(cardUpdate
      ? [``, `The card we have on file (${cardUpdate.label}) expires before this visit. Please update it: ${cardUpdate.link}`]
      : []),
    ``,
    `— ${brand.name}`,
  ].join("\n");
  const subject =
    params.kind === "30day"
      ? `Heads-up: your annual visit is ${dateLong}`
      : params.kind === "7day"
        ? `Reminder: your visit is ${dateLong}`
        : `Reminder: your visit is tomorrow — ${dateLong}`;
  return { subject, html, text };
}

async function sendReminder(params: {
  kind: ReminderKind;
  job: ReminderJobRow;
  appBaseUrl: string;
  tiers: { basePriceCents: number; commercialPriceCents: number };
}): Promise<boolean> {
  let brand: EmailBrand;
  try {
    brand = await getEmailBrand();
  } catch (err) {
    // Same log-and-return-false contract as every other failure here.
    console.error("pre-visit-reminders sendReminder: business lookup failed", err);
    return false;
  }
  const property = flatten(params.job.property);
  const customer = flatten(property?.customer);
  if (!customer?.email || !property) return false;

  const cardUpdate = params.kind === "30day" ? await expiringCardUpdateLink(customer, params.job.scheduled_date, params.appBaseUrl) : null;
  const built = buildReminderContent({ ...params, brand, cardUpdate });
  if (!built) return false;
  const { subject, html, text } = built;

  const resend = await getResend();
  if (!resend) {
    console.error("pre-visit-reminders: Resend not configured");
    return false;
  }

  // The business's reply-to (its own address; Uinta falls back to its settings'
  // business_email, like every other customer email). Best-effort: a settings
  // hiccup must not stop the reminder.
  const replyTo = brand.replyTo ?? (await getSettings().catch(() => null))?.business_email ?? null;

  // One SEPARATE reminder per address (main + additional emails). The job's sent-at stamp is
  // written only when EVERY address is delivered; a retry skips addresses already delivered
  // (email_deliveries), so nobody gets a duplicate.
  const supabase = businessDb();
  const recipients = await loadRecipients(supabase, customer.id, customer.email);
  const result = await deliverToRecipients({
    supabase,
    kind: params.kind === "30day" ? "reminder_30day" : params.kind === "7day" ? "reminder_7day" : "reminder_24hr",
    refId: params.job.id,
    // Keyed by the visit date: a reschedule resets the sent-at stamps and must get fresh reminders.
    logKey: params.job.scheduled_date,
    recipients,
    fresh: false,
    send: async (r) => {
      const res = await resend.client.emails.send({
        from: resend.from,
        ...(replyTo ? { replyTo } : {}),
        to: r.email,
        subject,
        html,
        text,
      });
      return toOutcome(res);
    },
  });
  if (!result.settled) {
    console.error("pre-visit-reminders: the main address was not delivered or a send is still pending", { jobId: params.job.id, kind: params.kind, failed: result.failed });
  }
  return result.settled;
}

export type PrevisitReminderSweepResult = {
  thirtyDaySent: number;
  thirtyDayFailed: number;
  sevenDaySent: number;
  sevenDayFailed: number;
  twentyFourHourSent: number;
  twentyFourHourFailed: number;
};

const REMINDER_COLUMN: Record<ReminderKind, "reminder_30day_sent_at" | "reminder_7day_sent_at" | "reminder_24hr_sent_at"> = {
  "30day": "reminder_30day_sent_at",
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
  supabase: ReturnType<typeof businessDb>,
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
  const empty = { thirtyDaySent: 0, thirtyDayFailed: 0, sevenDaySent: 0, sevenDayFailed: 0, twentyFourHourSent: 0, twentyFourHourFailed: 0 };

  try {
    const supabase = businessDb();
    const today = todayISODate(await businessTz());

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

    const thirtyDayTarget = addDaysToISODate(today, 30);
    const sevenDayTarget = addDaysToISODate(today, 7);
    const oneDayTarget = addDaysToISODate(today, 1);

    const [thirtyDayRows, sevenDayRows, oneDayRows] = await Promise.all([
      // Annual service only (filtered to 12-month properties below); never sends twice (own sent-at stamp).
      supabase
        .from("jobs")
        .select(JOB_COLUMNS)
        .eq("status", "scheduled")
        .eq("scheduled_date", thirtyDayTarget)
        .is("reminder_30day_sent_at", null),
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

    if (thirtyDayRows.error) console.error("pre-visit-reminders: 30-day query failed", thirtyDayRows.error);
    if (sevenDayRows.error) console.error("pre-visit-reminders: 7-day query failed", sevenDayRows.error);
    if (oneDayRows.error) console.error("pre-visit-reminders: 24hr query failed", oneDayRows.error);

    const annualJobs = selectAnnualJobs((thirtyDayRows.data ?? []) as ReminderJobRow[]);
    const [thirtyDay, sevenDay, twentyFourHour] = await Promise.all([
      processReminderBatch(annualJobs, "30day", supabase, appBaseUrl, tiers),
      processReminderBatch((sevenDayRows.data ?? []) as ReminderJobRow[], "7day", supabase, appBaseUrl, tiers),
      processReminderBatch((oneDayRows.data ?? []) as ReminderJobRow[], "24hr", supabase, appBaseUrl, tiers),
    ]);

    return {
      thirtyDaySent: thirtyDay.sent,
      thirtyDayFailed: thirtyDay.failed,
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
