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
  "reminder_30day", // annual service heads-up (its card-update link goes to the main address only)
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
  try {
    return await loadRecipientsUnsafe(supabase, customerId, mainEmail, opts);
  } catch (err) {
    // The extras lookup must never stop the main email.
    console.error("loadRecipients: failed (sending to the main email only)", err);
    const main = mainEmail?.trim();
    return main ? [{ email: main, isMain: true }] : [];
  }
}

async function loadRecipientsUnsafe(
  supabase: ScopedAdmin,
  customerId: string,
  mainEmail: string | null | undefined,
  opts: { mainOnly?: boolean }
): Promise<Recipient[]> {
  const out: Recipient[] = [];
  const main = mainEmail?.trim();
  if (main) out.push({ email: main, isMain: true });
  if (opts.mainOnly || !customerId) return out;

  const [{ data: cust, error: custError }, { data: extras, error }] = await Promise.all([
    supabase.from("customers").select("archived_at").eq("id", customerId).maybeSingle(),
    supabase.from("customer_extra_emails").select("email").eq("customer_id", customerId).order("created_at", { ascending: true }),
  ]);
  if (custError || cust?.archived_at) {
    if (custError) console.error("loadRecipients: could not check the customer (sending to the main email only)", custError.message);
    return out;
  }
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
// Maps a Resend SDK response ({ data, error }) to a SendOutcome — the one shared wrapper.
export function toOutcome(res: {
  data?: { id?: string | null } | null;
  error?: { message?: string; name?: string; statusCode?: number | null } | null;
}): SendOutcome {
  if (!res.error) return { ok: true, id: res.data?.id ?? null };
  const limited = res.error.statusCode === 429 || res.error.name === "rate_limit_exceeded";
  return { ok: false, error: (limited ? RATE_LIMIT_TAG : "") + (res.error.message ?? "Resend send failed") };
}

export type DeliveryResult = {
  // The main email went out (now, or on an earlier attempt).
  mainOk: boolean;
  // The caller may stamp its sent-at marker: the main email is delivered AND every additional address
  // is either delivered or has been tried MAX_ATTEMPTS times (a permanently failing extra must never
  // stall the main customer's reminder sequence; its failure stays recorded and visible).
  settled: boolean;
  failed: string[];
};

export const MAX_ATTEMPTS = 3;
// Resend allows ~2 requests/second: space the per-address sends out and retry a rate-limited one once.
const SEND_GAP_MS = 520;
const sleep = (ms: number) => new Promise((r) => setTimeout(r, ms));
// One shared pacing queue for ADDITIONAL-address sends across everything running in this process (the
// reminder sweep runs many jobs at once): each extra send takes the next free slot. Main sends are not
// delayed.
let nextSlot = 0;
async function throttle() {
  const now = Date.now();
  const at = Math.max(now, nextSlot);
  // Never queue for long (the sweep has a function time cap): past ~8s of backlog just send — a 429 is
  // retried and not counted against the address.
  if (at - now > 8000) return;
  nextSlot = at + SEND_GAP_MS;
  if (at > now) await sleep(at - now);
}
// toOutcome tags Resend's rate-limit errors (HTTP 429 / rate_limit_exceeded) with this prefix.
const RATE_LIMIT_TAG = "rate_limit_exceeded: ";
const isRateLimited = (msg: string) => msg.startsWith(RATE_LIMIT_TAG);

// Sends one separate email per recipient. `refId` identifies the thing being emailed (job id,
// payment id) and `kind` the email type; (business, kind, ref, recipient) is the log's unique key.
//   fresh: true  — a brand-new send event (owner clicked Resend, customer rescheduled…): every
//                  recipient is sent again.
//   fresh: false — a retry/sweep: recipients already logged `sent` are skipped, so nobody gets a
//                  duplicate.
// A failure for one address never stops the others. If the delivery log itself is unavailable the
// email is still SENT (just unlogged) — the log must never be the reason an email is not sent.
// Never throws.
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
  let settled = opts.recipients.length > 0;
  const failed: string[] = [];

  for (const r of opts.recipients) {
    const to = clean(r.email);
    let outcome: SendOutcome;
    let claim: Claim = { kind: "send", id: null, attempts: 1 };
    try {
      claim = await claimDelivery(supabase, { kind, refId, recipient: to, isMain: r.isMain, fresh: opts.fresh });
    } catch (err) {
      console.error("deliverToRecipients: delivery log unavailable — sending anyway", kind, refId, err);
    }
    if (claim.kind === "done") {
      // Already delivered earlier.
      if (r.isMain) mainOk = true;
      continue;
    }
    if (claim.kind === "capped") {
      // An additional address that already failed MAX_ATTEMPTS times: skipped (recorded failure stays
      // visible; the owner's Retry button resets the count).
      failed.push(to);
      continue;
    }
    if (claim.kind === "inflight") {
      // Another sender is still delivering this (after waiting briefly for it). It never counts as delivered
      // here, so the caller doesn't stamp or report success on the strength of someone else's attempt.
      settled = false;
      continue;
    }

    const attempt = () => opts.send(r).catch((e): SendOutcome => ({ ok: false, error: e instanceof Error ? e.message : String(e) }));
    if (!r.isMain) await throttle();
    outcome = await attempt();
    if (!outcome.ok && isRateLimited(outcome.error)) {
      await sleep(SEND_GAP_MS * 2);
      if (!r.isMain) await throttle();
      outcome = await attempt();
    }
    // Being rate-limited is not the address's fault: it must not count toward MAX_ATTEMPTS.
    const rateLimited = !outcome.ok && isRateLimited(outcome.error);
    if (claim.id) {
      const record = () =>
        supabase
          .from("email_deliveries")
          .update({
            status: outcome.ok ? "sent" : "failed",
            provider_id: outcome.ok ? outcome.id ?? null : null,
            error: outcome.ok ? null : outcome.error.slice(0, 500),
            ...(rateLimited ? { attempts: Math.max(0, claim.attempts - 1) } : {}),
            updated_at: new Date().toISOString(),
          })
          .eq("id", claim.id as string);
      try {
        let { error: recErr } = await record();
        if (recErr) ({ error: recErr } = await record()); // one retry: a stuck 'sending' row would cause a duplicate later
        if (recErr) console.error("deliverToRecipients: could not record the outcome", kind, refId, recErr.message);
      } catch (err) {
        console.error("deliverToRecipients: could not record the outcome", kind, refId, err);
      }
    }
    if (outcome.ok) {
      if (r.isMain) mainOk = true;
    } else {
      failed.push(to);
      // A failing additional address stops blocking once it has been tried MAX_ATTEMPTS times.
      // (An unlogged send — the log is down — can't be counted, so it never blocks either.)
      if (r.isMain || (claim.id && (rateLimited || claim.attempts < MAX_ATTEMPTS))) settled = false;
      console.error(`deliverToRecipients: ${kind} to ${r.isMain ? "main" : "additional"} address failed (attempt ${claim.attempts})`, outcome.error, { refId });
    }
  }
  if (!mainOk) settled = false;
  return { mainOk, settled, failed };
}

