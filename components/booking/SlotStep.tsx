"use client";

import { useMemo, useState } from "react";
import { buttonStyle, secondaryButtonStyle, ErrorBanner } from "@/components/ui/form";

export type OfferedSlotView = {
  slotDate: string;
  arrivalBlock: number;
  blockLabel: string;
};

// Plain "YYYY-MM-DD" -> "Mon, Sep 1" without going through a timezone.
function formatSlotDate(iso: string): string {
  const [y, m, d] = iso.split("-").map(Number);
  const dt = new Date(Date.UTC(y, m - 1, d));
  const wd = ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"][dt.getUTCDay()];
  const mo = [
    "Jan", "Feb", "Mar", "Apr", "May", "Jun",
    "Jul", "Aug", "Sep", "Oct", "Nov", "Dec",
  ][dt.getUTCMonth()];
  return `${wd}, ${mo} ${d}`;
}

export function SlotStep({
  slots,
  matchedCustomer,
  busy,
  error,
  onBack,
  onContinue,
}: {
  slots: OfferedSlotView[];
  matchedCustomer: { hasPaymentMethod: boolean; paymentDisplay: string | null } | null;
  busy: boolean;
  error: string | null;
  onBack: () => void;
  onContinue: (choice: {
    slot: OfferedSlotView;
    useExistingCard: boolean;
  }) => void;
}) {
  const [selected, setSelected] = useState<OfferedSlotView | null>(null);
  const [useExistingCard, setUseExistingCard] = useState(true);

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

  const showCardChoice = !!matchedCustomer?.hasPaymentMethod;

  return (
    <div style={{ display: "flex", flexDirection: "column", gap: "var(--space-4)" }}>
      <div>
        <h1 style={{ fontSize: 22, margin: 0 }}>Choose a time</h1>
        <p style={{ color: "var(--color-fg-muted)", margin: "4px 0 0" }}>
          We&apos;ll give you a 90-minute arrival window.
        </p>
      </div>

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
                    onClick={() => setSelected(s)}
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

      {showCardChoice && selected && (
        <div
          style={{
            border: "1px solid var(--color-border)",
            borderRadius: "var(--radius)",
            padding: "var(--space-3)",
            display: "flex",
            flexDirection: "column",
            gap: "var(--space-2)",
          }}
        >
          <span style={{ fontSize: 13, color: "var(--color-fg-muted)" }}>Payment</span>
          <label style={{ display: "flex", gap: 8, alignItems: "center", fontSize: 14 }}>
            <input
              type="radio"
              checked={useExistingCard}
              onChange={() => setUseExistingCard(true)}
            />
            Use my card on file{" "}
            {matchedCustomer?.paymentDisplay ? `(${matchedCustomer.paymentDisplay})` : ""}
          </label>
          <label style={{ display: "flex", gap: 8, alignItems: "center", fontSize: 14 }}>
            <input
              type="radio"
              checked={!useExistingCard}
              onChange={() => setUseExistingCard(false)}
            />
            Use a different card for this property
          </label>
        </div>
      )}

      {error && <ErrorBanner>{error}</ErrorBanner>}

      <div style={{ display: "flex", gap: "var(--space-2)" }}>
        <button type="button" onClick={onBack} style={{ ...secondaryButtonStyle, width: "auto", flex: "0 0 auto", padding: "14px 16px" }}>
          Back
        </button>
        <button
          type="button"
          disabled={!selected || busy}
          onClick={() =>
            selected && onContinue({ slot: selected, useExistingCard: showCardChoice ? useExistingCard : false })
          }
          style={{ ...buttonStyle, opacity: !selected || busy ? 0.6 : 1 }}
        >
          {busy
            ? "Working…"
            : showCardChoice && useExistingCard
            ? "Book this time"
            : "Continue to payment"}
        </button>
      </div>
    </div>
  );
}
