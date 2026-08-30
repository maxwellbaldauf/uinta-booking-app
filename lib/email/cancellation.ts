import { createAdminClient } from "@/lib/supabase/admin";
import { getSettings } from "@/lib/settings";
import { getResend } from "@/lib/email/resend";
import { renderEmail, detailsTable, escapeHtml } from "@/lib/email/shell";
import { buildBookingIcs } from "@/lib/ics";
import { arrivalBlockLabel, ARRIVAL_BLOCKS } from "@/lib/schedule/blocks";
import { formatVisitDate } from "@/lib/format";
import { denverLocalToUtc } from "@/lib/time/denver";
import type { BuiltEmail } from "@/lib/email/types";

type JobRow = {
  id: string;
  scheduled_date: string;
  arrival_block: number;
  property:
    | { address: string; customer: Cust | null }
    | { address: string; customer: Cust | null }[]
    | null;
};
type Cust = { full_name: string | null; email: string | null };

function flatten<T>(v: T | T[] | null | undefined): T | null {
  return Array.isArray(v) ? v[0] ?? null : v ?? null;
}

// Confirms a magic-link cancellation (spec §3). Includes a METHOD:CANCEL .ics so
// the visit drops off the customer's calendar. Payment method stays on file
// regardless — this email doesn't touch it.
export async function buildCancellationEmail(
  jobId: string,
  opts: { planCancelled: boolean }
): Promise<BuiltEmail | { error: string }> {
  const supabase = createAdminClient();
  const { data, error } = await supabase
    .from("jobs")
    .select("id, scheduled_date, arrival_block, property:properties(address, customer:customers(full_name, email))")
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
  const address = property?.address ?? "";
  const name = customer.full_name?.trim() || "there";

  const start = block ? denverLocalToUtc(job.scheduled_date, block.startsAt) : new Date();
  const end = block ? denverLocalToUtc(job.scheduled_date, block.endsAt) : new Date();
  const ics = buildBookingIcs({
    uid: `job-${job.id}@uintaice.com`,
    start,
    end,
    summary: "Uinta Ice Co — ice machine cleaning",
    description: "This visit was cancelled.",
    location: address,
    organizerEmail: settings.business_email,
    organizerName: settings.business_name,
    cancelled: true,
    sequence: Math.floor(Date.now() / 60000),
  });

  const planLine = opts.planCancelled
    ? `<p style="margin:12px 0 0;color:#5b6470;">We&rsquo;ve also stopped the semi-annual plan for this property. Your card stays on file — no charge.</p>`
    : `<p style="margin:12px 0 0;color:#5b6470;">Your plan for this property is still active; the next visit will schedule as normal. Your card stays on file.</p>`;

  const inner = `
    <p style="margin:0 0 12px;">Hi ${escapeHtml(name)},</p>
    <p style="margin:0 0 4px;font-size:16px;font-weight:700;">Your visit has been cancelled.</p>
    ${detailsTable([
      { label: "Was", value: `${dateLong}, ${windowLabel}` },
      { label: "Address", value: address },
    ])}
    ${planLine}
  `;

  const html = renderEmail({
    title: "Your Uinta Ice Co visit was cancelled",
    preheader: `Cancelled — ${dateLong}, ${windowLabel}`,
    inner,
  });

  const text = [
    `Hi ${name},`,
    ``,
    `Your Uinta Ice Co visit has been cancelled.`,
    ``,
    `Was:      ${dateLong}, ${windowLabel}`,
    `Address:  ${address}`,
    ``,
    opts.planCancelled
      ? `We've also stopped the semi-annual plan for this property. Your card stays on file — no charge.`
      : `Your plan for this property is still active; the next visit will schedule as normal. Your card stays on file.`,
    ``,
    `— Uinta Ice Co`,
  ].join("\n");

  return {
    to: customer.email,
    replyTo: settings.business_email ?? undefined,
    subject: `Your Uinta Ice Co visit was cancelled — ${formatVisitDate(job.scheduled_date)}`,
    html,
    text,
    attachments: [{ filename: "uinta-ice-visit.ics", content: Buffer.from(ics, "utf-8") }],
  };
}

export async function sendCancellationEmail(
  jobId: string,
  opts: { planCancelled: boolean; overrideTo?: string }
): Promise<boolean> {
  try {
    const resend = getResend();
    if (!resend) {
      console.error("sendCancellationEmail: Resend not configured", { jobId });
      return false;
    }
    const built = await buildCancellationEmail(jobId, { planCancelled: opts.planCancelled });
    if ("error" in built) {
      console.error("sendCancellationEmail:", built.error, { jobId });
      return false;
    }
    const { error } = await resend.client.emails.send({
      from: resend.from,
      to: opts.overrideTo ?? built.to,
      ...(built.replyTo ? { replyTo: built.replyTo } : {}),
      subject: built.subject,
      html: built.html,
      text: built.text,
      attachments: built.attachments,
    });
    if (error) {
      console.error("sendCancellationEmail: Resend send failed", error, { jobId });
      return false;
    }
    return true;
  } catch (err) {
    console.error("sendCancellationEmail: unexpected error", err, { jobId });
    return false;
  }
}
