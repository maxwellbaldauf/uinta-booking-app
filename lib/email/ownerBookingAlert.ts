import { getEmailBrand, type EmailBrand } from "@/lib/email/brand";
import { businessDb, businessTz } from "@/lib/tenant/business";
import { getSettings, formatUsd } from "@/lib/settings";
import { getEffectivePriceCents } from "@/lib/pricing";
import { getResend } from "@/lib/email/resend";
import { renderEmail, detailsTable, escapeHtml } from "@/lib/email/shell";
import { arrivalBlockLabel } from "@/lib/schedule/blocks";
import { formatVisitDate } from "@/lib/format";
import { todayISODate } from "@/lib/time/zone";
import type { BuiltEmail } from "@/lib/email/types";

type JobRow = {
  id: string;
  scheduled_date: string;
  arrival_block: number;
  blocks_needed: number | null;
  quoted_price_cents: number | null;
  property: Prop | Prop[] | null;
};
type Prop = {
  id: string;
  address: string;
  customer_id: string | null;
  service_type: string | null;
  custom_price_cents: number | null;
  ice_maker_brand: string | null;
  ice_maker_model: string | null;
  customer: { full_name: string | null; phone: string | null } | null;
};

function flatten<T>(v: T | T[] | null | undefined): T | null {
  return Array.isArray(v) ? v[0] ?? null : v ?? null;
}

async function loadJob(jobId: string): Promise<JobRow | null> {
  const { data, error } = await businessDb()
    .from("jobs")
    .select(
      "id, scheduled_date, arrival_block, blocks_needed, quoted_price_cents, " +
        "property:properties(id, customer_id, address, service_type, custom_price_cents, ice_maker_brand, ice_maker_model, customer:customers(full_name, phone))"
    )
    .eq("id", jobId)
    .single();
  if (error || !data) return null;
  return data as unknown as JobRow;
}

export type OwnerAlertKind = "new" | "rescheduled";
export type OwnerAlertOpts = {
  kind?: OwnerAlertKind; // default "new"
  // Business-local "today" (YYYY-MM-DD) captured by the caller when the slot
  // was chosen, so a booking made just before midnight isn't mislabeled.
  today?: string;
  // Reschedules only: the slot the visit was moved from.
  previous?: { date: string; arrivalBlock: number; blocksNeeded: number };
};

// "Returning" = this customer has at least one OTHER non-cancelled job. A
// customers row alone isn't enough — contact-form leads and archived
// customers have one too. Best-effort: any error reads as "new".
async function hasPriorJob(customerId: string | null, jobId: string): Promise<boolean> {
  if (!customerId) return false;
  try {
    const db = businessDb();
    const { data: props } = await db.from("properties").select("id").eq("customer_id", customerId);
    const ids = (props ?? []).map((p) => (p as { id: string }).id);
    if (ids.length === 0) return false;
    const { count } = await db
      .from("jobs")
      .select("id", { count: "exact", head: true })
      .in("property_id", ids)
      .neq("id", jobId)
      .neq("status", "cancelled");
    return (count ?? 0) > 0;
  } catch {
    return false;
  }
}

// Build the owner alert for a self-serve booking (or a customer reschedule).
// Fires for every date; a visit for TODAY gets an unmissable same-day callout.
// `to` is settings.business_email (may be missing — the caller handles the
// backstop).
export async function buildOwnerBookingAlert(
  jobId: string,
  opts: OwnerAlertOpts = {}
): Promise<
  | (Omit<BuiltEmail, "to"> & { to: string | null; propertyId: string | null; sameDay: boolean })
  | { error: string }
