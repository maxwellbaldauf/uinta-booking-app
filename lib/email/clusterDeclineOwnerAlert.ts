import { createAdminClient } from "@/lib/supabase/admin";
import { getSettings } from "@/lib/settings";
import { getResend } from "@/lib/email/resend";
import { renderEmail, detailsTable } from "@/lib/email/shell";
import { formatVisitDate } from "@/lib/format";

type Cust = { full_name: string | null };
type Prop = { nickname: string | null; address: string; customer: Cust | Cust[] | null };
type JobRow = { property: Prop | Prop[] | null };

function flatten<T>(v: T | T[] | null | undefined): T | null {
  return Array.isArray(v) ? (v[0] ?? null) : (v ?? null);
}

// Sent from the customer's OWN decline action (app/cluster-consent/[token]/
// actions.ts) — this repo already has a working Resend setup, so no
// cross-repo call is needed just to alert the owner, same reasoning as
// sendSameDayBookingAlert. Kept separate from uinta-field-app's
// lib/email/clusterExpiredAlert.ts (that one fires for a silent deadline
// expiry, discovered by that repo's own nightly sweep) — different trigger,
// different repo, must never cross-wire. Returns false on any failure;
// the caller sets cluster_suggestion_jobs.owner_notify_failed as the
// backstop (this file has no direct handle on that row's id).
export async function sendClusterDeclineOwnerAlert(
  jobId: string,
  originalDate: string,
  proposedDate: string
): Promise<boolean> {
  try {
    const { data, error } = await createAdminClient()
      .from("jobs")
      .select("property:properties(nickname, address, customer:customers(full_name))")
      .eq("id", jobId)
      .single();

    if (error || !data) {
      console.error("sendClusterDeclineOwnerAlert: job not found", jobId, error);
      return false;
    }

    const job = data as unknown as JobRow;
    const property = flatten(job.property);
    const customer = flatten(property?.customer);
    const propertyLabel = property?.nickname || property?.address || "a property";

    const settings = await getSettings();
    const resend = getResend();
    if (!settings.business_email || !resend) {
      console.error(
        "sendClusterDeclineOwnerAlert: no recipient (settings.business_email) or Resend not configured",
        { jobId }
      );
      return false;
    }

    const rows = [
      { label: "Property", value: propertyLabel },
      { label: "Customer", value: customer?.full_name?.trim() || "—" },
      { label: "Original visit", value: formatVisitDate(originalDate, { withYear: true }) },
      { label: "Suggested visit", value: formatVisitDate(proposedDate, { withYear: true }) },
    ];

    const html = renderEmail({
      title: "Clustering suggestion declined",
      preheader: `${propertyLabel} — customer kept their original visit`,
      inner: `
        <p style="margin:0 0 4px;font-size:16px;font-weight:700;">Clustering suggestion declined</p>
        <p style="margin:0 0 12px;color:#5b6470;">The customer chose to keep their original visit. It won&rsquo;t be suggested again for these same dates.</p>
        ${detailsTable(rows)}
      `,
    });

    const text = [
      `CLUSTERING SUGGESTION DECLINED`,
      ``,
      ...rows.map((r) => `${(r.label + ":").padEnd(16)}${r.value}`),
      ``,
      `The customer chose to keep their original visit. It won't be suggested again for these same dates.`,
      ``,
      `— Uinta Ice Co booking site`,
    ].join("\n");

    const { error: sendError } = await resend.client.emails.send({
      from: resend.from,
      to: settings.business_email,
      subject: `Clustering suggestion declined — ${propertyLabel}`,
      html,
      text,
    });

    if (sendError) {
      console.error("sendClusterDeclineOwnerAlert: Resend send failed", sendError, { jobId });
      return false;
    }
    return true;
  } catch (err) {
    console.error("sendClusterDeclineOwnerAlert: unexpected error", err, { jobId });
    return false;
  }
}
