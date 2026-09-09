// Tunables for the marketing-site AI chat widget (components/chat/ChatWidget +
// app/api/chat). Kept in one place so the route, the rate limiter, and the
// client stay in agreement.

// Model is fixed by the build spec. Haiku 4.5 takes no `thinking` param and
// rejects `output_config.effort` — the route sends neither.
export const CHAT_MODEL = "claude-haiku-4-5";

// Deliberately short. Replies are 2–4 sentences; this also caps per-call cost
// and keeps the serverless function well inside its timeout.
export const MAX_OUTPUT_TOKENS = 800;

// ---- Conversation caps (enforced server-side in the route, not just the UI) --

// Total messages (user + assistant) allowed in one conversation before the
// visitor has to refresh. The client is told on the last allowed turn.
export const MAX_MESSAGES = 20;

// Per-message character cap and a whole-conversation cap, as defence in depth
// against a single oversized payload.
export const MAX_MESSAGE_CHARS = 1000;
export const MAX_TOTAL_CHARS = 12_000;

// The model may call capture_lead once; this bounds the follow-up loop so a
// misbehaving model can't run the tool round-trip forever.
export const MAX_TOOL_ROUNDS = 2;

// The widget shows this as the first (assistant) bubble. It is NOT sent to the
// API as a message — the model is told about it in the system prompt instead,
// so the visitor's first reply has a referent. Keep the two in sync via this
// one constant.
export const CHAT_GREETING =
  "Hi. I can help with questions about our ice machine cleaning: what's " +
  "involved, pricing, the service area, or getting booked. What's on your mind?";

// ---- Rate limiting (lib/chat/rateLimit.ts) ---------------------------------

// Burst: a real conversation is one request every few seconds. Sustained: a
// generous hourly ceiling that still bounds a single scripted abuser.
export const RATE_LIMIT_BURST = { limit: 20, windowMs: 60_000 };
export const RATE_LIMIT_SUSTAINED = { limit: 120, windowMs: 60 * 60_000 };
