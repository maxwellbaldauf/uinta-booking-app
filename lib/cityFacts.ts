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

// Public machine label from the free-text brand. The brand box is free text
// customers fill in on /book, so only a KNOWN brand name ever reaches a public
// page, post or prompt; anything else ("not sure", typos, junk) falls back to a
// generic label. Matched as whole words, case/punctuation-insensitive.
const KNOWN_BRANDS: [canonical: string, aliases: string[]][] = [
  ["Scotsman", ["scotsman", "scottsman"]],
  ["KitchenAid", ["kitchenaid", "kitchen aid", "kitchen aide"]],
  ["U-Line", ["u line", "uline"]],
  ["Hoshizaki", ["hoshizaki"]],
  ["Manitowoc", ["manitowoc"]],
  ["GE Profile", ["ge profile"]],
  ["GE Monogram", ["monogram", "ge monogram"]],
  ["GE", ["ge", "general electric"]],
  ["Whirlpool", ["whirlpool"]],
  ["Sub-Zero", ["sub zero", "subzero"]],
  ["True", ["true residential", "true manufacturing"]],
  ["Marvel", ["marvel"]],
  ["Perlick", ["perlick"]],
  ["Ice-O-Matic", ["ice o matic", "iceomatic"]],
  ["Frigidaire", ["frigidaire"]],
  ["Viking", ["viking"]],
  ["Thermador", ["thermador"]],
  ["JennAir", ["jennair", "jenn air"]],
  ["Kenmore", ["kenmore"]],
  ["Summit", ["summit"]],
  ["Bosch", ["bosch"]],
  ["Miele", ["miele"]],
  ["Zephyr", ["zephyr"]],
  ["Fisher & Paykel", ["fisher paykel", "fisher and paykel"]],
  ["Electrolux", ["electrolux"]],
  ["NewAir", ["newair", "new air"]],
  ["EdgeStar", ["edgestar", "edge star"]],
  ["Danby", ["danby"]],
  ["Opal", ["opal"]],
  ["Follett", ["follett"]],
];

export function machineLabel(brand: string | null): string {
  const text = ` ${(brand ?? "").toLowerCase().replace(/&/g, " and ").replace(/[^a-z0-9]+/g, " ").trim()} `;
  for (const [canonical, aliases] of KNOWN_BRANDS) {
    if (aliases.some((a) => text.includes(` ${a} `))) return `${canonical} ice machine`;
  }
  return "Residential ice machine";
}

// "2026-11-09" -> "November 9, 2026" (the date is already local).
export function longDate(iso: string): string {
  const [y, m, d] = iso.split("-").map(Number);
  return `${MONTHS[m - 1]} ${d}, ${y}`;
}

// "2026-10-14" -> "October 2026" (no timezone math; the date is already local).
export function monthLabel(iso: string): string {
  const [y, m] = iso.split("-").map(Number);
  return `${MONTHS[m - 1]} ${y}`;
}
