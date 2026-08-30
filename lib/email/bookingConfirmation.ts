import { createAdminClient } from "@/lib/supabase/admin";
import { getSettings, formatUsd } from "@/lib/settings";
import { getResend } from "@/lib/email/resend";
import { renderEmail, detailsTable, buttonRow, escapeHtml } from "@/lib/email/shell";
import { buildBookingIcs } from "@/lib/ics";
import { arrivalBlockLabel, ARRIVAL_BLOCKS } from "@/lib/schedule/blocks";
import { formatVisitDate } from "@/lib/format";
import { denverLocalToUtc } from "@/lib/time/denver";
import type { BuiltEmail } from "@/lib/email/types";

type JobRow = {
  id: string;
  scheduled_date: string;
  arrival_block: number;
  quoted_price_cents: number | null;
  access_token: string | null;
  property:
    | { address: string; customer: Cust | null }
    | { address: string; customer: Cust | null }[]
    | null;
};
type Cust = { full_name: string | null; email: string | null };

function flatten<T>(v: T | T[] | null | undefined): T | null {
  return Array.isArray(v) ? v[0] ?? null : v ?? null;
}

export type ConfirmationVariant = "new" | "rescheduled";

// Assemble the confirmation email (spec §8.1): date, arrival window, address,
// price, magic link, .ics invite. Split from the send so it can be previewed.
// `variant: "rescheduled"` re-sends after a magic-link reschedule — same
// content, updated heading, and an .ics SEQUENCE bump so calendars replace the
// existing entry rather than add a duplicate (stable UID does the matching).
export async function buildBookingConfirmationEmail(
  jobId: string,
  opts?: { variant?: ConfirmationVariant }
): Promise<BuiltEmail | { error: string }> {
  const variant: ConfirmationVariant = opts?.variant ?? "new";
  const supabase = createAdminClient();
  const { data, error } = await supabase
    .from("jobs")
    .select(
      "id, scheduled_date, arrival_block, quoted_price_cents, access_token, " +
        "property:properties(address, customer:customers(full_name, email))"
    )
    .eq("id", jobId)
    .single();

  if (error || !data) return { error: `job not found: ${error?.message ?? jobId}` };

  const job = data as unknown as JobRow;
  const property = flatten(job.property);
  const customer = flatten(property?.customer);
  if (!customer?.email) return { error: "customer has no email" };

  const settings = await getSettings();
  const block = ARRIVAL_BLOCKS.find((b) => b.index === job.arrival_block);
  const windowLabel = arrivalBlockLabel(job.arrival_block);
  const dateLong = formatVisitDate(job.scheduled_date, { withYear: true });
  const priceText = formatUsd(job.quoted_price_cents ?? settings.base_price_cents);
  const address = property?.address ?? "";
  const name = customer.full_name?.trim() || "there";

  const baseUrl = (process.env.APP_BASE_URL ?? "").replace(/\/$/, "");
  const manageUrl = job.access_token ? `${baseUrl}/visit/${job.access_token}` : baseUrl;

  const start = block ? denverLocalToUtc(job.scheduled_date, block.startsAt) : new Date();
  const end = block ? denverLocalToUtc(job.scheduled_date, block.endsAt) : new Date();
  const ics = buildBookingIcs({
    uid: `job-${job.id}@uintaice.com`,
    start,
    end,
    summary: "Uinta Ice Co — ice machine cleaning",
    description: `Arrival window ${windowLabel}. Manage this visit: ${manageUrl}`,
    location: address,
    organizerEmail: settings.business_email,
    organizerName: settings.business_name,
    // Monotonic (minutes since epoch) so a rescheduled invite always outranks
    // the previous one in calendar clients. "new" stays at 0.
    sequence: variant === "rescheduled" ? Math.floor(Date.now() / 60000) : 0,
  });

  const headline =
    variant === "rescheduled" ? "Your visit has been rescheduled." : "Your cleaning is booked.";

  const inner = `
    <p style="margin:0 0 12px;">Hi ${escapeHtml(name)},</p>
    <p style="margin:0 0 4px;font-size:16px;font-weight:700;">${escapeHtml(headline)}</p>
    <p style="margin:0 0 12px;color:#5b6470;">Your card isn&rsquo;t charged until after the visit.</p>
    ${detailsTable([
      { label: "Date", value: dateLong },
      { label: "Arrival window", value: windowLabel },
      { label: "Address", value: address },
      { label: "Price", value: `${priceText} per visit` },
    ])}
    ${buttonRow(manageUrl, "Reschedule or cancel")}
    <p style="margin:12px 0 0;color:#5b6470;font-size:13px;">An updated calendar invite is attached. Your reschedule / cancel link expires the day after the visit.</p>
  `;

  const html = renderEmail({
    title: variant === "rescheduled" ? "Your Uinta Ice Co visit was rescheduled" : "Your Uinta Ice Co cleaning is booked",
    preheader: `${dateLong}, ${windowLabel} — ${address}`,
    inner,
  });

  const text = [
    `Hi ${name},`,
    ``,
    variant === "rescheduled"
      ? `Your Uinta Ice Co visit has been rescheduled.`
      : `Your Uinta Ice Co cleaning is booked.`,
    ``,
    `Date:           ${dateLong}`,
    `Arrival window: ${windowLabel}`,
    `Address:        ${address}`,
    `Price:          ${priceText} per visit`,
    ``,
    `Reschedule or cancel: ${manageUrl}`,
    `(This link expires the day after your visit.)`,
    ``,
    `Your card isn't charged until after the visit.`,
    ``,
    `— Uinta Ice Co`,
  ].join("\n");

  return {
    to: customer.email,
    replyTo: settings.business_email ?? undefined,
    subject:
      variant === "rescheduled"
        ? `Your Uinta Ice Co visit was moved — ${formatVisitDate(job.scheduled_date)}`
        : `Your Uinta Ice Co cleaning is booked — ${formatVisitDate(job.scheduled_date)}`,
    html,
    text,
    attachments: [{ filename: "uinta-ice-visit.ics", content: Buffer.from(ics, "utf-8") }],
  };
}

// Returns true only if Resend accepted the send — the caller stamps
// confirmation_sent_at on true. Never throws.
export async function sendBookingConfirmationEmail(
  jobId: string,
  opts?: { overrideTo?: string; variant?: ConfirmationVariant }
): Promise<boolean> {
  try {
    const resend = getResend();
    if (!resend) {
      console.error("sendBookingConfirmationEmail: Resend not configured", { jobId });
      return false;
    }
    const built = await buildBookingConfirmationEmail(jobId, { variant: opts?.variant });
    if ("error" in built) {
      console.error("sendBookingConfirmationEmail:", built.error, { jobId });
      return false;
    }
    const { error } = await resend.client.emails.send({
      from: resend.from,
      to: opts?.overrideTo ?? built.to,
      ...(built.replyTo ? { replyTo: built.replyTo } : {}),
      subject: built.subject,
      html: built.html,
      text: built.text,
      attachments: built.attachments,
    });
    if (error) {
      console.error("sendBookingConfirmationEmail: Resend send failed", error, { jobId });
      return false;
    }
    return true;
  } catch (err) {
    console.error("sendBookingConfirmationEmail: unexpected error", err, { jobId });
    return false;
  }
}
