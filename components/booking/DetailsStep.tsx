"use client";

import { useState, type FormEvent } from "react";
import { Field, inputStyle, buttonStyle, ErrorBanner } from "@/components/ui/form";

export type BookingDetails = {
  fullName: string;
  email: string;
  phone: string;
  address: string;
  iceMakerBrand: string;
  iceMakerModel: string;
};

const EMPTY: BookingDetails = {
  fullName: "",
  email: "",
  phone: "",
  address: "",
  iceMakerBrand: "",
  iceMakerModel: "",
};

export function DetailsStep({
  initial,
  busy,
  error,
  onSubmit,
}: {
  initial?: BookingDetails;
  busy: boolean;
  error: string | null;
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
      <Field label="Property address" hint="Street, city, state, ZIP">
        <input
          style={inputStyle}
          value={d.address}
          onChange={set("address")}
          autoComplete="street-address"
        />
      </Field>
      <Field label="Ice maker brand" hint="Optional">
        <input style={inputStyle} value={d.iceMakerBrand} onChange={set("iceMakerBrand")} />
      </Field>
      <Field label="Ice maker model" hint="Optional">
        <input style={inputStyle} value={d.iceMakerModel} onChange={set("iceMakerModel")} />
      </Field>

      {error && <ErrorBanner>{error}</ErrorBanner>}

      <button type="submit" disabled={!canSubmit} style={{ ...buttonStyle, opacity: canSubmit ? 1 : 0.6 }}>
        {busy ? "Checking availability…" : "See available times"}
      </button>
    </form>
  );
}
