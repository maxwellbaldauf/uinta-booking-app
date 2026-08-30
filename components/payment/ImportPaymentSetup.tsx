"use client";

import { useState } from "react";
import { PaymentSetup, type PaymentSetupResult } from "@/components/payment/PaymentSetup";
import { ErrorBanner } from "@/components/ui/form";

// The client half of /pay/[token] (spec §6). Mounts the shared PaymentSetup
// with the setup_token context, then finalizes through /api/payment/finalize
// (which re-checks the token + SetupIntent server-side, writes the card, and
// consumes the token).
export function ImportPaymentSetup({
  token,
  customerName,
  existingCard,
}: {
  token: string;
  customerName: string | null;
  existingCard: string | null;
}) {
  const [phase, setPhase] = useState<"form" | "done">("form");
  const [savedCard, setSavedCard] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  async function handleComplete(result: PaymentSetupResult) {
    setError(null);
    const res = await fetch("/api/payment/finalize", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        context: "setup_token",
        token,
        setupIntentId: result.setupIntentId,
        authorized: true,
      }),
    });
    const data = await res.json().catch(() => ({}));
    if (!res.ok || !data.ok) {
      setError(data?.error ?? "We couldn't save your card. Please try again.");
      return;
    }
    setSavedCard(data.paymentDisplay ?? "Card");
    setPhase("done");
  }

  if (phase === "done") {
    return (
      <div style={{ display: "flex", flexDirection: "column", gap: "var(--space-3)" }}>
        <h1 style={{ fontSize: 22, margin: 0 }}>You&apos;re all set</h1>
        <p style={{ color: "var(--color-fg-muted)", margin: 0 }}>
          {savedCard ? `${savedCard} is on file.` : "Your card is on file."} We&apos;ll
          charge it after each cleaning — nothing to do now.
        </p>
      </div>
    );
  }

  return (
    <div style={{ display: "flex", flexDirection: "column", gap: "var(--space-4)" }}>
      <div>
        <h1 style={{ fontSize: 22, margin: 0 }}>
          {customerName ? `Hi ${customerName.split(" ")[0]} — ` : ""}add your card
        </h1>
        <p style={{ color: "var(--color-fg-muted)", margin: "4px 0 0" }}>
          We&apos;re moving your ice machine cleaning service over. Add a card so we
          can charge you after each visit — it isn&apos;t charged now.
        </p>
      </div>

      {existingCard && (
        <p style={{ fontSize: 13, color: "var(--color-fg-muted)", margin: 0 }}>
          You currently have {existingCard} on file. Saving a new card replaces it.
        </p>
      )}

      {error && <ErrorBanner>{error}</ErrorBanner>}

      <PaymentSetup
        request={{ context: "setup_token", token }}
        onComplete={handleComplete}
        submitLabel="Save my card"
        completingLabel="Saving…"
      />
    </div>
  );
}
