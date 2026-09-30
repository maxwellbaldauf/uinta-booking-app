// Fetch-health tracking for the live Google reviews (lib/googleReviews.ts),
// and the owner alert when fetches keep failing.
//
// Stored in Netlify Blobs, not Supabase: it's per-deployment operational state
// (each business has its own booking-site deployment, so it's naturally
// scoped), it holds no Google content, and it avoids a shared-schema change
// this repo isn't allowed to make. Outside Netlify (plain `next dev`) there's
// no Blobs context — tracking just logs and no-ops.
//
// "Repeatedly failing" = at least FAILURE_THRESHOLD consecutive failed fetches
// spanning at least MIN_OUTAGE_MS. The count alone would fire on a burst of
// visitors during a few-second blip; the span alone would fire on two failures
// a day apart with nothing in between. One alert per outage — re-armed only by
// a successful fetch, which also sends a short "recovered" note.
//
// Best-effort and never throws: it runs in after() and must not affect the page.
// Concurrent renders can race on the read-modify-write and undercount a
// failure; for an alert threshold that's harmless.
import { getStore } from "@netlify/blobs";
import { getSettings } from "@/lib/settings";
import { getResend } from "@/lib/email/resend";
import { getEmailBrand } from "@/lib/email/brand";
import { renderEmail, detailsTable } from "@/lib/email/shell";

const STORE = "google-reviews";
const KEY = "fetch-health";
export const FAILURE_THRESHOLD = 3;
export const MIN_OUTAGE_MS = 15 * 60_000;

export type HealthState = {
  consecutiveFailures: number;
  firstFailureAt: string | null;
  lastFailureAt: string | null;
  lastError: string | null;
  alertedAt: string | null;
};

const CLEAN: HealthState = {
  consecutiveFailures: 0,
  firstFailureAt: null,
  lastFailureAt: null,
  lastError: null,
  alertedAt: null,
};

// Pure state transition — what to store next and which email (if any) to send.
export function nextHealth(
  prev: HealthState,
  outcome: { ok: true } | { ok: false; detail: string },
  now: Date
): { state: HealthState; send: "alert" | "recovered" | null } {
  if (outcome.ok) {
    return { state: CLEAN, send: prev.alertedAt ? "recovered" : null };
  }
  const nowIso = now.toISOString();
  const firstFailureAt = prev.firstFailureAt ?? nowIso;
  const state: HealthState = {
    consecutiveFailures: prev.consecutiveFailures + 1,
    firstFailureAt,
    lastFailureAt: nowIso,
    lastError: outcome.detail.slice(0, 500),
    alertedAt: prev.alertedAt,
  };
  const outageMs = now.getTime() - new Date(firstFailureAt).getTime();
  if (
    !state.alertedAt &&
    state.consecutiveFailures >= FAILURE_THRESHOLD &&
    outageMs >= MIN_OUTAGE_MS
  ) {
    state.alertedAt = nowIso;
    return { state, send: "alert" };
  }
  return { state, send: null };
}

// Per warm instance: once a success has confirmed the stored state is clean,
// further successes skip the Blobs read entirely (the common case costs
// nothing). Any failure clears it.
let knownClean = false;

export async function recordReviewsFetch(
  outcome: { ok: true } | { ok: false; detail: string }
): Promise<void> {
  if (outcome.ok && knownClean) return;
  if (!outcome.ok) {
    knownClean = false;
    console.error("google-reviews: fetch failed —", outcome.detail);
  }
  try {
    const store = getStore({ name: STORE, consistency: "strong" });
    const prev = ((await store.get(KEY, { type: "json" })) as HealthState | null) ?? CLEAN;
    const { state, send } = nextHealth(prev, outcome, new Date());
    if (outcome.ok && prev.consecutiveFailures === 0) {
      knownClean = true;
      return;
    }
    await store.setJSON(KEY, state);
    if (outcome.ok) knownClean = true;
    if (send) await sendHealthEmail(send, send === "alert" ? state : prev);
  } catch (err) {
    console.error("google-reviews: health tracking unavailable", err);
  }
}

async function sendHealthEmail(kind: "alert" | "recovered", s: HealthState): Promise<void> {
  try {
    const [settings, resend, brand] = await Promise.all([
      getSettings(),
      getResend(),
      getEmailBrand(),
    ]);
    const to = settings.business_email;
    if (!to || !resend) {
      console.error("google-reviews: can't send health email — no business_email or Resend", {
        kind,
        hasRecipient: !!to,
        hasResend: !!resend,
      });
      return;
    }
    const rows = [
      { label: "Failures in a row", value: String(s.consecutiveFailures) },
      { label: "Failing since", value: s.firstFailureAt ?? "—" },
      { label: "Last error", value: s.lastError ?? "—" },
    ];
    const alert = kind === "alert";
    const subject = alert
      ? "Google reviews aren't loading on the website"
      : "Google reviews are loading on the website again";
    const lead = alert
      ? "The home page couldn't load reviews from Google several times in a row. The page still works — the reviews block is just hidden until this is fixed. Usually this means the API key, its restrictions, billing, or the place ID needs attention."
      : "Reviews are loading from Google again. No action needed.";
    const html = renderEmail({
      brand,
      title: subject,
      preheader: lead,
      inner: `
        <p style="margin:0 0 4px;font-size:16px;font-weight:700;">${subject}</p>
        <p style="margin:0 0 12px;color:#5b6470;">${lead}</p>
        ${alert ? detailsTable(rows) : ""}
      `,
    });
    const text = [
      subject.toUpperCase(),
      "",
      lead,
      ...(alert ? ["", ...rows.map((r) => `${(r.label + ":").padEnd(20)}${r.value}`)] : []),
      "",
      `— ${brand.name} booking site`,
    ].join("\n");
    const { error } = await resend.client.emails.send({
      from: resend.from,
      to,
      subject,
      html,
      text,
    });
    if (error) console.error("google-reviews: health email send failed", error);
  } catch (err) {
    console.error("google-reviews: health email unexpected error", err);
  }
}
