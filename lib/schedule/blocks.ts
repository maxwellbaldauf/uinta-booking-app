// Mirror of the arrival_blocks table (supabase/arrival-blocks.sql): the seven
// fixed 1.5-hour arrival windows a job can be booked into. Block times are fixed
// business config — if they ever change, update this file AND the arrival_blocks
// table together. This file is also copied verbatim into Project B.
//
// Each block is ~60 min of work plus ~20-30 min of drive time between clustered
// stops, so ~1.5 hours door to door. One job per (date, block), globally.

export type ArrivalBlock = 1 | 2 | 3 | 4 | 5 | 6 | 7;

export type ArrivalBlockDef = {
  index: ArrivalBlock;
  startsAt: string; // "HH:MM", 24-hour, America/Denver wall clock
  endsAt: string;
  label: string;
};

export const ARRIVAL_BLOCKS: ArrivalBlockDef[] = [
  { index: 1, startsAt: "07:00", endsAt: "08:30", label: "7:00–8:30 AM" },
  { index: 2, startsAt: "08:30", endsAt: "10:00", label: "8:30–10:00 AM" },
  { index: 3, startsAt: "10:00", endsAt: "11:30", label: "10:00–11:30 AM" },
  { index: 4, startsAt: "11:30", endsAt: "13:00", label: "11:30 AM–1:00 PM" },
  { index: 5, startsAt: "13:00", endsAt: "14:30", label: "1:00–2:30 PM" },
  { index: 6, startsAt: "14:30", endsAt: "16:00", label: "2:30–4:00 PM" },
  { index: 7, startsAt: "16:00", endsAt: "17:30", label: "4:00–5:30 PM" },
];

export const ARRIVAL_BLOCK_OPTIONS: { value: ArrivalBlock; label: string }[] =
  ARRIVAL_BLOCKS.map((b) => ({ value: b.index, label: b.label }));

function to12Hour(time24: string): string {
  const [h, m] = time24.split(":").map(Number);
  const period = h >= 12 ? "PM" : "AM";
  const h12 = h % 12 === 0 ? 12 : h % 12;
  return `${h12}:${String(m).padStart(2, "0")} ${period}`;
}

// Display helper — tolerant of the null/legacy values that can still turn up
// (an old cached offline snapshot, a job row from before this column existed).
//
// blocksNeeded > 1 (a commercial reservation) formats a combined range across
// the start block's startsAt and the end block's endsAt, always showing AM/PM
// on both sides (unlike the hand-authored single-block labels above, which
// sometimes omit it when both ends share a period) since the synthesized
// range is more often read out of context (e.g. a calendar badge).
export function arrivalBlockLabel(
  index: number | null | undefined,
  blocksNeeded = 1
): string {
  if (index == null) return "—";
  const start = ARRIVAL_BLOCKS.find((b) => b.index === index);
  if (!start) return `Block ${index}`;
  if (blocksNeeded <= 1) return start.label;

  const end = ARRIVAL_BLOCKS.find((b) => b.index === index + blocksNeeded - 1);
  if (!end) return start.label; // defensive: server enforces the range fits within block 7

  return `${to12Hour(start.startsAt)} – ${to12Hour(end.endsAt)}`;
}

export function isArrivalBlock(value: unknown): value is ArrivalBlock {
  return typeof value === "number" && Number.isInteger(value) && value >= 1 && value <= 7;
}
