"use client";

import { useState, type FormEvent } from "react";
import {
  Field,
  inputStyle,
  invalidInputStyle,
  buttonStyle,
  secondaryButtonStyle,
  ErrorBanner,
} from "@/components/ui/form";
import { validateContact, type ContactFields } from "@/lib/contactValidation";
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

  // A field's message shows after its first blur — never while they're still
  // typing the first time. It then clears live as the value becomes valid.
  // (Continue is disabled while invalid, so there is no "tried to continue" path.)
  // Prefilled values (coming back from a later step) are shown validated right
  // away, so a server-side rejection points at the offending field.
  const [touched, setTouched] = useState<Partial<Record<keyof ContactFields, boolean>>>(
    initial ? { fullName: true, email: true, phone: true, address: true } : {}
  );
  const touch = (k: keyof ContactFields) => () => setTouched((t) => ({ ...t, [k]: true }));

  const errors = validateContact(d);
  const valid = Object.keys(errors).length === 0;
  const canSubmit = valid && !busy;
  const shown = (k: keyof ContactFields) => (touched[k] ? errors[k] ?? null : null);
  const fieldProps = (k: keyof ContactFields) => {
    const msg = shown(k);
    return {
      id: `details-${k}`,
      onBlur: touch(k),
      "aria-invalid": msg ? true : undefined,
      "aria-describedby": msg ? `details-${k}-error` : undefined,
      style: msg ? { ...inputStyle, ...invalidInputStyle } : inputStyle,
    };
  };

  const missing: string[] = [];
  if (errors.fullName) missing.push("your name");
  if (errors.email) missing.push("a valid email");
  if (errors.phone) missing.push("a valid phone number");
  if (errors.address) missing.push("your street address");
  const missingLine =
    missing.length === 0
      ? null
      : `Add ${missing.length > 1 ? `${missing.slice(0, -1).join(", ")} and ${missing[missing.length - 1]}` : missing[0]} to continue`;

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
      noValidate
      onSubmit={handleSubmit}
      style={{ display: "flex", flexDirection: "column", gap: "var(--space-4)" }}
    >
      <h1 style={{ fontSize: 22, margin: 0 }}>Book a cleaning</h1>

      <Field label="Your name" error={shown("fullName")} errorId="details-fullName-error">
        <input {...fieldProps("fullName")} value={d.fullName} onChange={set("fullName")} autoComplete="name" />
      </Field>
      <Field label="Email" error={shown("email")} errorId="details-email-error">
        <input
          {...fieldProps("email")}
          type="email"
          inputMode="email"
          value={d.email}
          onChange={set("email")}
          autoComplete="email"
        />
      </Field>
      <Field label="Phone" error={shown("phone")} errorId="details-phone-error">
        <input
          {...fieldProps("phone")}
          type="tel"
          inputMode="tel"
          value={d.phone}
          onChange={set("phone")}
          autoComplete="tel"
        />
      </Field>
      <Field
        label="Property address"
        hint="Start typing and pick your address from the list"
        error={shown("address")}
        errorId="details-address-error"
      >
        <AddressAutocompleteField
          value={d.address}
          onChange={(address) => setD((prev) => ({ ...prev, address }))}
          onBlur={touch("address")}
          invalid={!!shown("address")}
          describedBy={shown("address") ? "details-address-error" : undefined}
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

      {missingLine && (
        <p style={{ margin: 0, fontSize: 13, color: "var(--color-fg-muted)" }}>
          {missingLine}
        </p>
      )}

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
