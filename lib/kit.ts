// Kit (kit.com) — the opt-in "daily quotes" email list offered on the booking
// form. This is a MARKETING list and is entirely separate from our
// transactional email (Resend): different provider, different consent, different
// content. Nothing about a booking or a customer record depends on it.
//
// Every call here is best-effort and NEVER throws. A Kit outage, a bad key, a
// slow response, or a malformed address must not affect a booking — same
// fire-and-forget contract as lib/email/sameDayAlert.ts.

const KIT_API_BASE = "https://api.kit.com/v4";

// "The 1% Better Starts with You" — the daily-quotes sequence. Double opt-in is
// turned OFF for this sequence in Kit, so adding a subscriber enrolls them
// directly with no confirmation email from Kit.
const QUOTES_SEQUENCE_ID = 2346569;

// A hung Kit endpoint must not stall the booking response (the job row is
// already written by the time this runs). Cap each request.
const KIT_TIMEOUT_MS = 10_000;

type KitPostResult =
  | { ok: true; status: number }
  | { ok: false; status: number | null; detail: string };

async function kitPost(
  path: string,
  payload: Record<string, unknown>,
  apiKey: string
): Promise<KitPostResult> {
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), KIT_TIMEOUT_MS);
  try {
    const res = await fetch(`${KIT_API_BASE}${path}`, {
      method: "POST",
      headers: {
        "X-Kit-Api-Key": apiKey,
        "Content-Type": "application/json",
        Accept: "application/json",
      },
      body: JSON.stringify(payload),
      cache: "no-store",
      signal: controller.signal,
    });

    if (res.ok) return { ok: true, status: res.status };

    // Kit returns { errors: [...] } on 4xx — keep a trimmed copy for the log.
    let detail = "";
    try {
      detail = (await res.text()).slice(0, 500);
    } catch {
      /* body already consumed / unavailable — status alone will do */
    }
    return { ok: false, status: res.status, detail };
  } catch (err) {
    return {
      ok: false,
      status: null,
      detail: err instanceof Error ? err.message : String(err),
    };
  } finally {
    clearTimeout(timer);
  }
}

export type KitSubscribeResult =
  | { ok: true; alreadyOnList: boolean }
  | {
      ok: false;
      step: "not_configured" | "create_subscriber" | "add_to_sequence";
      detail: string;
    };

// Create-or-update the Kit subscriber, then enroll them in the daily-quotes
// sequence. Call it only when the person ticked the opt-in box. Never throws;
// the return value is for the dev test route — the booking path ignores it.
export async function subscribeToQuotesList(
  email: string
): Promise<KitSubscribeResult> {
  const apiKey = process.env.KIT_API_KEY?.trim();
  const address = email.trim();

  if (!apiKey) {
    console.warn(
      "subscribeToQuotesList: KIT_API_KEY is not set — skipping the daily-quotes opt-in (booking is unaffected)"
    );
    return { ok: false, step: "not_configured", detail: "KIT_API_KEY not set" };
  }
  if (!address) {
    return { ok: false, step: "create_subscriber", detail: "empty email" };
  }

  try {
    // 1. Create or update the subscriber. 201 = created, 200 = already existed.
    //    The sequence-enrollment call below requires the subscriber to exist.
    const created = await kitPost("/subscribers", { email_address: address }, apiKey);
    if (!created.ok) {
      console.error("subscribeToQuotesList: POST /v4/subscribers failed", {
        status: created.status,
        detail: created.detail,
      });
      return { ok: false, step: "create_subscriber", detail: created.detail };
    }

    // 2. Enroll in the "1% Better" sequence by email address. Double opt-in is
    //    off for this sequence, so this subscribes them directly — no second
    //    confirmation email from Kit. 201 = added, 200 = already enrolled.
    const enrolled = await kitPost(
      `/sequences/${QUOTES_SEQUENCE_ID}/subscribers`,
      { email_address: address },
      apiKey
    );
    if (!enrolled.ok) {
      console.error(
        "subscribeToQuotesList: POST /v4/sequences/:id/subscribers failed",
        {
          sequenceId: QUOTES_SEQUENCE_ID,
          status: enrolled.status,
          detail: enrolled.detail,
        }
      );
      return { ok: false, step: "add_to_sequence", detail: enrolled.detail };
    }

    return { ok: true, alreadyOnList: enrolled.status === 200 };
  } catch (err) {
    // kitPost swallows its own errors, so reaching here is genuinely
    // unexpected — still, never let it surface into the booking path.
    console.error("subscribeToQuotesList: unexpected error", err);
    return {
      ok: false,
      step: "create_subscriber",
      detail: err instanceof Error ? err.message : String(err),
    };
  }
}
