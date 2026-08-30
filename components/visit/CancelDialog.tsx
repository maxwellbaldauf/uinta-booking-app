"use client";

import { useState } from "react";
import { buttonStyle, secondaryButtonStyle, ErrorBanner } from "@/components/ui/form";
import type { CancelScope } from "@/app/visit/[token]/actions";

export function CancelDialog({
  address,
  busy,
  error,
  onBack,
  onConfirm,
}: {
  address: string;
  busy: boolean;
  error: string | null;
  onBack: () => void;
  onConfirm: (scope: CancelScope) => void;
}) {
  const [scope, setScope] = useState<CancelScope>("visit");

  const Option = ({
    value,
    title,
    body,
  }: {
    value: CancelScope;
    title: string;
    body: string;
  }) => (
    <label
      style={{
        display: "flex",
        gap: 10,
        alignItems: "flex-start",
        border: `1px solid ${scope === value ? "var(--color-primary)" : "var(--color-border)"}`,
        borderRadius: "var(--radius)",
        padding: "var(--space-3)",
        cursor: "pointer",
      }}
    >
      <input
        type="radio"
        checked={scope === value}
        onChange={() => setScope(value)}
        style={{ marginTop: 3 }}
      />
      <span>
        <span style={{ display: "block", fontWeight: 600, fontSize: 14 }}>{title}</span>
        <span style={{ display: "block", fontSize: 13, color: "var(--color-fg-muted)", marginTop: 2 }}>
          {body}
        </span>
      </span>
    </label>
  );

  return (
    <div style={{ display: "flex", flexDirection: "column", gap: "var(--space-4)" }}>
      <h1 style={{ fontSize: 22, margin: 0 }}>Cancel this visit</h1>

      <div style={{ display: "flex", flexDirection: "column", gap: "var(--space-2)" }}>
        <Option
          value="visit"
          title="Just this visit"
          body="Your semi-annual plan stays active — we'll schedule the next visit as usual."
        />
        <Option
          value="property"
          title="Stop service at this property"
          body={`Cancels this visit and ends the plan for ${address}. Your card stays on file, and any other properties are unaffected.`}
        />
      </div>

      {error && <ErrorBanner>{error}</ErrorBanner>}

      <div style={{ display: "flex", gap: "var(--space-2)" }}>
        <button
          type="button"
          onClick={onBack}
          disabled={busy}
          style={{ ...secondaryButtonStyle, width: "auto", padding: "14px 16px" }}
        >
          Keep it
        </button>
        <button
          type="button"
          onClick={() => onConfirm(scope)}
          disabled={busy}
          style={{
            ...buttonStyle,
            background: "var(--color-danger)",
            color: "#fff",
            opacity: busy ? 0.6 : 1,
          }}
        >
          {busy ? "Cancelling…" : "Confirm cancellation"}
        </button>
      </div>
    </div>
  );
}
