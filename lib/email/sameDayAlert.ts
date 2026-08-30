import { createAdminClient } from "@/lib/supabase/admin";
import { getSettings } from "@/lib/settings";
import { getResend } from "@/lib/email/resend";
import { renderEmail, detailsTable, escapeHtml } from "@/lib/email/shell";
import { arrivalBlockLabel } from "@/lib/schedule/blocks";
import { formatVisitDate } from "@/lib/format";
import type { BuiltEmail } from "@/lib/email/types";

type JobRow = {
  id: string;
  scheduled_date: string;
  arrival_block: number;
  property: Prop | Prop[] | null;
};
type Prop = {
  id: string;
  address: string;
  ice_maker_brand: string | null;
  ice_maker_model: string | null;
  customer: { full_name: string | null; phone: string | null } | null;
};

function flatten<T>(v: T | T[] | null | undefined): T | null {
  return Array.isArray(v) ? v[0] ?? null : v ?? null;
}

async function loadJob(jobId: string): Promise<JobRow | null> {
  const { data, error } = await createAdminClient()
    .from("jobs")
    .select(
      "id, scheduled_date, arrival_block, " +
        "property:properties(id, address, ice_maker_brand, ice_maker_model, customer:customers(full_name, phone))"
    )
    .eq("id", jobId)
    .single();
  if (error || !data) return null;
  return data as unknown as JobRow;
}

// Build the owner alert for a same-day booking. `to` is settings.business_email
// (may be missing — the caller handles the backstop).
export async function buildSameDayBookingAlert(
  jobId: string
): Promise<
  | (Omit<BuiltEmail, "to"> & { to: string | null; propertyId: string | null })
  | { error: string }
> {
  const job = await loadJob(jobId);
  if (!job) return { error: `job not found: ${jobId}` };

  const settings = await getSettings();
  const property = flatten(job.property);
  const customer = flatten(property?.customer);

  const windowLabel = arrivalBlockLabel(job.arrival_block);
  const dateLong = formatVisitDate(job.scheduled_date, { withYear: true });
  const iceMaker =
    [property?.ice_maker_brand, property?.ice_maker_model].filter(Boolean).join(" ") || "—";

  const rows = [
    { label: "Date", value: dateLong },
    { label: "Arrival window", value: windowLabel },
    { label: "Customer", value: customer?.full_name?.trim() || "—" },
    { label: "Phone", value: customer?.phone || "—" },
    { label: "Address", value: property?.address || "—" },
    { label: "Ice maker", value: iceMaker },
  ];

  const html = renderEmail({
    title: "Same-day booking",
    preheader: `${windowLabel} today — ${property?.address ?? ""}`,
    inner: `
      <p style="margin:0 0 4px;font-size:16px;font-weight:700;">New same-day booking</p>
      <p style="margin:0 0 12px;color:#5b6470;">Booked just now for <strong>${escapeHtml(windowLabel)}</strong> today.</p>
      ${detailsTable(rows)}
    `,
  });

  const text = [
    `NEW SAME-DAY BOOKING`,
    ``,
    ...rows.map((r) => `${(r.label + ":").padEnd(16)}${r.value}`),
    ``,
    `— Uinta Ice Co booking site`,
  ].join("\n");

  return {
    to: settings.business_email,
    propertyId: property?.id ?? null,
    subject: `Same-day booking — ${windowLabel} today (${customer?.full_name?.trim() || property?.address || "new"})`,
    html,
    text,
  };
}

// Alerts the owner the moment a job is booked for TODAY. If there's no
// recipient or the send fails, flag the property needs_followup as a backstop.
// Never throws.
export async function sendSameDayBookingAlert(
  jobId: string,
  opts?: { overrideTo?: string }
): Promise<void> {
  try {
    const built = await buildSameDayBookingAlert(jobId);
    if ("error" in built) {
      console.error("sendSameDayBookingAlert:", built.error, { jobId });
      return;
    }

    const recipient = opts?.overrideTo ?? built.to;
    const resend = getResend();

    if (!recipient || !resend) {
      console.error(
        "sendSameDayBookingAlert: no recipient (settings.business_email) or Resend not configured — flagging needs_followup",
        { jobId, hasRecipient: !!recipient, hasResend: !!resend }
      );
      await flagNeedsFollowup(built.propertyId);
      return;
    }

    const { error } = await resend.client.emails.send({
      from: resend.from,
      to: recipient,
      subject: built.subject,
      html: built.html,
      text: built.text,
    });

    if (error) {
      console.error("sendSameDayBookingAlert: Resend send failed — flagging needs_followup", error, { jobId });
      await flagNeedsFollowup(built.propertyId);
    }
  } catch (err) {
    console.error("sendSameDayBookingAlert: unexpected error", err, { jobId });
  }
}

async function flagNeedsFollowup(propertyId: string | null): Promise<void> {
  if (!propertyId) return;
  try {
    await createAdminClient()
      .from("properties")
      .update({ needs_followup: true })
      .eq("id", propertyId);
  } catch (err) {
    console.error("sendSameDayBookingAlert: failed to set needs_followup backstop", err, { propertyId });
  }
}
