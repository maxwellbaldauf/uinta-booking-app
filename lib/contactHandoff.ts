// One-time handoff of the booking dead-end details to /contact, via
// sessionStorage instead of the URL. Personal data in a query string leaks to
// anything that sees the page address (analytics tags, referrers, history,
// server logs), so /contact is always the plain path.
//
// Browser-only. Every storage access is wrapped: if storage is unavailable
// (private mode, blocked site data) the helpers quietly do nothing and the
// contact form simply starts blank.

const KEY = "uinta.contactPrefill";
const MAX_LEN = 500;
// A stash older than this is ignored (and deleted on read), so details left
// behind by a click that never reached /contact can't prefill a later visit.
const MAX_AGE_MS = 10 * 60 * 1000;

export type ContactPrefill = Partial<{
  name: string;
  email: string;
  phone: string;
  address: string;
  brand: string;
  model: string;
  // The dead-end kind that sent the visitor here (drives the intro copy).
  from: string;
}>;

const FIELDS: (keyof ContactPrefill)[] = [
  "name",
  "email",
  "phone",
  "address",
  "brand",
  "model",
  "from",
];

export function stashContactPrefill(prefill: ContactPrefill): void {
  try {
    sessionStorage.setItem(KEY, JSON.stringify({ at: Date.now(), prefill }));
  } catch {
    // Storage unavailable — the form just won't be prefilled.
  }
}

// Drop a stash that will no longer be used (e.g. the visitor went back to edit
// their details instead of continuing to /contact).
export function clearContactPrefill(): void {
  try {
    sessionStorage.removeItem(KEY);
  } catch {
    // Nothing to do.
  }
}

// Reads the stashed details and deletes them immediately, so a refresh or a
// later visit to /contact starts blank. Returns null if there is nothing
// usable (or the stash is older than MAX_AGE_MS).
export function takeContactPrefill(): ContactPrefill | null {
  let raw: string | null = null;
  try {
    raw = sessionStorage.getItem(KEY);
    if (raw !== null) sessionStorage.removeItem(KEY);
  } catch {
    return null;
  }
  if (!raw) return null;

  try {
    const parsed: unknown = JSON.parse(raw);
    if (typeof parsed !== "object" || parsed === null) return null;
    const { at, prefill } = parsed as { at?: unknown; prefill?: unknown };
    if (typeof at !== "number" || Date.now() - at > MAX_AGE_MS) return null;
    if (typeof prefill !== "object" || prefill === null) return null;
    const src = prefill as Record<string, unknown>;
    const out: ContactPrefill = {};
    for (const k of FIELDS) {
      const v = src[k];
      if (typeof v === "string" && v) out[k] = v.slice(0, MAX_LEN);
    }
    return Object.keys(out).length > 0 ? out : null;
  } catch {
    return null;
  }
}
