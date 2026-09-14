"use client";

import { useState } from "react";
import { PaymentSetup, type PaymentSetupResult } from "@/components/payment/PaymentSetup";
import { AgreementStep } from "@/components/booking/AgreementStep";
import { ErrorBanner, buttonStyle } from "@/components/ui/form";
import { agreementIsCurrent, SERVICE_AGREEMENT_VERSION } from "@/lib/agreement";
import { formatUsd } from "@/lib/settings";
import { formatVisitDate } from "@/lib/format";
import type { PendingBacklogJob } from "@/lib/backlogPayment";

type Step = "summary" | "agreement" | "payment" | "done";

type ChargeResult = { jobId: string; ok: boolean; error?: string };

// The backlog counterpart to ImportPaymentSetup — for a customer with one or
// more unpaid backlog jobs. Unlike the plain import case, this always
// charges (no "just save a card" branch) and, for a first-time customer,
// requires accepting the service agreement before the card step — the same
// protection anyone entering recurring billing through the normal booking
// flow gets.
export function BacklogPaymentSetup({
  token,
  customerName,
  jobs,
  serviceAgreementVersion,
}: {
  token: string;
  customerName: string | null;
  jobs: PendingBacklogJob[];
  serviceAgreementVersion: string | null;
}) {
  const agreementCurrent = agreementIsCurrent(serviceAgreementVersion);
  const [step, setStep] = useState<Step>("summary");
  const [error, setError] = useState<string | null>(null);
  const [paymentDisplay, setPaymentDisplay] = useState<string | null>(null);
  const [results, setResults] = useState<ChargeResult[]>([]);

  const totalCents = jobs.reduce((sum, j) => sum + j.priceCents, 0);

  async function handlePaymentComplete(result: PaymentSetupResult) {
    setError(null);
    const res = await fetch("/api/payment/finalize-backlog", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        token,
        setupIntentId: result.setupIntentId,
        authorized: true,
        ...(!agreementCurrent
          ? { agreement: { accepted: true, version: SERVICE_AGREEMENT_VERSION } }
          : {}),
      }),
    });
    const data = await res.json().catch(() => ({}));
    if (!res.ok || !data.ok) {
      if (data?.agreementRequired) {
        setStep("agreement");
        setError(data?.error ?? "Please accept the current Service Agreement.");
        return;
      }
      setError(data?.error ?? "We couldn't save your card. Please try again.");
      return;
    }
    setPaymentDisplay(data.paymentDisplay ?? "Card");
    setResults((data.results as ChargeResult[]) ?? []);
    setStep("done");
  }

  if (step === "done") {
    const failedResults = results.filter((r) => !r.ok);
    return (
      <div style={{ display: "flex", flexDirection: "column", gap: "var(--space-3)" }}>
        <h1 style={{ fontSize: 22, margin: 0 }}>You&apos;re all set</h1>
        <p style={{ color: "var(--color-fg-muted)", margin: 0 }}>
          {paymentDisplay ? `${paymentDisplay} is on file.` : "Your card is on file."}
        </p>
        {failedResults.length === 0 ? (
          <p style={{ margin: 0 }}>
            {formatUsd(totalCents)} charged for{" "}
            {jobs.length === 1 ? "your visit" : `your ${jobs.length} visits`}. We&apos;ll
            charge your card after each future cleaning too — nothing else to do now.
          </p>
        ) : (
          <p style={{ margin: 0, color: "var(--color-warning)" }}>
            Your card is saved, but {failedResults.length === 1 ? "one charge" : "some charges"}{" "}
            didn&apos;t go through. We&apos;ll follow up to sort it out.
          </p>
        )}
      </div>
    );
  }

  if (step === "agreement") {
    return (
      <AgreementStep
        staleAcceptance={serviceAgreementVersion != null}
        error={error}
        onBack={() => setStep("summary")}
        onContinue={() => setStep("payment")}
      />
    );
  }

  if (step === "payment") {
    return (
      <div style={{ display: "flex", flexDirection: "column", gap: "var(--space-4)" }}>
        <div>
          <h1 style={{ fontSize: 22, margin: 0 }}>Add your card</h1>
          <p style={{ color: "var(--color-fg-muted)", margin: "4px 0 0" }}>
            We&apos;ll save your card and charge {formatUsd(totalCents)} for{" "}
            {jobs.length === 1 ? "the visit below" : `the ${jobs.length} visits below`}.
          </p>
        </div>
        {error && <ErrorBanner>{error}</ErrorBanner>}
        <PaymentSetup
          request={{ context: "setup_token", token }}
          onComplete={handlePaymentComplete}
          submitLabel="Save card & pay"
          completingLabel="Charging…"
        />
      </div>
    );
  }

  // step === "summary"
  return (
    <div style={{ display: "flex", flexDirection: "column", gap: "var(--space-4)" }}>
      <div>
        <h1 style={{ fontSize: 22, margin: 0 }}>
          {customerName ? `Hi ${customerName.split(" ")[0]} — ` : ""}here&apos;s what you owe
        </h1>
        <p style={{ color: "var(--color-fg-muted)", margin: "4px 0 0" }}>
          We cleaned your ice machine
          {jobs.length === 1 ? "" : ` on ${jobs.length} visits`}. Review below, then
          we&apos;ll ask you to accept our service agreement and add a card to finish up.
        </p>
      </div>

      <ul
        style={{
          listStyle: "none",
          padding: 0,
          margin: 0,
          display: "flex",
          flexDirection: "column",
          gap: "var(--space-2)",
        }}
      >
        {jobs.map((j) => (
          <li
            key={j.id}
            style={{
              display: "flex",
              justifyContent: "space-between",
              padding: "var(--space-3)",
              border: "1px solid var(--color-border)",
              borderRadius: "var(--radius)",
            }}
          >
            <span>
              {j.propertyLabel}
              {j.scheduledDate && (
                <>
                  {" "}
                  ·{" "}
                  <span style={{ color: "var(--color-fg-muted)" }}>
                    {formatVisitDate(j.scheduledDate, { withYear: true })}
                  </span>
                </>
              )}
            </span>
            <span style={{ fontWeight: 600 }}>{formatUsd(j.priceCents)}</span>
          </li>
        ))}
      </ul>

      <div
        style={{
          display: "flex",
          justifyContent: "space-between",
          fontWeight: 700,
          fontSize: 16,
        }}
      >
        <span>Total</span>
        <span>{formatUsd(totalCents)}</span>
      </div>

      <button
        type="button"
        onClick={() => setStep(agreementCurrent ? "payment" : "agreement")}
        style={buttonStyle}
      >
        Continue
      </button>
    </div>
  );
}
