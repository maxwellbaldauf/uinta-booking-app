"use client";

import { useState, type FormEvent } from "react";
import { Field, inputStyle, buttonStyle, secondaryButtonStyle, ErrorBanner } from "@/components/ui/form";
import { AddressAutocompleteField } from "./AddressAutocompleteField";

export type BookingDetails = {
  fullName: string;
  email: string;
  phone: string;
  address: string;
  iceMakerBrand: string;
  iceMakerModel: string;
  // Opt-in to the separate daily-quotes email list (Kit). Never gates submit.
  quotesOptIn: boolean;
};

const EMPTY: BookingDetails = {
  fullName: "",
  email: "",
  phone: "",
  address: "",
  iceMakerBrand: "",
  iceMakerModel: "",
  quotesOptIn: false,
};

export function DetailsStep({
  initial,
  busy,
  error,
  onBack,
  onSubmit,
}: {
  initial?: BookingDetails;
  busy: boolean;
  error: string | null;
  onBack: () => void;
  onSubmit: (details: BookingDetails) => void;
}) {
  const [d, setD] = useState<BookingDetails>(initial ?? EMPTY);
  const set = (k: keyof BookingDetails) => (e: { target: { value: string } }) =>
    setD((prev) => ({ ...prev, [k]: e.target.value }));

  const emailOk = /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(d.email.trim());
  const canSubmit =
    d.fullName.trim() && emailOk && d.phone.trim() && d.address.trim() && !busy;

  function handleSubmit(e: FormEvent) {
    e.preventDefault();
    if (!canSubmit) return;
    onSubmit({
      fullName: d.fullName.trim(),
      email: d.email.trim(),
      phone: d.phone.trim(),
      address: d.address.trim(),
      iceMakerBrand: d.iceMakerBrand.trim(),
      iceMakerModel: d.iceMakerModel.trim(),
      quotesOptIn: d.quotesOptIn,
    });
  }

  return (
    <form
      onSubmit={handleSubmit}
      style={{ display: "flex", flexDirection: "column", gap: "var(--space-4)" }}
    >
      <h1 style={{ fontSize: 22, margin: 0 }}>Book a cleaning</h1>

      <Field label="Your name">
        <input style={inputStyle} value={d.fullName} onChange={set("fullName")} autoComplete="name" />
      </Field>
      <Field label="Email">
        <input
          style={inputStyle}
          type="email"
          inputMode="email"
          value={d.email}
          onChange={set("email")}
          autoComplete="email"
        />
      </Field>
      <Field label="Phone">
        <input
          style={inputStyle}
          type="tel"
          inputMode="tel"
          value={d.phone}
          onChange={set("phone")}
          autoComplete="tel"
        />
      </Field>
      <Field label="Property address" hint="Start typing and pick your address from the list">
        <AddressAutocompleteField
          value={d.address}
          onChange={(address) => setD((prev) => ({ ...prev, address }))}
        />
      </Field>
      <Field label="Ice maker brand" hint="Optional">
        <input style={inputStyle} value={d.iceMakerBrand} onChange={set("iceMakerBrand")} />
      </Field>
      <Field label="Ice maker model" hint="Optional">
        <input style={inputStyle} value={d.iceMakerModel} onChange={set("iceMakerModel")} />
      </Field>

      {/* Separate opt-in for a personal daily-quotes email list (Kit, not our
          booking emails). Dashed card + "Optional" eyebrow + muted text keep it
          visually distinct from the required payment-authorization checkbox. */}
      <div
        style={{
          display: "flex",
          flexDirection: "column",
          gap: 6,
          padding: "var(--space-3)",
          border: "1px dashed var(--color-border)",
          borderRadius: "var(--radius)",
          background: "var(--color-bg-subtle)",
        }}
      >
        <span
          style={{
            fontSize: 11,
            fontWeight: 700,
            letterSpacing: "0.06em",
            textTransform: "uppercase",
            color: "var(--color-fg-muted)",
          }}
        >
          Optional
        </span>
        <label
          style={{
            display: "flex",
            gap: 10,
            alignItems: "flex-start",
            fontSize: 13,
            lineHeight: 1.5,
            color: "var(--color-fg-muted)",
          }}
        >
          <input
            type="checkbox"
            checked={d.quotesOptIn}
            onChange={(e) =>
              setD((prev) => ({ ...prev, quotesOptIn: e.target.checked }))
            }
            style={{ marginTop: 2, width: 16, height: 16, flexShrink: 0 }}
          />
          <span>
            Send me &ldquo;The 1% Better Starts with You&rdquo; &mdash; a daily
            email cycling through the 100 best quotes of all time, on the belief
            that absorbing the best 100 over and over beats skimming a thousand.
          </span>
        </label>
      </div>

      {error && <ErrorBanner>{error}</ErrorBanner>}

      <div style={{ display: "flex", gap: "var(--space-2)" }}>
        <button
          type="button"
          onClick={onBack}
          style={{ ...secondaryButtonStyle, width: "auto", flex: "0 0 auto", padding: "14px 16px" }}
        >
          Back
        </button>
        <button type="submit" disabled={!canSubmit} style={{ ...buttonStyle, opacity: canSubmit ? 1 : 0.6 }}>
          {busy ? "Checking availability…" : "See available times"}
        </button>
      </div>
    </form>
  );
}
