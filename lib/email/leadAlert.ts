import { headers } from "next/headers";
import { after } from "next/server";
import { getEmailBrand } from "@/lib/email/brand";
import { getResend } from "@/lib/email/resend";
import { renderEmail, detailsTable, buttonRow, escapeHtml } from "@/lib/email/shell";
import { getSettings } from "@/lib/settings";
import { businessDb } from "@/lib/tenant/business";
import { LEAD_DEDUP_WINDOW_MS } from "@/lib/chat/config";
import { allowLeadWrite, clientIpFromHeaders } from "@/lib/chat/rateLimit";
import type { LeadChannel } from "@/lib/leadRecord";

const CHANNEL_LABEL: Record<LeadChannel, string> = {
  contact_form: "contact form",
  ai_chat: "AI chat",
  booking_out_of_area: "booking, outside service area",
  booking_no_availability: "booking, no open times",
  booking_saw_times: "booking, saw open times",
};

// Message leads (form, chat) and booking-funnel leads dedup separately, so a
// booking alert never swallows a later message from the same person.
const MESSAGE_CHANNELS: LeadChannel[] = ["contact_form", "ai_chat"];
const BOOKING_CHANNELS: LeadChannel[] = ["booking_out_of_area", "booking_no_availability", "booking_saw_times"];

export type LeadAlertInput = {
  channel: LeadChannel;
  customerId: string;
  // This lead's row in the leads table. Null when that write failed: the alert
  // still goes out, but it can't be deduped and can't record alert_sent_at.
  leadId: string | null;
  name: string | null;
  email: string | null;
  phone: string | null;
  address?: string | null;
  city?: string | null;
  message?: string | null;
  // True (or a function resolving to true) when the person already matched a
  // real customer (a paying or archived record), so the owner isn't told "new
  // lead" about a current customer. A function runs only after the dedup check,
  // so a suppressed alert costs no extra lookup.
  existingCustomer?: boolean | (() => Promise<boolean>);
};

const MAX_MESSAGE = 1500;

// True when this customer's owner alert already went out inside the dedup
// window: another lead of the same kind (message vs booking) with alert_sent_at
// set in the last hour, newest first. Fails open: a missed dedup is better than
// a dropped alert.
async function alertedRecently(input: LeadAlertInput & { leadId: string }): Promise<boolean> {
  try {
    const since = new Date(Date.now() - LEAD_DEDUP_WINDOW_MS).toISOString();
    const group = MESSAGE_CHANNELS.includes(input.channel) ? MESSAGE_CHANNELS : BOOKING_CHANNELS;
    const { data, error } = await businessDb()
      .from("leads")
      .select("id")
      .eq("customer_id", input.customerId)
      .in("channel", group)
      .neq("id", input.leadId)
      .not("alert_sent_at", "is", null)
      .gte("alert_sent_at", since)
      .order("alert_sent_at", { ascending: false })
      .limit(1);
    if (error) {
      console.error("sendLeadAlert: dedup check failed", error);
      return false;
    }
    return (data ?? []).length > 0;
  } catch (err) {
    console.error("sendLeadAlert: dedup check threw", err);
    return false;
  }
}

// Called only after Resend accepted the email. If this write fails the owner
// WAS told, so it must not count as an alert failure; the cost is that the next
// lead inside the hour may alert again.
async function markAlertSent(leadId: string): Promise<void> {
  try {
    const { error } = await businessDb()
      .from("leads")
      .update({ alert_sent_at: new Date().toISOString() })
      .eq("id", leadId);
    if (error) console.error("sendLeadAlert: could not record alert_sent_at", error.message, { leadId });
  } catch (err) {
    console.error("sendLeadAlert: could not record alert_sent_at", err, { leadId });
  }
}

function fieldAppLink(customerId: string): string | null {
  const base = (process.env.FIELD_APP_BASE_URL ?? "").trim().replace(/\/+$/, "");
  return base ? `${base}/customers/${customerId}` : null;
}

