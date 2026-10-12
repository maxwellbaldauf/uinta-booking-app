// Business-local calendar math. Every function takes the business's IANA
// timezone (businesses.timezone — "America/Denver" for Uinta,
// "America/Phoenix" for Camelback; see getBusiness()) instead of assuming
// one. Replaces lib/time/denver.ts. Mirrors uinta-field-app's lib/time/zone.ts
// for the functions both apps use — keep the two in sync if either changes.

// "Today" in the business's timezone as YYYY-MM-DD.
export function todayISODate(tz: string, at: Date = new Date()): string {
  return new Intl.DateTimeFormat("en-CA", {
    timeZone: tz,
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
  }).format(at);
}

// The zone's UTC offset in minutes at a given instant — DST-aware where the
// zone observes it (Denver MST -420 / MDT -360; Phoenix always -420).
function utcOffsetMinutes(tz: string, instant: Date): number {
  const parts = new Intl.DateTimeFormat("en-US", {
    timeZone: tz,
    timeZoneName: "shortOffset",
  }).formatToParts(instant);
  const tzPart = parts.find((p) => p.type === "timeZoneName")?.value ?? "GMT+0";
  const match = tzPart.match(/GMT([+-])(\d+)(?::(\d+))?/);
  if (!match) return 0;
  const minutes = Number(match[2]) * 60 + Number(match[3] ?? 0);
  return match[1] === "-" ? -minutes : minutes;
}

// Current local wall-clock time as minutes since midnight (0..1439). Used by
// the same-day slot filter. Reads the local clock directly — no offset math.
export function nowMinutesIn(tz: string): number {
  const parts = new Intl.DateTimeFormat("en-GB", {
    timeZone: tz,
    hour: "2-digit",
    minute: "2-digit",
    hour12: false,
  }).formatToParts(new Date());
  const h = Number(parts.find((p) => p.type === "hour")?.value ?? "0") % 24;
  const m = Number(parts.find((p) => p.type === "minute")?.value ?? "0");
  return h * 60 + m;
}

// "HH:MM" or "HH:MM:SS" -> minutes since midnight.
export function timeToMinutes(time: string): number {
  const [h, m] = time.split(":").map(Number);
  return (h || 0) * 60 + (m || 0);
}

// Add whole days to a plain "YYYY-MM-DD" using calendar math only.
export function addDaysToISODate(isoDate: string, days: number): string {
  const [y, m, d] = isoDate.split("-").map(Number);
  const rolled = new Date(Date.UTC(y, m - 1, d + days));
  return `${rolled.getUTCFullYear()}-${String(rolled.getUTCMonth() + 1).padStart(2, "0")}-${String(
    rolled.getUTCDate()
  ).padStart(2, "0")}`;
}

// The UTC instant of a local wall-clock date + time. Used for .ics
// DTSTART/DTEND. Fine near DST boundaries for this app's purposes — an
// arrival window is never scheduled across the 2am transition.
export function localToUtc(tz: string, isoDate: string, time: string): Date {
  const [y, m, d] = isoDate.split("-").map(Number);
  const [hh = 0, mm = 0] = time.split(":").map(Number);
  const naive = new Date(Date.UTC(y, m - 1, d, hh, mm, 0));
  const offsetMinutes = utcOffsetMinutes(tz, naive);
  return new Date(naive.getTime() - offsetMinutes * 60000);
}

// The UTC instant of local 00:00 on a plain date, as an ISO string. Stamps
// access_token_expires_at against a scheduled_date.
export function localMidnightUtcISO(tz: string, isoDate: string): string {
  return localToUtc(tz, isoDate, "00:00").toISOString();
}

// ---- booking horizon / month math (plain calendar math, no timezone) ----

// How long a visit's magic link outlives the visit date. The link must still
// open (view-only once the job leaves "scheduled") for this many days after.
export const MAGIC_LINK_GRACE_DAYS = 14;

// access_token_expires_at for a visit on `visitDate`: valid through the
// visit date + MAGIC_LINK_GRACE_DAYS, dead at local midnight after that.
export function accessTokenExpiryISO(tz: string, visitDate: string): string {
  return localMidnightUtcISO(tz, addDaysToISODate(visitDate, MAGIC_LINK_GRACE_DAYS + 1));
}

// "YYYY-MM" of a "YYYY-MM-DD".
export function monthOf(isoDate: string): string {
  return isoDate.slice(0, 7);
}

export function isMonthString(v: unknown): v is string {
  return typeof v === "string" && /^\d{4}-(0[1-9]|1[0-2])$/.test(v);
}

// "YYYY-MM" + n months.
export function addMonthsToMonth(month: string, n: number): string {
  const [y, m] = month.split("-").map(Number);
  const idx = y * 12 + (m - 1) + n;
  return `${Math.floor(idx / 12)}-${String((idx % 12) + 1).padStart(2, "0")}`;
}

export function monthStart(month: string): string {
  return `${month}-01`;
}

export function monthEnd(month: string): string {
  return addDaysToISODate(monthStart(addMonthsToMonth(month, 1)), -1);
}

// Whole calendar months from a date, clamped to the target month's length
// (Aug 31 + 6 months = Feb 28/29), e.g. "6 months from today".
export function addMonthsToISODate(isoDate: string, months: number): string {
  const target = addMonthsToMonth(monthOf(isoDate), months);
  const day = Math.min(Number(isoDate.slice(8, 10)), Number(monthEnd(target).slice(8, 10)));
  return `${target}-${String(day).padStart(2, "0")}`;
}

// Whole days from a to b (b - a), calendar math only.
export function diffISODays(a: string, b: string): number {
  const ms = (s: string) => {
    const [y, m, d] = s.split("-").map(Number);
    return Date.UTC(y, m - 1, d);
  };
  return Math.round((ms(b) - ms(a)) / 86_400_000);
}
