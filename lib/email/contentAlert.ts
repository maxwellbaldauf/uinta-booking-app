// Owner alert when the automatic content (daily Google Business Profile posts,
// weekly /blog post) fails, so a broken Make scenario or expired Google
// connection doesn't silently stop posting. Sent to settings.business_email.
// Best-effort and never throws: an alert failure must not break the job that
// called it. At most one email per job run (callers send once per run).
//
// Relative imports only (bundled into Netlify scheduled functions).
import { getSettings } from "../settings";
import { getResend } from "./resend";
import { getEmailBrand } from "./brand";
import { renderEmail, detailsTable, escapeHtml } from "./shell";

export async function sendContentAlert(opts: {
  subject: string;
  what: string;
  rows: { label: string; value: string }[];
  fix: string;
}): Promise<boolean> {
  try {
    const [settings, resend, brand] = await Promise.all([getSettings(), getResend(), getEmailBrand()]);
    if (!settings.business_email || !resend) {
      console.error("content alert: no recipient or Resend not configured", { subject: opts.subject });
      return false;
    }
    const rows = opts.rows.map((r) => ({ label: r.label, value: r.value.slice(0, 500) }));
    const html = renderEmail({
      brand,
      title: opts.subject,
      preheader: opts.what,
      inner: `
        <p style="margin:0 0 4px;font-size:16px;font-weight:700;">${escapeHtml(opts.subject)}</p>
        <p style="margin:0 0 12px;color:#5b6470;">${escapeHtml(opts.what)}</p>
        ${detailsTable(rows)}
        <p style="margin:12px 0 0;">${escapeHtml(opts.fix)}</p>
      `,
    });
    const text = [
      opts.subject.toUpperCase(),
      "",
      opts.what,
      "",
      ...rows.map((r) => `${(r.label + ":").padEnd(14)}${r.value}`),
      "",
      opts.fix,
      "",
      `— ${brand.name} website`,
    ].join("\n");
    const { error } = await resend.client.emails.send({
      from: resend.from,
      to: settings.business_email,
      subject: opts.subject,
      html,
      text,
    });
    if (error) {
      console.error("content alert: Resend send failed", error);
      return false;
    }
    return true;
  } catch (err) {
    console.error("content alert: unexpected error", err);
    return false;
  }
}

// What to check when a Google post fails (shown in the email).
export const GBP_FIX =
  "Open Make (make.com, sign in as max@uintaice.com) → Scenarios → \"Integration Webhooks, Google Business Profile\". Make sure it is switched to Active, and if Make says the Google connection needs attention, reconnect it (Credentials → Google Business Profile → Reauthorize). Failed posts are retried automatically for 3 days.";
