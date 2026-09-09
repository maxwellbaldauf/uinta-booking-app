// The one tool the chat assistant can call. It does not write anything itself —
// the route validates the model's arguments and calls runCaptureLead(), which
// goes through the exact path the contact form uses (lib/contact.ts →
// matchOrCreateCustomer + contact_submissions insert), so a chat lead lands on
// the field-app dashboard's "New messages" list like any other.

import Anthropic from "@anthropic-ai/sdk";
import { submitContact } from "@/lib/contact";

export type LeadReason = "general_interest" | "handoff_to_human" | "out_of_scope";

export type ChatTurn = { role: "user" | "assistant"; content: string };

export type LeadInput = {
  name: string;
  email: string;
  phone: string;
  reason: LeadReason;
  summary: string;
};

export const captureLeadTool: Anthropic.Tool = {
  name: "capture_lead",
  description:
    "Save the visitor's contact details so Max can follow up. Call this ONLY " +
    "when the conversation has given you the visitor's name AND at least one of " +
    "an email or a phone number, and either (a) they are interested but not " +
    "booking right now, or (b) they asked for a human or you cannot answer " +
    "their question confidently. Do not call it speculatively, and do not call " +
    "it more than once in a conversation.",
  input_schema: {
    type: "object",
    additionalProperties: false,
    required: ["name", "email", "phone", "reason", "summary"],
    properties: {
      name: {
        type: "string",
        description: "The visitor's name as they gave it.",
      },
      email: {
        type: "string",
        description:
          "The visitor's email address, or an empty string if they have not given one.",
      },
      phone: {
        type: "string",
        description:
          "The visitor's phone number, or an empty string if they have not given one.",
      },
      reason: {
        type: "string",
        enum: ["general_interest", "handoff_to_human", "out_of_scope"],
        description:
          "general_interest = interested but not booking now; handoff_to_human = asked for a person; out_of_scope = a question you could not answer.",
      },
      summary: {
        type: "string",
        description:
          "One or two sentences: what the visitor wants, plus any machine brand, model, or city they mentioned.",
      },
    },
  },
  strict: true,
};

// Model tool arguments are untrusted: a small model occasionally leaks
// serialization fragments or the wrong field's text into a string (observed:
// tool-call markup landing in `phone`). Strip angle brackets and control
// characters, length-cap, and only keep an email or phone that actually looks
// like one — otherwise leadHasContact() is wrong and garbage reaches the
// customers table.
const clean = (v: unknown, max: number): string =>
  (typeof v === "string" ? v : "")
    .replace(/[<>\p{Cc}]/gu, " ")
    .replace(/\s+/g, " ")
    .trim()
    .slice(0, max);

const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

export function parseLeadInput(raw: unknown): LeadInput | null {
  if (typeof raw !== "object" || raw === null) return null;
  const r = raw as Record<string, unknown>;

  const name = clean(r.name, 120);
  if (!name) return null;

  const reason: LeadReason =
    r.reason === "handoff_to_human" || r.reason === "out_of_scope"
      ? r.reason
      : "general_interest";

  const email = clean(r.email, 200);
  const phone = clean(r.phone, 40);
  const phoneDigits = phone.replace(/\D/g, "");

  return {
    name,
    email: EMAIL_RE.test(email) ? email : "",
    // keep the visitor's own formatting, but only if it carries a real number
    phone: phoneDigits.length >= 7 && phoneDigits.length <= 15 ? phone : "",
    reason,
    summary: clean(r.summary, 600),
  };
}

export function leadHasContact(input: LeadInput): boolean {
  return input.email.length > 0 || input.phone.length > 0;
}

const REASON_LABEL: Record<LeadReason, string> = {
  general_interest: "interested, not booking yet",
  handoff_to_human: "asked to speak to a person",
  out_of_scope: "question the assistant could not answer",
};

const MAX_MESSAGE_BODY = 2000;

function transcriptTail(turns: ChatTurn[]): string {
  return turns
    .slice(-8)
    .map((t) => {
      const who = t.role === "user" ? "Visitor" : "Assistant";
      const text =
        t.content.length > 300 ? `${t.content.slice(0, 300)}…` : t.content;
      return `${who}: ${text}`;
    })
    .join("\n");
}

// Builds the contact_submissions.message body — the block the dashboard renders
// under the customer name (white-space: pre-wrap).
export function composeLeadMessage(input: LeadInput, turns: ChatTurn[]): string {
  const body =
    `[AI chat lead — ${REASON_LABEL[input.reason]}]\n` +
    `${input.summary || "(no summary given)"}\n\n` +
    `Recent conversation:\n${transcriptTail(turns)}`;
  return body.length > MAX_MESSAGE_BODY
    ? `${body.slice(0, MAX_MESSAGE_BODY)}…`
    : body;
}

export async function runCaptureLead(
  input: LeadInput,
  turns: ChatTurn[],
): Promise<{ ok: boolean }> {
  try {
    await submitContact({
      fullName: input.name,
      email: input.email,
      phone: input.phone,
      address: "",
      iceMakerBrand: "",
      iceMakerModel: "",
      message: composeLeadMessage(input, turns),
    });
    return { ok: true };
  } catch (err) {
    console.error("chat: runCaptureLead failed", err);
    return { ok: false };
  }
}
