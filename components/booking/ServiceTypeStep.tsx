"use client";

import { useState } from "react";
import { buttonStyle } from "@/components/ui/form";
import { formatUsdWhole } from "@/lib/settings";

export type ServiceType = "residential" | "commercial";

// First step of /book. No 1-block option is ever shown here — a commercial
// booking always requests 2 consecutive blocks. The owner-only single-block
// override (for a commercial job the owner knows is small) is set later from
// the field app, never at public booking time: if it were offered here,
// every commercial customer would pick it, since it's free to them and gets
// better slots.
export function ServiceTypeStep({
  basePriceCents,
  commercialPriceCents,
  busy,
  onSubmit,
}: {
  basePriceCents: number | null;
  commercialPriceCents: number | null;
  busy: boolean;
  onSubmit: (serviceType: ServiceType) => void;
}) {
  const [selected, setSelected] = useState<ServiceType | null>(null);

  return (
    <div style={{ display: "flex", flexDirection: "column", gap: "var(--space-4)" }}>
      <div>
        <h1 style={{ fontSize: 22, margin: 0 }}>Book a cleaning</h1>
        <p style={{ color: "var(--color-fg-muted)", margin: "4px 0 0" }}>
          Which kind of visit do you need?
        </p>
      </div>

      <div style={{ display: "flex", flexDirection: "column", gap: "var(--space-3)" }}>
        <ServiceTypeCard
          title="Residential"
          description="Homes — undercounter and built-in ice machines. About an hour in your kitchen."
          priceLabel={basePriceCents != null ? `${formatUsdWhole(basePriceCents)} per visit` : null}
          selected={selected === "residential"}
          onSelect={() => setSelected("residential")}
        />
        <ServiceTypeCard
          title="Commercial"
          description="Offices, retail showrooms, and small business breakrooms. A larger machine with more components — about an hour and a half."
          priceLabel={
            commercialPriceCents != null ? `${formatUsdWhole(commercialPriceCents)} per visit` : null
          }
          selected={selected === "commercial"}
          onSelect={() => setSelected("commercial")}
        />
      </div>

      <button
        type="button"
        disabled={!selected || busy}
        onClick={() => selected && onSubmit(selected)}
        style={{ ...buttonStyle, opacity: !selected || busy ? 0.6 : 1 }}
      >
        {busy ? "Checking availability…" : "Continue"}
      </button>
    </div>
  );
}

function ServiceTypeCard({
  title,
  description,
  priceLabel,
  selected,
  onSelect,
}: {
  title: string;
  description: string;
  priceLabel: string | null;
  selected: boolean;
  onSelect: () => void;
}) {
  return (
    <button
      type="button"
      onClick={onSelect}
      style={{
        display: "flex",
        flexDirection: "column",
        gap: 6,
        textAlign: "left",
        padding: "var(--space-4)",
        borderRadius: "var(--radius)",
        border: `1px solid ${selected ? "var(--color-primary)" : "var(--color-border)"}`,
        background: selected ? "var(--color-bg-subtle)" : "var(--color-bg)",
        cursor: "pointer",
      }}
    >
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "baseline", gap: 8 }}>
        <span style={{ fontSize: 16, fontWeight: 600 }}>{title}</span>
        {priceLabel && (
          <span style={{ fontSize: 15, fontWeight: 600, color: "var(--color-primary)" }}>
            {priceLabel}
          </span>
        )}
      </div>
      <span style={{ fontSize: 13, color: "var(--color-fg-muted)" }}>{description}</span>
    </button>
  );
}
