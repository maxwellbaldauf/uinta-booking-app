"use client";

import Link from "next/link";
import { secondaryButtonStyle } from "@/components/ui/form";

export type DeadEndKind = "out_of_area" | "no_availability" | "geocode_failed";

const COPY: Record<
  DeadEndKind,
  { title: string; body: (saved: boolean) => string }
> = {
  out_of_area: {
    title: "We don't service your area yet",
    body: (saved) =>
      saved
        ? "Your address is outside our current service area. We've saved your details and will reach out if that changes. You can also send us a message with anything else."
        : "Your address is outside our current service area. Send us a message and we'll be in touch if that changes.",
  },
  no_availability: {
    title: "No openings in the next couple of weeks",
    body: (saved) =>
      saved
        ? "We don't have an open arrival window in our current schedule. We've saved your request and will reach out to get you booked. Add a note below if there's anything we should know."
        : "We don't have an open arrival window right now. Send us a message and we'll reach out to get you booked.",
  },
  geocode_failed: {
    title: "We couldn't find that address",
    body: () =>
      "We weren't able to locate that address to check our service area. Double-check it, or send us a message with the details and we'll follow up.",
  },
};

export function DeadEndNotice({
  kind,
  saved,
  details,
  onBack,
}: {
  kind: DeadEndKind;
  saved: boolean;
  details: { name: string; email: string; phone: string; address: string; brand: string; model: string };
  onBack: () => void;
}) {
  const copy = COPY[kind];
  const contactHref = {
    pathname: "/contact",
    query: {
      name: details.name,
      email: details.email,
      phone: details.phone,
      address: details.address,
      brand: details.brand,
      model: details.model,
      from: kind,
    },
  };

  return (
    <div style={{ display: "flex", flexDirection: "column", gap: "var(--space-4)" }}>
      <h1 style={{ fontSize: 22, margin: 0 }}>{copy.title}</h1>
      <p style={{ color: "var(--color-fg-muted)", margin: 0, lineHeight: 1.6 }}>
        {copy.body(saved)}
      </p>

      <Link
        href={contactHref}
        style={{ ...secondaryButtonStyle, textAlign: "center", textDecoration: "none" }}
      >
        Send us a message
      </Link>
      <button
        type="button"
        onClick={onBack}
        style={{
          background: "none",
          border: "none",
          color: "var(--color-primary)",
          fontSize: 14,
          padding: 0,
        }}
      >
        ← Edit my details
      </button>
    </div>
  );
}
