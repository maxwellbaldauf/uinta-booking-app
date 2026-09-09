import Anthropic from "@anthropic-ai/sdk";
import { NextResponse } from "next/server";
import {
  CHAT_MODEL,
  MAX_MESSAGE_CHARS,
  MAX_MESSAGES,
  MAX_OUTPUT_TOKENS,
  MAX_TOOL_ROUNDS,
  MAX_TOTAL_CHARS,
} from "@/lib/chat/config";
import { buildSystemPrompt } from "@/lib/chat/systemPrompt";
import {
  captureLeadTool,
  leadHasContact,
  parseLeadInput,
  runCaptureLead,
  type ChatTurn,
} from "@/lib/chat/leadTool";
import { checkRateLimit, clientIpFromHeaders } from "@/lib/chat/rateLimit";
import { formatUsdWhole, getSettings } from "@/lib/settings";
import { NAP } from "@/lib/site";

export const runtime = "nodejs";

// POST { messages: {role, content}[], leadCaptured?: boolean }
//   -> { reply, leadCaptured?, limitReached? }  |  { error, limitReached? }
//
// One Anthropic call per turn, plus a follow-up call after the model runs
// capture_lead (bounded by MAX_TOOL_ROUNDS). The system prompt + tool are
// cached; the growing message list is not.

const CONTACT_TAIL = `Call or text ${NAP.phoneDisplay}.`;
const LIMIT_MESSAGE =
  "This chat has reached its length limit. Start a new chat to keep going.";

function errorJson(
  error: string,
  status: number,
  extra?: Record<string, unknown>,
  headers?: Record<string, string>,
) {
  return NextResponse.json({ error, ...extra }, { status, headers });
}

function isChatTurn(v: unknown): v is ChatTurn {
  if (typeof v !== "object" || v === null) return false;
  const m = v as Record<string, unknown>;
  return (
    (m.role === "user" || m.role === "assistant") && typeof m.content === "string"
  );
}

async function currentPriceLabel(): Promise<string | null> {
  try {
    return formatUsdWhole((await getSettings()).base_price_cents);
  } catch {
    return null;
  }
}

function extractText(message: Anthropic.Message): string {
  return message.content
    .filter((b): b is Anthropic.TextBlock => b.type === "text")
    .map((b) => b.text)
    .join("\n")
    .trim();
}

// Carry only text + tool_use forward, built as request params, so response-only
// fields (citations, caller, …) can't cause type friction on the next call.
function assistantEcho(message: Anthropic.Message): Anthropic.ContentBlockParam[] {
  const out: Anthropic.ContentBlockParam[] = [];
  for (const block of message.content) {
    if (block.type === "text") {
      out.push({ type: "text", text: block.text });
    } else if (block.type === "tool_use") {
      out.push({ type: "tool_use", id: block.id, name: block.name, input: block.input });
    }
  }
  return out;
}