> {
  const kind = opts.kind ?? "new";
  let brand: EmailBrand;
  try {
    brand = await getEmailBrand();
  } catch (err) {
    return { error: `business lookup failed: ${err instanceof Error ? err.message : String(err)}` };
  }
  const job = await loadJob(jobId);
  if (!job) return { error: `job not found: ${jobId}` };

  const settings = await getSettings();
  const property = flatten(job.property);
  const customer = flatten(property?.customer);

  const today = opts.today ?? todayISODate(await businessTz());
  const sameDay = job.scheduled_date === today;
  const windowLabel = arrivalBlockLabel(job.arrival_block, job.blocks_needed ?? undefined);
  const dateLong = formatVisitDate(job.scheduled_date, { withYear: true });
  const dateShort = formatVisitDate(job.scheduled_date);
  const iceMaker =
    [property?.ice_maker_brand, property?.ice_maker_model].filter(Boolean).join(" ") || "—";
  const service =
    property?.service_type === "commercial"
      ? "Commercial"
      : property?.service_type === "residential"
        ? "Residential"
        : "—";
  const price = formatUsd(
    job.quoted_price_cents ??
      getEffectivePriceCents(
        {
          service_type: property?.service_type === "commercial" ? "commercial" : "residential",
          custom_price_cents: property?.custom_price_cents ?? null,
        },
        {
          basePriceCents: settings.base_price_cents,
          commercialPriceCents: settings.commercial_price_cents,
        }
      )
  );
  const who = customer?.full_name?.trim() || property?.address || "unknown customer";
  const returning = kind === "new" ? await hasPriorJob(property?.customer_id ?? null, jobId) : null;

  const rows = [
    { label: "Customer", value: customer?.full_name?.trim() || "—" },
    ...(returning === null
      ? []
      : [{ label: "Customer type", value: returning ? "Returning customer" : "New customer" }]),
    { label: "Phone", value: customer?.phone || "—" },
    { label: "Address", value: property?.address || "—" },
    { label: "Service", value: service },
    { label: "Date", value: sameDay ? `${dateLong} (TODAY)` : dateLong },
    { label: "Arrival window", value: windowLabel },
    ...(opts.previous
      ? [
          {
            label: "Was",
            value: `${formatVisitDate(opts.previous.date, { withYear: true })}, ${arrivalBlockLabel(
              opts.previous.arrivalBlock,
              opts.previous.blocksNeeded
            )}`,
          },
        ]
      : []),
    { label: "Price", value: price },
    { label: "Ice maker", value: iceMaker },
  ];

  const noun = kind === "rescheduled" ? "Rescheduled visit" : "New booking";
  const verb = kind === "rescheduled" ? "Rescheduled by the customer to" : "Just booked for";

  const heading = sameDay ? `${noun}: SAME-DAY` : noun;
  const subline = sameDay
    ? `${verb} <strong>${escapeHtml(windowLabel)} today</strong>. This is a same-day appointment, short notice.`
    : `${verb} <strong>${escapeHtml(dateLong)}</strong>, ${escapeHtml(windowLabel)}.`;
  const sublineText = sameDay
    ? `${verb} ${windowLabel} today. This is a same-day appointment, short notice.`
    : `${verb} ${dateLong}, ${windowLabel}.`;

  const html = renderEmail({
    brand,
    title: heading,
    preheader: sameDay
      ? `SAME-DAY: ${windowLabel} today — ${property?.address ?? ""}`
      : `${dateShort}, ${windowLabel} — ${property?.address ?? ""}`,
    inner: `
      <p style="margin:0 0 4px;font-size:16px;font-weight:700;">${escapeHtml(heading)}</p>
      <p style="margin:0 0 12px;color:#5b6470;">${subline}</p>
      ${detailsTable(rows)}
    `,
  });

  const text = [
    heading.toUpperCase(),
    sublineText,
    ``,
    ...rows.map((r) => `${(r.label + ":").padEnd(16)}${r.value}`),
    ``,
    `— ${brand.name} booking site`,
  ].join("\n");

  const subject = sameDay
    ? `⚡ SAME-DAY ${kind === "rescheduled" ? "reschedule" : "booking"} — ${windowLabel} today (${who})`
    : `${kind === "rescheduled" ? "Rescheduled" : "New booking"} — ${dateShort}, ${windowLabel} (${who})`;

  return {
    to: settings.business_email,
    propertyId: property?.id ?? null,
    sameDay,
    subject,
    html,
    text,
  };
}

// Alerts the owner when a customer books (or reschedules) a visit. If there's
// no recipient or the send fails on a SAME-DAY visit, flag the property needs_followup as a
// backstop. Never throws.
export async function sendOwnerBookingAlert(
  jobId: string,
  opts: OwnerAlertOpts & { overrideTo?: string } = {}
): Promise<void> {
  try {
    const built = await buildOwnerBookingAlert(jobId, opts);
    if ("error" in built) {
      console.error("sendOwnerBookingAlert:", built.error, { jobId });
      return;
    }

    // Backstop only for same-day visits (urgent, easy to miss). For ordinary
    // bookings the visit is already on the schedule, and flagging would put
    // real booked customers in the lead/follow-up list.
    const backstopPropertyId = built.sameDay ? built.propertyId : null;
    const recipient = opts.overrideTo ?? built.to;
    const resend = await getResend();

    if (!recipient || !resend) {
      console.error(
        "sendOwnerBookingAlert: no recipient (settings.business_email) or Resend not configured — flagging needs_followup (same-day only)",
        { jobId, hasRecipient: !!recipient, hasResend: !!resend }
      );
      await flagNeedsFollowup(backstopPropertyId);
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
      console.error("sendOwnerBookingAlert: Resend send failed — flagging needs_followup (same-day only)", error, { jobId });
      await flagNeedsFollowup(backstopPropertyId);
    }
  } catch (err) {
    console.error("sendOwnerBookingAlert: unexpected error", err, { jobId });
  }
}

async function flagNeedsFollowup(propertyId: string | null): Promise<void> {
  if (!propertyId) return;
  try {
    await businessDb()
      .from("properties")
      .update({ needs_followup: true })
      .eq("id", propertyId);
  } catch (err) {
    console.error("sendOwnerBookingAlert: failed to set needs_followup backstop", err, { propertyId });
  }
}
