// WHO gets each customer email — the one shared place that decides it.
//
// A customer has one main email (customers.email) and up to 3 additional emails
// (customer_extra_emails; owner-managed, email only). Emails split into two groups:
//   GROUP_A (main + every additional email): invoice + invoice reminders, payment receipt,
//     visit confirmation / reschedule / cancellation (calendar) emails, pre-visit reminders.
//   anything else (agreement link, card setup, pay-by-link request, cluster consent, lead
//     replies, marketing…): the main email ONLY — those never call loadRecipients with extras.
// Each recipient gets a SEPARATE email (never a shared To line), and every send is logged per
// recipient in email_deliveries, so a retry skips addresses that already succeeded and a
// failure is recorded where the owner can see it.
//
// Relative imports only: reachable from the Netlify invoice-reminder function.
import type { ScopedAdmin } from "../tenant/scoped";

export const GROUP_A_KINDS = [
  "invoice",
  "invoice_reminder",
  "receipt",
  "booking_confirmation",
  "cancellation",
  "reminder_7day",
  "reminder_24hr",
] as const;
export type DeliveryKind = (typeof GROUP_A_KINDS)[number];

export type Recipient = { email: string; isMain: boolean };

const clean = (e: string) => e.trim().toLowerCase();

// Main email first, then the extras (never a duplicate of the main). An ARCHIVED customer gets
// no extras (the main email behaves exactly as it does today).
export async function loadRecipients(
  supabase: ScopedAdmin,
  customerId: string,
  mainEmail: string | null | undefined,
  opts: { mainOnly?: boolean } = {}
): Promise<Recipient[]> {
  const out: Recipient[] = [];
  const main = mainEmail?.trim();
  if (main) out.push({ email: main, isMain: true });
  if (opts.mainOnly || !customerId) return out;

  const { data: cust } = await supabase.from("customers").select("archived_at").eq("id", customerId).maybeSingle();
  if (cust?.archived_at) return out;
  const { data: extras, error } = await supabase
    .from("customer_extra_emails")
    .select("email")
    .eq("customer_id", customerId)
    .order("created_at", { ascending: true });
  if (error) {
    console.error("loadRecipients: could not read additional emails (sending to the main email only)", error.message);
    return out;
  }
  const seen = new Set(out.map((r) => clean(r.email)));
  for (const x of extras ?? []) {
    const e = clean(String(x.email));
    if (e && !seen.has(e)) {
      seen.add(e);
      out.push({ email: e, isMain: false });
    }
  }
  return out;
}

export type SendOutcome = { ok: true; id?: string | null } | { ok: false; error: string };
export type DeliveryResult = {
  // The main email went out (now, or on an earlier attempt).
  mainOk: boolean;
  // Every recipient is delivered (now or earlier).
  allOk: boolean;
  failed: string[];
};

// Sends one separate email per recipient. `refKey` identifies the thing being emailed (job id,
// payment id) and `kind` the email type; (business, kind, ref, recipient) is the log's unique key.
//   fresh: true  — a brand-new send event (owner clicked Resend, customer rescheduled…): every
//                  recipient is sent again.
//   fresh: false — a retry/sweep: recipients already logged `sent` are skipped, so nobody gets a
//                  duplicate.
// A failure for one address never stops the others. Never throws.
export async function deliverToRecipients(opts: {
  supabase: ScopedAdmin;
  kind: DeliveryKind | string;
  refId: string;
  // Distinguishes repeated emails of one kind for one ref (e.g. reminder 2 of 5).
  logKey?: string;
  recipients: Recipient[];
  fresh: boolean;
  send: (r: Recipient) => Promise<SendOutcome>;
}): Promise<DeliveryResult> {
  const { supabase, refId } = opts;
  const kind = opts.logKey ? `${opts.kind}:${opts.logKey}` : opts.kind;
  let mainOk = false;
  let allOk = opts.recipients.length > 0;
  const failed: string[] = [];

  for (const r of opts.recipients) {
    const to = clean(r.email);
    let outcome: SendOutcome;
    try {
      const claim = await claimDelivery(supabase, { kind, refId, recipient: to, isMain: r.isMain, fresh: opts.fresh });
      if (claim === "skip") {
        // Already delivered (or being delivered) — counts as done.
        if (r.isMain) mainOk = true;
        continue;
      }
      outcome = await opts.send(r).catch((e): SendOutcome => ({ ok: false, error: e instanceof Error ? e.message : String(e) }));
      await supabase
        .from("email_deliveries")
        .update({
          status: outcome.ok ? "sent" : "failed",
          provider_id: outcome.ok ? outcome.id ?? null : null,
          error: outcome.ok ? null : outcome.error.slice(0, 500),
          updated_at: new Date().toISOString(),
        })
        .eq("id", claim.id);
    } catch (err) {
      outcome = { ok: false, error: err instanceof Error ? err.message : String(err) };
      console.error("deliverToRecipients: unexpected error", kind, refId, err);
    }
    if (outcome.ok) {
      if (r.isMain) mainOk = true;
    } else {
      allOk = false;
      failed.push(to);
      console.error(`deliverToRecipients: ${kind} to ${r.isMain ? "main" : "additional"} address failed`, outcome.error, { refId });
    }
  }
  return { mainOk, allOk, failed };
}

// Claims the (kind, ref, recipient) row before sending. "skip" = leave it alone.
async function claimDelivery(
  supabase: ScopedAdmin,
  p: { kind: string; refId: string; recipient: string; isMain: boolean; fresh: boolean }
): Promise<{ id: string } | "skip"> {
  const STALE_MS = 10 * 60 * 1000;
  const { data: existing } = await supabase
    .from("email_deliveries")
    .select("id, status, attempts, updated_at")
    .eq("kind", p.kind)
    .eq("ref_id", p.refId)
    .eq("recipient", p.recipient)
    .maybeSingle();

  if (!existing) {
    const { data, error } = await supabase
      .from("email_deliveries")
      .insert({ kind: p.kind, ref_id: p.refId, recipient: p.recipient, is_main: p.isMain, status: "sending" })
      .select("id")
      .single();
    if (error || !data) return "skip"; // lost a race to a parallel sender (unique key) — it will send
    return { id: data.id as string };
  }

  const age = Date.now() - new Date(existing.updated_at as string).getTime();
  if (!p.fresh) {
    if (existing.status === "sent") return "skip";
    if (existing.status === "sending" && age < STALE_MS) return "skip";
  } else if (existing.status === "sending" && age < 60 * 1000) {
    return "skip"; // a double click / racing duplicate trigger
  }
  // Take over: only if the row is still in the state we read (atomic claim).
  const { data: taken } = await supabase
    .from("email_deliveries")
    .update({ status: "sending", error: null, attempts: (existing.attempts as number) + 1, updated_at: new Date().toISOString() })
    .eq("id", existing.id as string)
    .eq("status", existing.status as string)
    .eq("updated_at", existing.updated_at as string)
    .select("id");
  return taken && taken.length > 0 ? { id: existing.id as string } : "skip";
}
