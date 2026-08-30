"use client";

import { useState, type FormEvent } from "react";
import Link from "next/link";
import { submitContactForm } from "@/app/contact/actions";
import { Field, inputStyle, buttonStyle, ErrorBanner } from "@/components/ui/form";

export type ContactPrefill = Partial<{
  name: string;
  email: string;
  phone: string;
  address: string;
  brand: string;
  model: string;
  from: string;
}>;

const FROM_INTRO: Record<string, { title: string; body: string }> = {
  out_of_area: {
    title: "Outside our service area",
    body: "Your address is outside where we currently service. Leave your details and we'll reach out if that changes.",
  },
  no_availability: {
    title: "No openings right now",
    body: "We don't have an open arrival window at the moment. Send your details and we'll get you scheduled.",
  },
  geocode_failed: {
    title: "We couldn't find that address",
    body: "Double-check the address below (or add a landmark) and we'll follow up.",
  },
};

export function ContactForm({ prefill }: { prefill: ContactPrefill }) {
  const intro = prefill.from ? FROM_INTRO[prefill.from] : undefined;
  const [f, setF] = useState({
    fullName: prefill.name ?? "",
    email: prefill.email ?? "",
    phone: prefill.phone ?? "",
    address: prefill.address ?? "",
    iceMakerBrand: prefill.brand ?? "",
    iceMakerModel: prefill.model ?? "",
    message: "",
  });
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [sent, setSent] = useState(false);

  const set = (k: keyof typeof f) => (e: { target: { value: string } }) =>
    setF((prev) => ({ ...prev, [k]: e.target.value }));

  const canSubmit = (f.email.trim() || f.phone.trim()) && !busy;

  async function handleSubmit(e: FormEvent) {
    e.preventDefault();
    if (!canSubmit) return;
    setBusy(true);
    setError(null);
    const res = await submitContactForm(f);
    setBusy(false);
    if (res.ok) setSent(true);
    else setError(res.error);
  }

  if (sent) {
    return (
      <div style={{ display: "flex", flexDirection: "column", gap: "var(--space-3)" }}>
        <h1 style={{ fontSize: 22, margin: 0 }}>Thanks — we&apos;ll be in touch</h1>
        <p style={{ color: "var(--color-fg-muted)", margin: 0 }}>
          We&apos;ve got your message and will reach out soon.
        </p>
        <Link href="/" style={{ color: "var(--color-primary)" }}>
          ← Back to home
        </Link>
      </div>
    );
  }

  return (
    <form
      onSubmit={handleSubmit}
      style={{ display: "flex", flexDirection: "column", gap: "var(--space-4)" }}
    >
      <h1 style={{ fontSize: 22, margin: 0 }}>{intro ? intro.title : "Contact us"}</h1>
      <p style={{ color: "var(--color-fg-muted)", margin: 0 }}>
        {intro ? intro.body : "Not ready to book, or have a question? Send us a note."}
      </p>

      <Field label="Your name">
        <input style={inputStyle} value={f.fullName} onChange={set("fullName")} autoComplete="name" />
      </Field>
      <Field label="Email">
        <input style={inputStyle} type="email" inputMode="email" value={f.email} onChange={set("email")} autoComplete="email" />
      </Field>
      <Field label="Phone">
        <input style={inputStyle} type="tel" inputMode="tel" value={f.phone} onChange={set("phone")} autoComplete="tel" />
      </Field>
      <Field label="Property address" hint="Optional">
        <input style={inputStyle} value={f.address} onChange={set("address")} autoComplete="street-address" />
      </Field>
      <Field label="Ice maker brand / model" hint="Optional">
        <div style={{ display: "flex", gap: "var(--space-2)" }}>
          <input style={inputStyle} placeholder="Brand" value={f.iceMakerBrand} onChange={set("iceMakerBrand")} />
          <input style={inputStyle} placeholder="Model" value={f.iceMakerModel} onChange={set("iceMakerModel")} />
        </div>
      </Field>
      <Field label="Message">
        <textarea
          style={{ ...inputStyle, minHeight: 96, resize: "vertical" }}
          value={f.message}
          onChange={set("message")}
        />
      </Field>

      {error && <ErrorBanner>{error}</ErrorBanner>}

      <button type="submit" disabled={!canSubmit} style={{ ...buttonStyle, opacity: canSubmit ? 1 : 0.6 }}>
        {busy ? "Sending…" : "Send message"}
      </button>
    </form>
  );
}
