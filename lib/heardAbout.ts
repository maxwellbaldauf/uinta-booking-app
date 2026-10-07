// "How did you hear about us?" — the allow-list and the one validator shared by
// the client step (what to render) and the server (what to trust). Stored values
// are stable machine keys, not display labels, so wording can change later
// without a data migration; the field app keeps its own copy of the labels for
// the dashboard tally. Dependency-free on purpose (client + server import it).
// Matches the CHECK constraints in uinta-field-app migration 016.

export const HEARD_ABOUT_OPTIONS = [
  { key: "facebook_group", label: "Facebook Group Post" },
  { key: "google_search", label: "Google Search" },
  { key: "ai_search", label: "AI Search Recommendation (Claude, ChatGPT, Gemini, etc)" },
  { key: "social_media", label: "Social Media post" },
  { key: "referral", label: "Referral" },
  { key: "other", label: "Other" },
] as const;

export type HeardAboutSource = (typeof HEARD_ABOUT_OPTIONS)[number]["key"];

export const HEARD_ABOUT_DETAIL_MAX = 200;

export type HeardAboutAnswer = {
  source: HeardAboutSource;
  // "Referred by" name / "Other" text. Always null for any other source.
  detail: string | null;
};

const SOURCE_KEYS: readonly string[] = HEARD_ABOUT_OPTIONS.map((o) => o.key);

export function isHeardAboutSource(v: unknown): v is HeardAboutSource {
  return typeof v === "string" && SOURCE_KEYS.includes(v);
}

// Control characters (incl. NUL, which Postgres rejects) become spaces; then
// trim and cap by code points (the DB's char_length counts code points).
function cleanDetail(raw: unknown): string {
  if (typeof raw !== "string") return "";
  const flat = raw.replace(/[\u0000-\u001f\u007f]+/g, " ").trim();
  return Array.from(flat).slice(0, HEARD_ABOUT_DETAIL_MAX).join("").trim();
}

export type HeardAboutParse =
  | { ok: true; value: HeardAboutAnswer }
  | { ok: false; error: string };

// Accepts anything (a raw POST body included) and returns either a clean answer
// or a customer-readable reason. Detail is nulled for every source except
// referral (optional) and other (required).
export function parseHeardAbout(raw: unknown): HeardAboutParse {
  const obj = raw && typeof raw === "object" ? (raw as Record<string, unknown>) : null;
  const source = obj?.source;
  if (!isHeardAboutSource(source)) {
    return { ok: false, error: "Please tell us how you heard about us." };
  }
  if (source === "referral") {
    return { ok: true, value: { source, detail: cleanDetail(obj?.detail) || null } };
  }
  if (source === "other") {
    const detail = cleanDetail(obj?.detail);
    if (!detail) return { ok: false, error: "Please tell us where you heard about us." };
    return { ok: true, value: { source, detail } };
  }
  return { ok: true, value: { source, detail: null } };
}
