import { headers } from "next/headers";
import { after } from "next/server";
import { getEmailBrand } from "@/lib/email/brand";
import { getResend } from "@/lib/email/resend";
import { renderEmail, detailsTable, buttonRow, escapeHtml } from "@/lib/email/shell";
import { getSettings } from "@/lib/settings";
import { businessDb, currentBusinessId } from "@/lib/tenant/business";
import { LEAD_DEDUP_WINDOW_MS } from "@/lib/chat/config";
import { allowLeadWrite, clientIpFromHeaders } from "@/lib/chat/rateLimit";

export type LeadAlertKind =
  | "contact_form"
  | "chat"
  | "out_of_area"
  | "no_availability"
  | "saw_times";

const KIND_LABEL: Record<LeadAlertKind, string> = {
  contact_form: "contact form",
  chat: "AI chat",
  out_of_area: "booking, outside service area",
  no_availability: "booking, no open times",
  saw_times: "booking, saw open times",
};

export type LeadAlertInput = {
  kind: LeadAlertKind;
  customerId: string;
  name: string | null;
  email: string | null;
  phone: string | null;
  address?: string | null;
  city?: string | null;
  message?: string | null;
  // The contact_submissions row that was just written, so the DB dedup check
  // doesn't count it as the earlier alert.
  submissionId?: string | null;
  // True (or a function resolving to true) when the person already matched a
  // real customer (a paying or archived record), so the owner isn't told "new
  // lead" about a current customer. A function runs only after the dedup check,
  // so a suppressed alert costs no extra lookup.
  existingCustomer?: boolean | (() => Promise<boolean>);
};

const MAX_MESSAGE = 1500;

// Per-instance record of customers alerted inside the dedup window. Covers the
// booking leads, which write no contact_submissions row to look back at.
// Best-effort across serverless instances, like the chat rate limiter.
const STORE = Symbol.for("uinta.leadAlert.recent");
const g = globalThis as typeof globalThis & { [STORE]?: Map<string, number> };
const recent: Map<string, number> = (g[STORE] ??= new Map());

function claim(key: string): boolean {
  const now = Date.now();
  for (const [k, at] of recent) if (now - at >= LEAD_DEDUP_WINDOW_MS) recent.delete(k);
  if (recent.has(key)) return false;
  recent.set(key, now);
  return true;
}

// True when another contact submission for this customer exists inside the
// window, i.e. the owner was already told. Fails open: a missed dedup is better
// than a dropped alert.
async function hasEarlierSubmission(customerId: string, exceptId: string | null | undefined): Promise<boolean> {
  try {
    const since = new Date(Date.now() - LEAD_DEDUP_WINDOW_MS).toISOString();
    const { data, error } = await businessDb()
      .from("contact_submissions")
      .select("id, created_at")
      .eq("customer_id", customerId)
      .gte("created_at", since)
      .order("created_at", { ascending: false })
      .limit(20);
    if (error) {
      console.error("sendLeadAlert: dedup check failed", error);
      return false;
    }
    const rows = (data ?? []) as { id: string; created_at: string }[];
    const mine = rows.find((r) => r.id === exceptId);
    // Only a row that came BEFORE this one counts, with the id breaking exact
    // ties. Two near-simultaneous submissions then pick one winner instead of
    // each suppressing the other.
    return rows.some(
      (r) =>
        r.id !== exceptId &&
        (!mine || r.created_at < mine.created_at || (r.created_at === mine.created_at && r.id < mine.id))
    );
  } catch (err) {
    console.error("sendLeadAlert: dedup check threw", err);
    return false;
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
    // Throw (the caller logs it and releases the dedup claim) so a later lead
    // can still alert once the configuration is fixed.
    throw new Error(
      `no recipient (settings.business_email) or Resend not configured (hasRecipient=${!!to}, hasResend=${!!resend})`
    );
  }

  const brand = await getEmailBrand();
  const label = KIND_LABEL[input.kind];
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
}

// Tells the owner a lead just came in. Never throws, and a slow or failing
// email can't fail or delay lead capture: inside a request it runs via after()
// (after the response); outside one it waits at most `capMs`. Skips a customer
// already alerted within the dedup window.
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
    let key: string | null = null;
    try {
      // Message leads (form, chat) and booking leads dedup separately, so a
      // booking-funnel alert never swallows a later message from the same person.
      const group = input.kind === "contact_form" || input.kind === "chat" ? "message" : "booking";
      const claimKey = `${currentBusinessId()}|${group}|${input.customerId}`;
      if (!claim(claimKey)) return;
      key = claimKey;
      // Without this lead's own submission id the check could count the row
      // just written as an earlier alert and suppress every alert, so skip it.
      if (
        (input.kind === "contact_form" || input.kind === "chat") &&
        input.submissionId &&
        (await hasEarlierSubmission(input.customerId, input.submissionId))
      ) {
        return;
      }
      // "unknown" is the shared no-header bucket; capping it would throttle
      // every genuine lead, so only a real client IP is budgeted.
      if (ip && ip !== "unknown" && !allowLeadWrite(ip, "alert")) {
        console.warn("sendLeadAlert: per-IP alert budget exceeded, email skipped", { kind: input.kind });
        recent.delete(claimKey); // nothing was sent, so this customer isn't "alerted"
        return;
      }
      await deliver(input);
    } catch (err) {
      if (key) recent.delete(key); // nothing was sent, so a retry may alert
      console.error("sendLeadAlert: failed", err, { customerId: input.customerId, kind: input.kind });
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