export async function POST(req: Request) {
  const apiKey = process.env.ANTHROPIC_API_KEY;
  if (!apiKey) {
    console.error("chat route: ANTHROPIC_API_KEY is not set");
    return errorJson(
      `The assistant isn't available right now. ${CONTACT_TAIL}`,
      503,
    );
  }

  const rate = checkRateLimit(clientIpFromHeaders(req.headers));
  if (!rate.ok) {
    return errorJson(
      "You've sent a lot of messages in a short time. Give it a minute and try again.",
      429,
      { retryAfterSec: rate.retryAfterSec },
      { "Retry-After": String(rate.retryAfterSec) },
    );
  }

  let body: unknown;
  try {
    body = await req.json();
  } catch {
    return errorJson("Invalid request.", 400);
  }
  if (typeof body !== "object" || body === null) {
    return errorJson("Invalid request.", 400);
  }

  const { messages: rawMessages, leadCaptured: rawLeadCaptured } = body as Record<
    string,
    unknown
  >;

  if (
    !Array.isArray(rawMessages) ||
    rawMessages.length === 0 ||
    !rawMessages.every(isChatTurn)
  ) {
    return errorJson("Invalid request.", 400);
  }
  const turns: ChatTurn[] = rawMessages;

  if (turns[0].role !== "user" || turns[turns.length - 1].role !== "user") {
    return errorJson("Invalid request.", 400);
  }
  if (turns.some((t) => t.content.trim().length === 0)) {
    return errorJson("Invalid request.", 400);
  }
  if (turns.length > MAX_MESSAGES) {
    return errorJson(LIMIT_MESSAGE, 409, { limitReached: true });
  }
  if (turns.some((t) => t.content.length > MAX_MESSAGE_CHARS)) {
    return errorJson(
      `Keep each message under ${MAX_MESSAGE_CHARS} characters.`,
      400,
    );
  }
  if (turns.reduce((n, t) => n + t.content.length, 0) > MAX_TOTAL_CHARS) {
    return errorJson(LIMIT_MESSAGE, 409, { limitReached: true });
  }

  const alreadyCaptured = rawLeadCaptured === true;
  // Warn one turn before the wall so the client can lock the composer and show
  // "refresh to start over" on an assistant message rather than an error.
  const limitReached = turns.length >= MAX_MESSAGES - 1;

  // A slow Anthropic call will be killed by the serverless function timeout
  // (10s default on Netlify) well before the SDK's; one retry keeps a transient
  // blip recoverable without risking a pile-up. Bump the function timeout in
  // netlify.toml if real traffic shows this being cut off.
  const anthropic = new Anthropic({ apiKey, maxRetries: 1 });
  const system: Anthropic.TextBlockParam[] = [
    {
      type: "text",
      text: buildSystemPrompt({ priceLabel: await currentPriceLabel() }),
      cache_control: { type: "ephemeral" },
    },
  ];

  const apiMessages: Anthropic.MessageParam[] = turns.map((t) => ({
    role: t.role,
    content: t.content,
  }));

  let leadCapturedThisTurn = false;

  try {
    for (let round = 1; ; round++) {
      const response = await anthropic.messages.create({
        model: CHAT_MODEL,
        max_tokens: MAX_OUTPUT_TOKENS,
        system,
        tools: [captureLeadTool],
        messages: apiMessages,
      });

      if (process.env.NODE_ENV !== "production") {
        console.log("chat usage", { round, ...response.usage });
      }

      const wantsTool =
        response.stop_reason === "tool_use" && round <= MAX_TOOL_ROUNDS;

      if (!wantsTool) {
        const reply =
          extractText(response) ||
          `Sorry, I didn't catch that. ${CONTACT_TAIL} Email ${NAP.email}.`;
        return NextResponse.json({
          reply,
          leadCaptured: alreadyCaptured || leadCapturedThisTurn,
          limitReached,
        });
      }

      apiMessages.push({ role: "assistant", content: assistantEcho(response) });

      const toolResults: Anthropic.ToolResultBlockParam[] = [];
      for (const block of response.content) {
        if (block.type !== "tool_use") continue;

        let note: string;
        if (block.name !== "capture_lead") {
          note = "Unknown tool — ignore it and answer the visitor directly.";
        } else {
          const parsed = parseLeadInput(block.input);
          if (!parsed) {
            note = "Not saved — ask the visitor for their name first.";
          } else if (!leadHasContact(parsed)) {
            note =
              "Not saved — you also need an email or a phone number. Ask for whichever is missing.";
          } else if (alreadyCaptured || leadCapturedThisTurn) {
            note =
              "Already saved earlier in this conversation — just reassure the visitor that Max has their details.";
          } else {
            const saved = await runCaptureLead(parsed, turns);
            if (saved.ok) {
              leadCapturedThisTurn = true;
              note =
                "Saved. Max will follow up. Confirm with the visitor and read back the email or phone you saved.";
            } else {
              note = `Could not save it. Apologize briefly and give the visitor the phone ${NAP.phoneDisplay} and email ${NAP.email}.`;
            }
          }
        }
        toolResults.push({
          type: "tool_result",
          tool_use_id: block.id,
          content: note,
        });
      }

      apiMessages.push({ role: "user", content: toolResults });
    }
  } catch (err) {
    // The lead is already in the DB; a failure in the follow-up call must not
    // send the client back with leadCaptured:false, or a retry writes a
    // duplicate row (the retry's request would carry leadCaptured:false and the
    // model would capture again).
    if (leadCapturedThisTurn) {
      return NextResponse.json({
        reply: `Thanks. I've passed your details to Max and he'll follow up. You can also ${CONTACT_TAIL.toLowerCase()}`,
        leadCaptured: true,
        limitReached,
      });
    }
    if (err instanceof Anthropic.RateLimitError) {
      return errorJson("We're busy right now. Try again in a moment.", 429);
    }
    console.error("chat route error", err);
    return errorJson(`Something went wrong on our end. ${CONTACT_TAIL}`, 502);
  }
}
