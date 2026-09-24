"use client";

import { useState } from "react";
import { buttonStyle, secondaryButtonStyle, ErrorBanner } from "@/components/ui/form";
import { arrivalBlockLabel } from "@/lib/schedule/blocks";
import { formatSlotDate } from "@/components/booking/SlotGrid";
import { acceptClusterSuggestion, declineClusterSuggestion } from "@/app/cluster-consent/[token]/actions";

type Mode = "view" | "accepted" | "declined";

export type ClusterConsentView = {
  token: string;
  originalDate: string;
  originalArrivalBlock: number;
  proposedDate: string;
  proposedArrivalBlock: number;
  blocksNeeded: number;
  deadline: string | null;
};

// The accept/decline half of the geographic-clustering feature's consent
// flow — a genuinely new primitive for this codebase (unlike VisitPortal's
// reschedule, where the customer picks their own new time and it applies
// immediately, this is Uinta Ice's own suggestion, presented for the
// customer to accept or decline, never applied without that explicit
// action).
export function ClusterConsentPortal(props: ClusterConsentView) {
  const [mode, setMode] = useState<Mode>("view");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function handleAccept() {
    setBusy(true);
    setError(null);
    const res = await acceptClusterSuggestion(props.token);
    setBusy(false);
    if (res.ok) {
      setMode("accepted");
      return;
    }
    setError(res.error);
  }

  async function handleDecline() {
    setBusy(true);
    setError(null);
    const res = await declineClusterSuggestion(props.token);
    setBusy(false);
    if (res.ok) {
      setMode("declined");
      return;
    }
    setError(res.error);
  }

  if (mode === "accepted") {
    return (
      <div style={{ display: "flex", flexDirection: "column", gap: "var(--space-3)" }}>
        <h1 style={{ fontSize: 22, margin: 0 }}>Visit moved</h1>
        <div
          style={{
            border: "1px solid var(--color-border)",
            borderRadius: "var(--radius)",
            padding: "var(--space-4)",
          }}
        >
          <div style={{ fontSize: 18, fontWeight: 600 }}>{formatSlotDate(props.proposedDate)}</div>
          <div style={{ color: "var(--color-fg-muted)" }}>
            Arrival window: {arrivalBlockLabel(props.proposedArrivalBlock, props.blocksNeeded)}
          </div>
        </div>
        <p style={{ color: "var(--color-fg-muted)", margin: 0, fontSize: 13 }}>
          An updated confirmation and calendar invite are on the way. Thanks for helping us out.
        </p>
      </div>
    );
  }

  if (mode === "declined") {
    return (
      <div style={{ display: "flex", flexDirection: "column", gap: "var(--space-3)" }}>
        <h1 style={{ fontSize: 22, margin: 0 }}>No problem</h1>
        <p style={{ color: "var(--color-fg-muted)", margin: 0 }}>
          Your visit stays as originally scheduled — {formatSlotDate(props.originalDate)},{" "}
          {arrivalBlockLabel(props.originalArrivalBlock, props.blocksNeeded)}.
        </p>
      </div>
    );
  }

  return (
    <div style={{ display: "flex", flexDirection: "column", gap: "var(--space-4)" }}>
      <div>
        <h1 style={{ fontSize: 22, margin: 0 }}>A suggestion for your visit</h1>
        <p style={{ color: "var(--color-fg-muted)", margin: "4px 0 0" }}>
          We&rsquo;ll already be nearby around a different time, and moving your visit would help us
          get to you more efficiently. This is just a suggestion from us — entirely your call, and
          declining is completely fine.
        </p>
      </div>

      <div style={{ display: "flex", flexDirection: "column", gap: "var(--space-2)" }}>
        <div
          style={{
            border: "1px solid var(--color-border)",
            borderRadius: "var(--radius)",
            padding: "var(--space-3)",
          }}
        >
          <div style={{ fontSize: 12, color: "var(--color-fg-muted)", marginBottom: 2 }}>
            Current visit
          </div>
          <div style={{ fontWeight: 600 }}>{formatSlotDate(props.originalDate)}</div>
          <div style={{ color: "var(--color-fg-muted)" }}>
            {arrivalBlockLabel(props.originalArrivalBlock, props.blocksNeeded)}
          </div>
        </div>
        <div
          style={{
            border: "1px solid var(--color-primary)",
            borderRadius: "var(--radius)",
            padding: "var(--space-3)",
          }}
        >
          <div style={{ fontSize: 12, color: "var(--color-fg-muted)", marginBottom: 2 }}>
            Suggested visit
          </div>
          <div style={{ fontWeight: 600 }}>{formatSlotDate(props.proposedDate)}</div>
          <div style={{ color: "var(--color-fg-muted)" }}>
            {arrivalBlockLabel(props.proposedArrivalBlock, props.blocksNeeded)}
          </div>
        </div>
      </div>

      {props.deadline && (
        <p style={{ fontSize: 13, color: "var(--color-fg-muted)", margin: 0 }}>
          Please respond soon — after the deadline, we&rsquo;ll automatically keep your original
          time, no action needed on your part either way.
        </p>
      )}

      {error && <ErrorBanner>{error}</ErrorBanner>}

      <div style={{ display: "flex", gap: "var(--space-2)" }}>
        <button
          type="button"
          disabled={busy}
          onClick={handleDecline}
          style={{ ...secondaryButtonStyle, opacity: busy ? 0.6 : 1 }}
        >
          Keep my original time
        </button>
        <button
          type="button"
          disabled={busy}
          onClick={handleAccept}
          style={{ ...buttonStyle, opacity: busy ? 0.6 : 1 }}
        >
          {busy ? "Saving…" : "Move my visit"}
        </button>
      </div>
    </div>
  );
}
