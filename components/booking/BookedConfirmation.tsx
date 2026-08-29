"use client";

import Link from "next/link";
import { buttonStyle } from "@/components/ui/form";

function formatSlotDate(iso: string): string {
  const [y, m, d] = iso.split("-").map(Number);
  const dt = new Date(Date.UTC(y, m - 1, d));
  const wd = ["Sunday", "Monday", "Tuesday", "Wednesday", "Thursday", "Friday", "Saturday"][
    dt.getUTCDay()
  ];
  const mo = [
    "January", "February", "March", "April", "May", "June",
    "July", "August", "September", "October", "November", "December",
  ][dt.getUTCMonth()];
  return `${wd}, ${mo} ${d}`;
}

export function BookedConfirmation({
  scheduledDate,
  blockLabel,
  address,
  token,
}: {
  scheduledDate: string;
  blockLabel: string;
  address: string;
  token: string;
}) {
  return (
    <div style={{ display: "flex", flexDirection: "column", gap: "var(--space-4)" }}>
      <h1 style={{ fontSize: 22, margin: 0 }}>You&apos;re booked</h1>

      <div
        style={{
          border: "1px solid var(--color-border)",
          borderRadius: "var(--radius)",
          padding: "var(--space-4)",
          display: "flex",
          flexDirection: "column",
          gap: "var(--space-2)",
        }}
      >
        <div style={{ fontSize: 18, fontWeight: 600 }}>{formatSlotDate(scheduledDate)}</div>
        <div style={{ color: "var(--color-fg-muted)" }}>Arrival window: {blockLabel}</div>
        <div style={{ color: "var(--color-fg-muted)" }}>{address}</div>
      </div>

      <p style={{ color: "var(--color-fg-muted)", margin: 0, lineHeight: 1.6 }}>
        A confirmation email with a calendar invite is on its way. Use the link
        below any time to reschedule or cancel.
      </p>

      <Link
        href={`/visit/${token}`}
        style={{ ...buttonStyle, textAlign: "center", textDecoration: "none" }}
      >
        Manage this visit
      </Link>
    </div>
  );
}
