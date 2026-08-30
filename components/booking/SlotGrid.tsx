"use client";

import { useMemo } from "react";

export type OfferedSlotView = {
  slotDate: string;
  arrivalBlock: number;
  blockLabel: string;
};

// Plain "YYYY-MM-DD" -> "Mon, Sep 1" without going through a timezone.
export function formatSlotDate(iso: string): string {
  const [y, m, d] = iso.split("-").map(Number);
  const dt = new Date(Date.UTC(y, m - 1, d));
  const wd = ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"][dt.getUTCDay()];
  const mo = [
    "Jan", "Feb", "Mar", "Apr", "May", "Jun",
    "Jul", "Aug", "Sep", "Oct", "Nov", "Dec",
  ][dt.getUTCMonth()];
  return `${wd}, ${mo} ${d}`;
}

// The open-window picker, grouped by date. Shared by the booking flow and the
// magic-link reschedule.
export function SlotGrid({
  slots,
  selected,
  onSelect,
}: {
  slots: OfferedSlotView[];
  selected: OfferedSlotView | null;
  onSelect: (s: OfferedSlotView) => void;
}) {
  const byDate = useMemo(() => {
    const map = new Map<string, OfferedSlotView[]>();
    for (const s of slots) {
      const list = map.get(s.slotDate) ?? [];
      list.push(s);
      map.set(s.slotDate, list);
    }
    const entries = Array.from(map.entries());
    for (const [, list] of entries) {
      list.sort((a: OfferedSlotView, b: OfferedSlotView) => a.arrivalBlock - b.arrivalBlock);
    }
    return entries.sort((a, b) => a[0].localeCompare(b[0]));
  }, [slots]);

  if (slots.length === 0) {
    return (
      <p style={{ color: "var(--color-fg-muted)" }}>
        No open arrival windows right now.
      </p>
    );
  }

  return (
    <div style={{ display: "flex", flexDirection: "column", gap: "var(--space-4)" }}>
      {byDate.map(([date, daySlots]) => (
        <div key={date}>
          <div style={{ fontWeight: 600, fontSize: 14, marginBottom: 6 }}>
            {formatSlotDate(date)}
          </div>
          <div style={{ display: "flex", flexWrap: "wrap", gap: "var(--space-2)" }}>
            {daySlots.map((s) => {
              const isSel =
                selected?.slotDate === s.slotDate && selected?.arrivalBlock === s.arrivalBlock;
              return (
                <button
                  key={s.arrivalBlock}
                  type="button"
                  onClick={() => onSelect(s)}
                  style={{
                    padding: "10px 12px",
                    borderRadius: "var(--radius)",
                    border: `1px solid ${isSel ? "var(--color-primary)" : "var(--color-border)"}`,
                    background: isSel ? "var(--color-primary)" : "var(--color-bg)",
                    color: isSel ? "var(--color-primary-fg)" : "var(--color-fg)",
                    fontSize: 14,
                    fontWeight: isSel ? 600 : 400,
                  }}
                >
                  {s.blockLabel}
                </button>
              );
            })}
          </div>
        </div>
      ))}
    </div>
  );
}
