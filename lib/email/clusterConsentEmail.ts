import { getEmailBrand } from "@/lib/email/brand";
import { businessDb } from "@/lib/tenant/business";
import { getResend } from "@/lib/email/resend";
import { renderEmail, detailsTable, buttonRow, escapeHtml } from "@/lib/email/shell";
import { arrivalBlockLabel } from "@/lib/schedule/blocks";
import { formatVisitDate } from "@/lib/format";
import { addDaysToISODate, todayISODate } from "@/lib/time/zone";
import { businessTz } from "@/lib/tenant/business";
import { getAppBaseUrl } from "@/lib/url";

type Cust = { full_name: string | null; email: string | null };
type Prop = { address: string; customer: Cust | Cust[] | null };
type JobRow = { blocks_needed: number; property: Prop | Prop[] | null };
type Row = {
  id: string;
  consent_token: string | null;
  consent_deadline: string | null;
  original_scheduled_date: string;
  original_arrival_block: number;
  proposed_scheduled_date: string;
  proposed_arrival_block: number;
  job: JobRow | JobRow[] | null;
};

function flatten<T>(v: T | T[] | null | undefined): T | null {
  return Array.isArray(v) ? (v[0] ?? null) : (v ?? null);
}

// A geographic-clustering suggestion for an ALREADY-scheduled job — a
// genuinely new email primitive, distinct from every ConfirmationVariant in
// bookingConfirmation.ts (those all confirm a change that already happened;
// this one ASKS). Wording is explicit that Uinta Ice is proposing this, not
// the customer, and that declining carries no consequence — per spec, this
// must never read as if the customer requested or already agreed to it.
export async function sendClusterConsentEmail(clusterSuggestionJobId: string): Promise<boolean> {
  const brand = await getEmailBrand();
  try {
    const supabase = businessDb();
    const { data, error } = await supabase
      .from("cluster_suggestion_jobs")
      .select(
        "id, consent_token, consent_deadline, original_scheduled_date, original_arrival_block, " +
          "proposed_scheduled_date, proposed_arrival_block, " +
          "job:jobs(blocks_needed, property:properties(address, customer:customers(full_name, email)))"
      )
      .eq("id", clusterSuggestionJobId)
      .single();

    if (error || !data) {
      console.error("sendClusterConsentEmail: row not found", clusterSuggestionJobId, error);
      return false;
    }
    const row = data as unknown as Row;
    if (!row.consent_token) {
      console.error("sendClusterConsentEmail: consent_token not set", clusterSuggestionJobId);
      return false;
    }
    const job = flatten(row.job);
    const property = flatten(job?.property);
    const customer = flatten(property?.customer);
    if (!customer?.email) {
      console.error("sendClusterConsentEmail: customer has no email", clusterSuggestionJobId);
      return false;
    }

    const resend = await getResend();
    if (!resend) {
      console.error("sendClusterConsentEmail: Resend not configured", clusterSuggestionJobId);
      return false;
    }

    const blocksNeeded = job?.blocks_needed ?? 1;
    const baseUrl = await getAppBaseUrl();
    const consentUrl = `${baseUrl}/cluster-consent/${row.consent_token}`;
    const name = customer.full_name?.trim() || "there";

    const originalLabel = `${formatVisitDate(row.original_scheduled_date, { withYear: true })}, ${arrivalBlockLabel(row.original_arrival_block, blocksNeeded)}`;
    const proposedLabel = `${formatVisitDate(row.proposed_scheduled_date, { withYear: true })}, ${arrivalBlockLabel(row.proposed_arrival_block, blocksNeeded)}`;

    let deadlineText = "";
    if (row.consent_deadline) {
      const deadlineDate = todayISODate(await businessTz(), new Date(row.consent_deadline));
      const respondByDate = addDaysToISODate(deadlineDate, -1);
      deadlineText = `Please let us know by end of day, ${formatVisitDate(respondByDate)} — after that, we'll keep your original time.`;
    }

    const inner = `
      <p style="margin:0 0 12px;">Hi ${escapeHtml(name)},</p>
      <p style="margin:0 0 4px;font-size:16px;font-weight:700;">We have a suggestion for your visit.</p>
      <p style="margin:0 0 12px;color:#5b6470;">
        We&rsquo;ll already be near you around a different time, and moving your visit would let us
        get to you more efficiently. This is just a suggestion from us &mdash; entirely your call, and
        declining is completely fine, no consequence either way.
      </p>
      ${detailsTable([
        { label: "Current visit", value: originalLabel },
        { label: "Suggested visit", value: proposedLabel },
      ])}
      ${deadlineText ? `<p style="margin:0 0 12px;color:#5b6470;font-size:13px;">${escapeHtml(deadlineText)}</p>` : ""}
      ${buttonRow(consentUrl, "Review this suggestion", brand.accent)}
    `;

    const html = renderEmail({
    brand,
      title: `A scheduling suggestion from ${brand.name}`,
      preheader: `We have a suggestion for your ${formatVisitDate(row.original_scheduled_date)} visit`,
      inner,
    });

    const text = [
      `Hi ${name},`,
      ``,
      `We have a suggestion for your visit — entirely your call, no consequence either way if you'd rather keep it as-is.`,
      ``,
      `Current visit:   ${originalLabel}`,
      `Suggested visit: ${proposedLabel}`,
      ``,
      ...(deadlineText ? [deadlineText, ``] : []),
      `Review: ${consentUrl}`,
      ``,
      `— ${brand.name}`,
    ].join("\n");

    const { error: sendError } = await resend.client.emails.send({
      from: resend.from,
      to: customer.email,
      subject: `A scheduling suggestion for your ${brand.name} visit`,
      html,
      text,
    });

    if (sendError) {
      console.error("sendClusterConsentEmail: Resend send failed", sendError, clusterSuggestionJobId);
      return false;
    }
    return true;
  } catch (err) {
    console.error("sendClusterConsentEmail: unexpected error", err, clusterSuggestionJobId);
    return false;
  }
}