type Claim = { kind: "send"; id: string | null; attempts: number } | { kind: "done" } | { kind: "inflight" } | { kind: "capped" };

// Claims the (kind, ref, recipient) row before sending.
//   "done"     — already delivered; nothing to send
//   "inflight" — another sender is delivering it right now
//   "capped"   — an additional address that already failed MAX_ATTEMPTS times (automatic runs stop)
//   "send"     — go ahead (id null = the log could not be written, send unlogged)
async function claimDelivery(
  supabase: ScopedAdmin,
  p: { kind: string; refId: string; recipient: string; isMain: boolean; fresh: boolean },
  raced = false
): Promise<Claim> {
  const STALE_MS = 10 * 60 * 1000;
  const { data: existing, error: readError } = await supabase
    .from("email_deliveries")
    .select("id, status, attempts, updated_at")
    .eq("kind", p.kind)
    .eq("ref_id", p.refId)
    .eq("recipient", p.recipient)
    .maybeSingle();
  if (readError) throw new Error(`delivery log read failed: ${readError.message}`);

  if (!existing) {
    const { data, error } = await supabase
      .from("email_deliveries")
      .insert({ kind: p.kind, ref_id: p.refId, recipient: p.recipient, is_main: p.isMain, status: "sending" })
      .select("id")
      .single();
    if (error || !data) {
      // 23505 = a parallel sender created the row first: it is delivering this one.
      // Re-read once and take the normal path (wait for its outcome on a fresh send).
      if ((error as { code?: string } | null)?.code === "23505") return raced ? { kind: "inflight" } : claimDelivery(supabase, p, true);
      throw new Error(`delivery log insert failed: ${error?.message ?? "no row"}`);
    }
    return { kind: "send", id: data.id as string, attempts: 1 };
  }

  let row = existing;
  let age = Date.now() - new Date(row.updated_at as string).getTime();
  if (p.fresh && row.status === "sending" && age < 60 * 1000) {
    // A double click / racing duplicate trigger: wait briefly for the other sender's outcome.
    for (let i = 0; i < 8 && row.status === "sending"; i++) {
      await sleep(750);
      const { data: again } = await supabase.from("email_deliveries").select("id, status, attempts, updated_at").eq("id", row.id as string).maybeSingle();
      if (!again) break;
      row = again;
    }
    if (row.status === "sent") return { kind: "done" };
    age = Date.now() - new Date(row.updated_at as string).getTime();
    if (row.status === "sending" && age < 60 * 1000) return { kind: "inflight" };
  }
  if (!p.fresh) {
    if (row.status === "sent") return { kind: "done" };
    if (row.status === "sending" && age < STALE_MS) return { kind: "inflight" };
    if (!p.isMain && row.status === "failed" && (row.attempts as number) >= MAX_ATTEMPTS) return { kind: "capped" };
  }
  // Take over: only if the row is still in the state we read (atomic claim).
  // A fresh send is a new event: its failures are counted from 1 again.
  const attempts = p.fresh ? 1 : (row.attempts as number) + 1;
  const { data: taken, error: takeError } = await supabase
    .from("email_deliveries")
    .update({ status: "sending", error: null, attempts, updated_at: new Date().toISOString() })
    .eq("id", row.id as string)
    .eq("status", row.status as string)
    .eq("updated_at", row.updated_at as string)
    .select("id");
  if (takeError) throw new Error(`delivery log claim failed: ${takeError.message}`);
  return taken && taken.length > 0 ? { kind: "send", id: row.id as string, attempts } : { kind: "inflight" };
}
