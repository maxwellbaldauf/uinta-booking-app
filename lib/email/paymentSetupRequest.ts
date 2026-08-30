import { createAdminClient } from "@/lib/supabase/admin";
import { getSettings } from "@/lib/settings";
import { getResend } from "@/lib/email/resend";
import { renderEmail, buttonRow, escapeHtml } from "@/lib/email/shell";
import { getAppBaseUrl } from "@/lib/url";
import type { BuiltEmail } from "@/lib/email/types";

// "Payment setup request" email (spec §8.2) — sent to an imported customer with
// a link to /pay/[token] so they can add a card on file before their first
// charge. Built from the token (which must be current).
export async function buildPaymentSetupRequestEmail(
  token: string
): Promise<BuiltEmail | { error: string }> {
  const supabase = createAdminClient();
  const { data, error } = await supabase
    .from("customers")
    .select("full_name, email, payment_setup_token_expires_at")
    .eq("payment_setup_token", token)
    .maybeSingle();

  if (error || !data) return { error: "no customer for that payment_setup_token" };
  if (!data.email) return { error: "customer has no email" };

  const settings = await getSettings();
  const name = data.full_name?.trim() || "there";
  const link = `${getAppBaseUrl()}/pay/${token}`;

  const inner = `
    <p style="margin:0 0 12px;">Hi ${escapeHtml(name)},</p>
    <p style="margin:0 0 4px;font-size:16px;font-weight:700;">We&rsquo;re taking over your ice machine cleaning.</p>
    <p style="margin:0 0 12px;color:#5b6470;">To keep things running smoothly, add a card so we can charge you after each visit. Your card isn&rsquo;t charged now, and there&rsquo;s nothing else to do.</p>
    ${buttonRow(link, "Add my card")}
    <p style="margin:12px 0 0;color:#5b6470;font-size:13px;">This link is just for you. If the button doesn&rsquo;t work, copy this address:<br>${escapeHtml(link)}</p>
  `;

  const html = renderEmail({
    title: "Add a card for your Uinta Ice Co service",
    preheader: "Quick one-time setup — add a card on file.",
    inner,
  });

  const text = [
    `Hi ${name},`,
    ``,
    `We're taking over your ice machine cleaning service. Please add a card so`,
    `we can charge you after each visit — it isn't charged now.`,
    ``,
    `Add your card: ${link}`,
    ``,
    `— Uinta Ice Co`,
  ].join("\n");

  return {
    to: data.email,
    replyTo: settings.business_email ?? undefined,
    subject: "Add a card for your Uinta Ice Co service",
    html,
    text,
  };
}

export async function sendPaymentSetupRequestEmail(
  token: string,
  opts?: { overrideTo?: string }
): Promise<boolean> {
  try {
    const resend = getResend();
    if (!resend) {
      console.error("sendPaymentSetupRequestEmail: Resend not configured", { token: token.slice(0, 8) });
      return false;
    }
    const built = await buildPaymentSetupRequestEmail(token);
    if ("error" in built) {
      console.error("sendPaymentSetupRequestEmail:", built.error);
      return false;
    }
    const { error } = await resend.client.emails.send({
      from: resend.from,
      to: opts?.overrideTo ?? built.to,
      ...(built.replyTo ? { replyTo: built.replyTo } : {}),
      subject: built.subject,
      html: built.html,
      text: built.text,
    });
    if (error) {
      console.error("sendPaymentSetupRequestEmail: Resend send failed", error);
      return false;
    }
    return true;
  } catch (err) {
    console.error("sendPaymentSetupRequestEmail: unexpected error", err);
    return false;
  }
}
