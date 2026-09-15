"use client";

import { useState } from "react";
import { PaymentSetup, type PaymentSetupResult } from "@/components/payment/PaymentSetup";
import { ErrorBanner, buttonStyle } from "@/components/ui/form";
import { formatUsd } from "@/lib/settings";
import { formatVisitDate } from "@/lib/format";
import { arrivalBlockLabel } from "@/lib/schedule/blocks";
import type { InvoiceJob } from "@/lib/invoicePayment";

type Step = "review" | "charging" | "failed" | "done";

// The customer-approved-invoicing flow's payment page. Unlike
// BacklogPaymentSetup (built for customers with no card on file yet), most
// customers reaching this page already have one — scheduling only continues
// for properties on an active plan, which requires a card. So the happy path
// here is a single button with no Stripe Elements at all: approve, and the
// existing card on file gets charged server-side. Elements only appear if
// that charge comes back declined/expired (or there's no card on file at
// all, e.g. a payment method was removed after the visit was scheduled).
export function InvoiceApproval({ token, job }: { token: string; job: InvoiceJob }) {
  const [step, setStep] = useState<Step>("review");
  const [error, setError] = useState<string | null>(null);
  const [paymentDisplay, setPaymentDisplay] = useState<string | null>(job.paymentDisplay);

  const windowLabel = arrivalBlockLabel(job.arrivalBlock, job.blocksNeeded);

  async function approveWithCardOnFile() {
    setStep("charging");
    setError(null);
    try {
      const res = await fetch("/api/payment/approve-invoice", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ token }),
      });
      const data = await res.json().catch(() => ({}));
      if (!res.ok || !data.ok) {
        setError(data?.error ?? "We couldn't reach your card. Please try again.");
        setStep("failed");
        return;
      }
      setStep("done");
    } catch {
      setError("Something went wrong. Please try again.");
      setStep("failed");
    }
  }

  // Must throw rather than swallow a failure here — PaymentSetup's CardForm
  // only resets its "completing" phase and its submit-disabled ref inside
  // the catch block around this call (components/payment/PaymentSetup.tsx's
  // finish()). Returning normally on a declined-again card or a failed
  // server update would leave that button stuck showing "Charging…"
  // forever, with no way to retry short of a page reload. The thrown
  // message surfaces in CardForm's own error banner, right next to the
  // retry button, which is exactly where a card-declined message belongs.
  async function handleCardUpdateComplete(result: PaymentSetupResult) {
    setError(null);
    const res = await fetch("/api/payment/finalize-invoice-card", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ token, setupIntentId: result.setupIntentId }),
    });
    const data = await res.json().catch(() => ({}));
    if (!res.ok || !data.ok) {
      if (data?.paymentDisplay) setPaymentDisplay(data.paymentDisplay);
      throw new Error(data?.error ?? "We couldn't charge that card either. Please contact us.");
    }
    setPaymentDisplay(data.paymentDisplay ?? paymentDisplay);
    setStep("done");
  }

  if (step === "done") {
    return (
      <div style={{ display: "flex", flexDirection: "column", gap: "var(--space-3)" }}>
        <h1 style={{ fontSize: 22, margin: 0 }}>Payment received</h1>
        <p style={{ margin: 0 }}>
          {formatUsd(job.amountCents)} charged for your visit on{" "}
          {formatVisitDate(job.scheduledDate, { withYear: true })}. You&apos;ll get an email
          shortly confirming your next visit.
        </p>
      </div>
    );
  }

  const summary = (
    <>
      <h1 style={{ fontSize: 22, margin: 0 }}>
        {job.customerName ? `Hi ${job.customerName.split(" ")[0]} — ` : ""}here&apos;s what you owe
      </h1>
      <ul
        style={{
          listStyle: "none",
          padding: 0,
          margin: "var(--space-3) 0",
          display: "flex",
          flexDirection: "column",
          gap: "var(--space-2)",
        }}
      >
        <li
          style={{
            padding: "var(--space-3)",
            border: "1px solid var(--color-border)",
            borderRadius: "var(--radius)",
          }}
        >
          <div style={{ display: "flex", justifyContent: "space-between" }}>
            <span>
              {job.propertyLabel}
              {" · "}
              <span style={{ color: "var(--color-fg-muted)" }}>
                {formatVisitDate(job.scheduledDate, { withYear: true })}
                {windowLabel && windowLabel !== "—" ? `, ${windowLabel}` : ""}
              </span>
            </span>
            <span style={{ fontWeight: 700 }}>{formatUsd(job.amountCents)}</span>
          </div>
        </li>
      </ul>
    </>
  );

  if (step === "failed" || (!job.hasDefaultPaymentMethod && step === "review")) {
    return (
      <div style={{ display: "flex", flexDirection: "column", gap: "var(--space-4)" }}>
        {summary}
        {error && <ErrorBanner>{error}</ErrorBanner>}
        {!job.hasDefaultPaymentMethod && !error && (
          <p style={{ color: "var(--color-fg-muted)", margin: 0 }}>
            No card on file — add one below to pay {formatUsd(job.amountCents)}.
          </p>
        )}
        {error && paymentDisplay && (
          <p style={{ color: "var(--color-fg-muted)", margin: 0 }}>
            That didn&apos;t go through on {paymentDisplay}. Add a different card to retry.
          </p>
        )}
        <PaymentSetup
          request={{ context: "invoice_token", token }}
          onComplete={handleCardUpdateComplete}
          submitLabel="Save card & pay"
          completingLabel="Charging…"
        />
      </div>
    );
  }

  return (
    <div style={{ display: "flex", flexDirection: "column", gap: "var(--space-4)" }}>
      {summary}
      {paymentDisplay && (
        <p style={{ color: "var(--color-fg-muted)", margin: 0 }}>
          We&apos;ll charge {paymentDisplay}, the card on file.
        </p>
      )}
      {error && <ErrorBanner>{error}</ErrorBanner>}
      <button
        type="button"
        disabled={step === "charging"}
        onClick={approveWithCardOnFile}
        style={buttonStyle}
      >
        {step === "charging" ? "Charging…" : `Approve & pay ${formatUsd(job.amountCents)}`}
      </button>
    </div>
  );
}
