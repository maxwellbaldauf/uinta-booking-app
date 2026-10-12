"use client";

import { useCallback, useMemo, useState } from "react";
import type { OfferedSlotView } from "./SlotGrid";

// Month-at-a-time slot picker, used by the booking flow and the portal's
// reschedule when the business has a booking horizon set. Opens on the month
// containing the soonest opening; arrows page one month at a time up to the
// horizon, fetching only the month being viewed (cached per mount). Days with
// openings are tappable; picking one lists its arrival windows underneath.
// Plain CSS against the global tokens, same visual language as SlotGrid.

export type MonthlyInfo = { month: string; minMonth: string; maxMonth: string };

const MONTH_NAMES = [
  "January", "February", "March", "April", "May", "June",
  "July", "August", "September", "October", "November", "December",
];
const WEEKDAYS = ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"];
const WEEKDAY_LONG = ["Sunday", "Monday", "Tuesday", "Wednesday", "Thursday", "Friday", "Saturday"];

function addMonth(month: string, n: number): string {
  const [y, m] = month.split("-").map(Number);
  const idx = y * 12 + (m - 1) + n;
  return `${Math.floor(idx / 12)}-${String((idx % 12) + 1).padStart(2, "0")}`;
}

function monthLabel(month: string): string {
  const [y, m] = month.split("-").map(Number);
  return `${MONTH_NAMES[m - 1]} ${y}`;
}

function longDate(iso: string): string {
  const [y, m, d] = iso.split("-").map(Number);
  const wd = WEEKDAY_LONG[new Date(Date.UTC(y, m - 1, d)).getUTCDay()];
  return `${wd}, ${MONTH_NAMES[m - 1]} ${d}, ${y}`;
}

const navButton: React.CSSProperties = {
  width: 44,
  height: 44,
  borderRadius: "var(--radius)",
  border: "1px solid var(--color-border)",
  background: "var(--color-bg)",
  color: "var(--color-fg)",
  fontSize: 18,
  lineHeight: 1,
  cursor: "pointer",
};

