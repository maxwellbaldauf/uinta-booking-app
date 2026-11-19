"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { AgreementStep } from "@/components/booking/AgreementStep";
import { agreementVersionFor, type AgreementFrequency, type FrequencyLine } from "@/lib/agreement";

// One-time-payment-link customers sign here: the same AgreementStep, then a plain
// confirmation. No card form anywhere on this page.
export function AgreementOnly({
  token,
  customerName,
  alreadyAccepted,
  hadOlderVersion,
  frequency,
  lines,
  payByLink,
}: {
  token: string;
  customerName: string | null;
  alreadyAccepted: boolean;
  hadOlderVersion: boolean;
  frequency: AgreementFrequency;
  lines: FrequencyLine[];
  // false = a card-on-file customer (updated agreement, e.g. a frequency switch): no payment wording.
  payByLink: boolean;
}) {
  const router = useRouter();
  const [done, setDone] = useState(alreadyAccepted);
  const [error, setError] = useState<string | null>(null);

  async function accept() {
    setError(null);
    try {
      const res = await fetch("/api/agreement/accept", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ token, version: agreementVersionFor(payByLink ? "one_time_link" : "card_on_file", frequency) }),
      });
      const data = await res.json().catch(() => ({}));
      if (!res.ok || !data.ok) {
        setError(data?.error ?? "Something went wrong. Please try again.");
        return;
      }
      setDone(true);
    } catch {
      setError("Something went wrong. Please try again.");
    }
  }

  if (done) {
    return (
      <div style={{ display: "flex", flexDirection: "column", gap: "var(--space-3)" }}>
        <h1 style={{ fontSize: 22, margin: 0 }}>Thank you{customerName ? `, ${customerName.split(" ")[0]}` : ""}</h1>
        <p style={{ margin: 0 }}>
          {payByLink
            ? "Your service agreement is recorded. There's nothing to pay now and no card to enter. After each visit we'll email you an invoice with a link to pay."
            : "Your updated service agreement is recorded. Nothing else to do, and your card on file is unchanged."}
        </p>
      </div>
    );
  }

  return (
    <AgreementStep
      staleAcceptance={hadOlderVersion}
      error={error}
      payByLink={payByLink}
      frequency={frequency}
      lines={lines}
      onBack={() => {
        router.push("/");
      }}
      onContinue={accept}
    />
  );
}
