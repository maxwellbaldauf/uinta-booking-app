// Pure helpers shared by the city pages (lib/cityPages.ts) and the weekly
// content drafts (lib/jobs/runWeeklyContentDrafts.ts). No imports: the Netlify
// function bundle can't resolve "@/" aliases or next/* modules.

const MONTHS = [
  "January", "February", "March", "April", "May", "June",
  "July", "August", "September", "October", "November", "December",
];

export function citySlug(name: string): string {
  return name
    .normalize("NFKD")
    .replace(/[̀-ͯ]/g, "")
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "");
}

// Public machine label from the free-text brand. Anything odd falls back to a
// generic label rather than publishing arbitrary text.
export function machineLabel(brand: string | null): string {
  const b = (brand ?? "").replace(/\s+/g, " ").trim();
  if (!b || b.length > 30 || /^(unknown|n\/?a|none|\?+|-+)$/i.test(b)) {
    return "Residential ice machine";
  }
  if (!/^[\p{L}\p{N} &.\-/]+$/u.test(b)) return "Residential ice machine";
  return `${b} ice machine`;
}

// "2026-10-14" -> "October 2026" (no timezone math; the date is already local).
export function monthLabel(iso: string): string {
  const [y, m] = iso.split("-").map(Number);
  return `${MONTHS[m - 1]} ${y}`;
}