export function MonthSlotPicker({
  initialSlots,
  monthly,
  loadMonth,
  selected,
  onSelect,
}: {
  initialSlots: OfferedSlotView[];
  monthly: MonthlyInfo;
  // Resolves to that month's slots, or null on failure.
  loadMonth: (month: string) => Promise<OfferedSlotView[] | null>;
  selected: OfferedSlotView | null;
  onSelect: (s: OfferedSlotView) => void;
}) {
  const [month, setMonth] = useState(monthly.month);
  const [cache, setCache] = useState<Record<string, OfferedSlotView[]>>({ [monthly.month]: initialSlots });
  const [loading, setLoading] = useState(false);
  const [failed, setFailed] = useState(false);

  // A refreshed list from the parent ("that time was just taken") replaces
  // the cache and returns to its month. Adjusting state during render, per
  // React's "storing information from previous renders".
  const [seenInitial, setSeenInitial] = useState(initialSlots);
  if (seenInitial !== initialSlots) {
    setSeenInitial(initialSlots);
    setCache({ [monthly.month]: initialSlots });
    setMonth(monthly.month);
    setFailed(false);
  }

  const slots = cache[month] ?? null;

  const byDate = useMemo(() => {
    const map = new Map<string, OfferedSlotView[]>();
    for (const s of slots ?? []) {
      const list = map.get(s.slotDate) ?? [];
      list.push(s);
      map.set(s.slotDate, list);
    }
    for (const list of map.values()) list.sort((a, b) => a.arrivalBlock - b.arrivalBlock);
    return map;
  }, [slots]);

  // Day whose windows are listed: the picked slot's day if it is in this
  // month, else a day the customer tapped, else (first month only) the
  // soonest opening.
  const [tapped, setTapped] = useState<string | null>(null);
  const activeDate =
    selected && selected.slotDate.startsWith(month)
      ? selected.slotDate
      : tapped && tapped.startsWith(month) && byDate.has(tapped)
      ? tapped
      : month === monthly.month
      ? (Array.from(byDate.keys()).sort()[0] ?? null)
      : null;

  const go = useCallback(
    async (next: string) => {
      setMonth(next);
      setFailed(false);
      if (cache[next]) return;
      setLoading(true);
      const res = await loadMonth(next);
      setLoading(false);
      if (res) {
        setCache((c) => ({ ...c, [next]: res }));
      } else {
        setFailed(true);
      }
    },
    [loadMonth, cache]
  );

  const [y, m] = month.split("-").map(Number);
  const firstDow = new Date(Date.UTC(y, m - 1, 1)).getUTCDay();
  const daysInMonth = new Date(Date.UTC(y, m, 0)).getUTCDate();
  const cells: (number | null)[] = [
    ...Array.from({ length: firstDow }, () => null),
    ...Array.from({ length: daysInMonth }, (_, i) => i + 1),
  ];

  const canPrev = month > monthly.minMonth;
  const canNext = month < monthly.maxMonth;
  const dayWindows = activeDate ? (byDate.get(activeDate) ?? []) : [];

  return (
    <div style={{ display: "flex", flexDirection: "column", gap: "var(--space-4)" }}>
      <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", gap: "var(--space-2)" }}>
        <button
          type="button"
          aria-label="Previous month"
          disabled={!canPrev}
          onClick={() => go(addMonth(month, -1))}
          style={{ ...navButton, opacity: canPrev ? 1 : 0.35, cursor: canPrev ? "pointer" : "default" }}
        >
          ‹
        </button>
        <div aria-live="polite" style={{ fontSize: 18, fontWeight: 600, textAlign: "center" }}>
          {monthLabel(month)}
        </div>
        <button
          type="button"
          aria-label="Next month"
          disabled={!canNext}
          onClick={() => go(addMonth(month, 1))}
          style={{ ...navButton, opacity: canNext ? 1 : 0.35, cursor: canNext ? "pointer" : "default" }}
        >
          ›
        </button>
      </div>

      <div
        role="group"
        aria-label={`Available days in ${monthLabel(month)}`}
        aria-busy={loading}
        style={{
          display: "grid",
          gridTemplateColumns: "repeat(7, minmax(0, 1fr))",
          gap: 4,
          opacity: loading ? 0.5 : 1,
          transition: "opacity 120ms",
        }}
      >
        {WEEKDAYS.map((d) => (
          <div
            key={d}
            style={{ textAlign: "center", fontSize: 12, color: "var(--color-fg-muted)", padding: "2px 0" }}
          >
            {d}
          </div>
        ))}
        {cells.map((day, i) => {
          if (day == null) return <div key={`b${i}`} />;
          const iso = `${month}-${String(day).padStart(2, "0")}`;
          const open = byDate.get(iso);
          const isActive = iso === activeDate;
          const hasPick = selected?.slotDate === iso;
          if (!open) {
            return (
              <div
                key={iso}
                aria-hidden="true"
                style={{
                  minHeight: 44,
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "center",
                  fontSize: 15,
                  color: "var(--color-fg-muted)",
                  opacity: 0.4,
                }}
              >
                {day}
              </div>
            );
          }
          return (
            <button
              key={iso}
              type="button"
              aria-label={`${longDate(iso)}, ${open.length} arrival ${open.length === 1 ? "window" : "windows"}`}
              aria-pressed={isActive}
              onClick={() => setTapped(iso)}
              style={{
                minHeight: 44,
                borderRadius: "var(--radius)",
                border: `1px solid ${isActive ? "var(--color-primary)" : "var(--color-border)"}`,
                background: isActive ? "var(--color-primary)" : "var(--color-bg)",
                color: isActive ? "var(--color-primary-fg)" : "var(--color-fg)",
                fontSize: 15,
                fontWeight: isActive || hasPick ? 700 : 500,
                cursor: "pointer",
                padding: 0,
              }}
            >
              {day}
            </button>
          );
        })}
      </div>

      {failed && (
        <p role="alert" style={{ margin: 0, color: "var(--color-danger)", fontSize: 14 }}>
          {"We couldn't load that month. "}
          <button
            type="button"
            onClick={() => go(month)}
            style={{ background: "none", border: "none", padding: 0, color: "inherit", textDecoration: "underline", cursor: "pointer", font: "inherit" }}
          >
            Try again
          </button>
        </p>
      )}

      {!failed && slots && byDate.size === 0 && (
        <p style={{ margin: 0, color: "var(--color-fg-muted)", fontSize: 14 }}>
          No open days in {monthLabel(month)}. Try another month.
        </p>
      )}

      {activeDate ? (
        <div>
          <div style={{ fontWeight: 600, fontSize: 14, marginBottom: 6 }}>{longDate(activeDate)}</div>
          <div style={{ display: "flex", flexWrap: "wrap", gap: "var(--space-2)" }}>
            {dayWindows.map((s) => {
              const isSel = selected?.slotDate === s.slotDate && selected?.arrivalBlock === s.arrivalBlock;
              return (
                <button
                  key={s.arrivalBlock}
                  type="button"
                  aria-pressed={isSel}
                  onClick={() => onSelect(s)}
                  style={{
                    padding: "10px 12px",
                    borderRadius: "var(--radius)",
                    border: `1px solid ${isSel ? "var(--color-primary)" : "var(--color-border)"}`,
                    background: isSel ? "var(--color-primary)" : "var(--color-bg)",
                    color: isSel ? "var(--color-primary-fg)" : "var(--color-fg)",
                    fontSize: 14,
                    fontWeight: isSel ? 600 : 400,
                    cursor: "pointer",
                  }}
                >
                  {s.blockLabel}
                </button>
              );
            })}
          </div>
        </div>
      ) : (
        byDate.size > 0 && (
          <p style={{ margin: 0, color: "var(--color-fg-muted)", fontSize: 14 }}>
            Choose a day to see arrival windows.
          </p>
        )
      )}
    </div>
  );
}
