const DENVER_TZ = "America/Denver";

// --- Ported from Project A's lib/time/denver.ts ---------------------------

// "Today" in Denver time as YYYY-MM-DD — the only correct way to compare
// against a scheduled_date, since Postgres defaults to UTC and a plain
// server Date object reflects the server's own timezone, not the business's.
export function todayDenverISODate(): string {
  return new Intl.DateTimeFormat("en-CA", {
    timeZone: DENVER_TZ,
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
  }).format(new Date());
}

// Denver's UTC offset in minutes for a given instant — DST-aware (MST -420 /
// MDT -360), unlike a hardcoded offset.
function denverUtcOffsetMinutes(instant: Date): number {
  const parts = new Intl.DateTimeFormat("en-US", {
    timeZone: DENVER_TZ,
    timeZoneName: "shortOffset",
  }).formatToParts(instant);
  const tzPart = parts.find((p) => p.type === "timeZoneName")?.value ?? "GMT+0";
  const match = tzPart.match(/GMT([+-]\d+)/);
  return match ? Number(match[1]) * 60 : 0;
}

// --- Project B additions ------------------------------------------------

// Current wall-clock time in Denver as minutes since midnight (0..1439). Used
// by the same-day slot filter. No offset math — reads the local clock directly.
export function nowDenverMinutes(): number {
  const parts = new Intl.DateTimeFormat("en-GB", {
    timeZone: DENVER_TZ,
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

// Add whole days to a plain "YYYY-MM-DD" using calendar math only (no timezone
// ever enters the "what date is it" question). Rolls over months/years.
export function addDaysToISODate(isoDate: string, days: number): string {
  const [y, m, d] = isoDate.split("-").map(Number);
  const rolled = new Date(Date.UTC(y, m - 1, d + days));
  return `${rolled.getUTCFullYear()}-${String(rolled.getUTCMonth() + 1).padStart(2, "0")}-${String(
    rolled.getUTCDate()
  ).padStart(2, "0")}`;
}

// The UTC instant of 00:00 America/Denver on the given plain date, as an ISO
// string. Used to stamp access_token_expires_at against a scheduled_date.
export function denverMidnightUtcISO(isoDate: string): string {
  return denverLocalToUtc(isoDate, "00:00").toISOString();
}

// The UTC instant of a given Denver wall-clock date + time. "2026-08-29" +
// "07:00" -> the Date for 13:00Z (MDT) or 14:00Z (MST). Used for .ics
// DTSTART/DTEND. Fine near DST boundaries for this app's purposes — an
// arrival window is never scheduled across the 2am transition.
export function denverLocalToUtc(isoDate: string, time: string): Date {
  const [y, m, d] = isoDate.split("-").map(Number);
  const [hh = 0, mm = 0] = time.split(":").map(Number);
  const naive = new Date(Date.UTC(y, m - 1, d, hh, mm, 0));
  const offsetMinutes = denverUtcOffsetMinutes(naive);
  return new Date(naive.getTime() - offsetMinutes * 60000);
}
