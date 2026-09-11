"use client";

import { useState } from "react";
import { buttonStyle, secondaryButtonStyle, ErrorBanner } from "@/components/ui/form";
import { SlotGrid, type OfferedSlotView } from "./SlotGrid";
import type { ServiceType } from "./ServiceTypeStep";

export type { OfferedSlotView };

export function SlotStep({
  slots,
  serviceType,
  matchedCustomer,
  busy,
  error,
  onBack,
  onContinue,
}: {
  slots: OfferedSlotView[];
  serviceType: ServiceType;
  matchedCustomer: { hasPaymentMethod: boolean; paymentDisplay: string | null } | null;
  busy: boolean;
  error: string | null;
  onBack: () => void;
  onContinue: (choice: { slot: OfferedSlotView; useExistingCard: boolean }) => void;
}) {
  const [selected, setSelected] = useState<OfferedSlotView | null>(null);
  const [useExistingCard, setUseExistingCard] = useState(true);

  const showCardChoice = !!matchedCustomer?.hasPaymentMethod;

  return (
    <div style={{ display: "flex", flexDirection: "column", gap: "var(--space-4)" }}>
      <div>
        <h1 style={{ fontSize: 22, margin: 0 }}>Choose a time</h1>
        <p style={{ color: "var(--color-fg-muted)", margin: "4px 0 0" }}>
          {serviceType === "commercial"
            ? "We'll give you a combined arrival window covering the full visit."
            : "We'll give you a 90-minute arrival window."}
        </p>
      </div>

      <SlotGrid slots={slots} selected={selected} onSelect={setSelected} />

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
            <input type="radio" checked={useExistingCard} onChange={() => setUseExistingCard(true)} />
            Use my card on file{" "}
            {matchedCustomer?.paymentDisplay ? `(${matchedCustomer.paymentDisplay})` : ""}
          </label>
          <label style={{ display: "flex", gap: 8, alignItems: "center", fontSize: 14 }}>
            <input type="radio" checked={!useExistingCard} onChange={() => setUseExistingCard(false)} />
            Use a different card for this property
          </label>
        </div>
      )}

      {error && <ErrorBanner>{error}</ErrorBanner>}

      <div style={{ display: "flex", gap: "var(--space-2)" }}>
        <button
          type="button"
          onClick={onBack}
          style={{ ...secondaryButtonStyle, width: "auto", flex: "0 0 auto", padding: "14px 16px" }}
        >
          Back
        </button>
        <button
          type="button"
          disabled={!selected || busy}
          onClick={() =>
            selected &&
            onContinue({ slot: selected, useExistingCard: showCardChoice ? useExistingCard : false })
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