async function deliver(input: LeadAlertInput): Promise<void> {
  const settings = await getSettings();
  const to = settings.business_email;
  const resend = await getResend();
  if (!to || !resend) {
    // Throw (the caller logs it) so alert_sent_at stays null and a later lead
    // can still alert once the configuration is fixed.
    throw new Error(
      `no recipient (settings.business_email) or Resend not configured (hasRecipient=${!!to}, hasResend=${!!resend})`
    );
  }

  const brand = await getEmailBrand();
  const label = CHANNEL_LABEL[input.channel];
  const existing =
    typeof input.existingCustomer === "function"
      ? await input.existingCustomer().catch(() => false)
      : !!input.existingCustomer;
  const who = input.name?.trim() || input.email?.trim() || input.phone?.trim() || "unknown";
  // The subject carries visitor text: strip control characters and cap the length.
  const subjectWho = who.replace(/\p{Cc}/gu, " ").replace(/\s+/g, " ").trim().slice(0, 100) || "unknown";
  const address = input.address?.trim() ?? "";
  const city = input.city?.trim() ?? "";
  // The address usually already names the city; only append it when it doesn't.
  const place = [address, city && !address.toLowerCase().includes(city.toLowerCase()) ? city : ""]
    .filter(Boolean)
    .join(", ");
  const message = (input.message ?? "").trim().slice(0, MAX_MESSAGE);
  const link = fieldAppLink(input.customerId);

  const rows = [
    { label: "Name", value: input.name?.trim() || "—" },
    { label: "Email", value: input.email?.trim() || "—" },
    { label: "Phone", value: input.phone?.trim() || "—" },
    { label: "Address", value: place || "—" },
    { label: "Lead type", value: label },
    ...(existing ? [{ label: "Customer type", value: "Existing customer" }] : []),
  ];

  const heading = existing ? "Existing customer reached out" : "New lead";
  const html = renderEmail({
    brand,
    title: heading,
    preheader: `${label}: ${who}`,
    inner: `
      <p style="margin:0 0 4px;font-size:16px;font-weight:700;">${escapeHtml(heading)}</p>
      <p style="margin:0 0 12px;color:#5b6470;">${escapeHtml(who)} just reached out. Details below.</p>
      ${detailsTable(rows)}
      ${
        message
          ? `<p style="margin:16px 0 4px;font-weight:700;">Message</p><p style="margin:0;white-space:pre-wrap;">${escapeHtml(message)}</p>`
          : ""
      }
      ${link ? buttonRow(link, "Open in the field app", brand.accent) : ""}
    `,
  });

  const text = [
    heading.toUpperCase(),
    `${who} just reached out. Details below.`,
    ``,
    ...rows.map((r) => `${(r.label + ":").padEnd(12)}${r.value}`),
    ...(message ? [``, `Message:`, message] : []),
    ...(link ? [``, `Open in the field app: ${link}`] : []),
    ``,
    `— ${brand.name} booking site`,
  ].join("\n");

  const { error } = await resend.client.emails.send({
    from: resend.from,
    to,
    subject: `${existing ? "Existing customer" : "New lead"} (${label}): ${subjectWho}`,
    html,
    text,
  });
  if (error) throw new Error(`Resend send failed: ${JSON.stringify(error)}`);

  if (input.leadId) await markAlertSent(input.leadId);
}

// Tells the owner a lead just came in. Never throws, and a slow or failing
// email can't fail or delay lead capture: inside a request it runs via after()
// (after the response); outside one it waits at most `capMs`. Skips a customer
// whose alert already went out inside the dedup window (read from the leads
// table). alert_sent_at is stamped only after the email actually sent.
export async function sendLeadAlert(input: LeadAlertInput, capMs = 1000): Promise<void> {
  // Per-IP alert budget (5/hour, own scope), so a script posting fresh emails
  // can't flood the owner's inbox or burn the shared Resend quota. The lead is
  // still saved; only the email is skipped. Read the IP here, not inside
  // after(), where request headers aren't reliably available. Outside a
  // request there is no IP and no cap.
  let ip: string | null = null;
  try {
    ip = clientIpFromHeaders(await headers());
  } catch {
    ip = null;
  }

  const run = async () => {
    try {
      // No lead id (the leads write failed): skip the lookup, alert anyway.
      if (input.leadId && (await alertedRecently({ ...input, leadId: input.leadId }))) return;
      // "unknown" is the shared no-header bucket; capping it would throttle
      // every genuine lead, so only a real client IP is budgeted.
      if (ip && ip !== "unknown" && !allowLeadWrite(ip, "alert")) {
        console.warn("sendLeadAlert: per-IP alert budget exceeded, email skipped", { channel: input.channel });
        return;
      }
      await deliver(input);
    } catch (err) {
      console.error("sendLeadAlert: failed", err, { customerId: input.customerId, channel: input.channel });
    }
  };

  // Preferred: schedule after the response is sent, so the platform keeps the
  // function alive until the email is out and the caller never waits on it.
  try {
    after(run);
    return;
  } catch {
    // Not inside a request (scripts, tests): fall back to a capped wait below.
  }

  const work = run();
  let timer: ReturnType<typeof setTimeout> | undefined;
  try {
    await Promise.race([
      work,
      new Promise<void>((resolve) => {
        timer = setTimeout(resolve, capMs);
      }),
    ]);
  } finally {
    if (timer) clearTimeout(timer);
  }
}
