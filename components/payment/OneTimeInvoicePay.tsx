"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import { loadStripe, type Stripe } from "@stripe/stripe-js";
import { CardElement, Elements, ExpressCheckoutElement, useElements, useStripe } from "@stripe/react-stripe-js";
import { ErrorBanner, buttonStyle } from "@/components/ui/form";
import { AgreementStep } from "@/components/booking/AgreementStep";
import { agreementIsCurrentFor, ONE_TIME_AGREEMENT_VERSION } from "@/lib/agreement";
import { formatUsd } from "@/lib/settings";
import { formatVisitDate } from "@/lib/format";
import { arrivalBlockLabel } from "@/lib/schedule/blocks";
import type { InvoiceJob } from "@/lib/invoicePayment";

// One-time payment link customers: review the invoice and pay with a card on one
// page. The card is used for this payment only. It is never attached to a Stripe
// Customer and never saved. The PaymentIntent lists "card" as its only method, and
// the form is a CardElement (not the multi-method PaymentElement, which still
// rendered Link / bank / Klarna tabs in testing) plus an Express Checkout Element
// limited to Apple Pay and Google Pay. Link, bank transfers and buy-now-pay-later
// are never offered.

const PUBLISHABLE_KEY = process.env.NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY;
let stripePromise: Promise<Stripe | null> | null = null;
function getStripePromise() {
  if (!PUBLISHABLE_KEY) return null;
  if (!stripePromise) stripePromise = loadStripe(PUBLISHABLE_KEY);
  return stripePromise;
}

type Phase = "agreement" | "loading" | "form" | "paid" | "processing" | "error";

export function OneTimeInvoicePay({ token, job }: { token: string; job: InvoiceJob }) {
  const router = useRouter();
  const agreementCurrent = agreementIsCurrentFor(job.serviceAgreementVersion, "one_time_link");
  const [accepted, setAccepted] = useState(agreementCurrent);
  const [phase, setPhase] = useState<Phase>(agreementCurrent ? "loading" : "agreement");
  const [clientSecret, setClientSecret] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const startedRef = useRef(false);
  const windowLabel = arrivalBlockLabel(job.arrivalBlock, job.blocksNeeded);

  // A 3DS redirect lands back here with redirect_status in the URL; the intent
  // call below then reports "paid" (or hands back the form again if it failed).
  useEffect(() => {
    if (!accepted || startedRef.current) return;
    startedRef.current = true;
    (async () => {
      try {
        const res = await fetch("/api/payment/pay-link-intent", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            token,
            ...(!agreementCurrent ? { agreement: { accepted: true, version: ONE_TIME_AGREEMENT_VERSION } } : {}),
          }),
        });
        const data = await res.json().catch(() => ({}));
        if (res.status === 404) {
          setPhase("paid");
          return;
        }
        if (!res.ok) {
          setError(data?.error ?? "We couldn't start your payment. Please try again.");
          setPhase("error");
          return;
        }
        if (data.state === "paid") setPhase("paid");
        else if (data.state === "processing") setPhase("processing");
        else {
          setClientSecret(data.clientSecret);
          setPhase("form");
        }
      } catch {
        setError("Something went wrong. Please try again.");
        setPhase("error");
      }
    })();
  }, [accepted, agreementCurrent, token]);

  const summary = (
    <>
      <h1 style={{ fontSize: 22, margin: 0 }}>
        {job.customerName ? `Hi ${job.customerName.split(" ")[0]} - ` : ""}here&apos;s what you owe
      </h1>
      <div
        style={{
          padding: "var(--space-3)",
          border: "1px solid var(--color-border)",
          borderRadius: "var(--radius)",
          display: "flex",
          justifyContent: "space-between",
          gap: 12,
        }}
      >
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
    </>
  );

  if (phase === "agreement") {
    return (
      <AgreementStep
        payByLink
        staleAcceptance={job.serviceAgreementVersion != null}
        error={null}
        onBack={() => {
          router.push("/");
        }}
        onContinue={() => {
          setAccepted(true);
          setPhase("loading");
        }}
      />
    );
  }

  if (phase === "paid") {
    return (
      <div style={{ display: "flex", flexDirection: "column", gap: "var(--space-3)" }}>
        <h1 style={{ fontSize: 22, margin: 0 }}>Payment received</h1>
        <p style={{ margin: 0 }}>
          Thank you. This invoice is paid. You&apos;ll get an email shortly with your receipt and your next visit.
        </p>
      </div>
    );
  }

  if (phase === "processing") {
    return (
      <div style={{ display: "flex", flexDirection: "column", gap: "var(--space-3)" }}>
        <h1 style={{ fontSize: 22, margin: 0 }}>Payment processing</h1>
        <p style={{ margin: 0 }}>Your payment is being confirmed. You&apos;ll get a receipt by email shortly.</p>
      </div>
    );
  }

  return (
    <div style={{ display: "flex", flexDirection: "column", gap: "var(--space-4)" }}>
      {summary}
      {phase === "loading" && (
        <p style={{ color: "var(--color-fg-muted)", fontSize: 14 }}>Loading secure payment form…</p>
      )}
      {phase === "error" && <ErrorBanner>{error}</ErrorBanner>}
      {phase === "form" && clientSecret && (
        <PayForm clientSecret={clientSecret} amountCents={job.amountCents} onPaid={() => setPhase("paid")} />
      )}
    </div>
  );
}

function PayForm({
  clientSecret,
  amountCents,
  onPaid,
}: {
  clientSecret: string;
  amountCents: number;
  onPaid: () => void;
}) {
  const stripe = getStripePromise();
  const options = useMemo(
    () => ({ clientSecret, appearance: { theme: "stripe" as const, variables: { borderRadius: "8px" } } }),
    [clientSecret]
  );
  if (!stripe) {
    return <ErrorBanner>Payment isn&apos;t configured yet (missing Stripe publishable key).</ErrorBanner>;
  }
  return (
    <Elements stripe={stripe} options={options}>
      <CardForm clientSecret={clientSecret} amountCents={amountCents} onPaid={onPaid} />
    </Elements>
  );
}

function CardForm({ clientSecret, amountCents, onPaid }: { clientSecret: string; amountCents: number; onPaid: () => void }) {
  const stripe = useStripe();
  const elements = useElements();
  const [busy, setBusy] = useState(false);
  const [ready, setReady] = useState(false);
  const [error, setError] = useState<string | null>(null);
  // Hard stop on double submit: the PaymentIntent is single-use anyway, so Stripe
  // can never charge twice, but this also stops the second click firing at all.
  const submittedRef = useRef(false);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!stripe || !elements || submittedRef.current) return;
    submittedRef.current = true;
    setBusy(true);
    setError(null);

    const card = elements.getElement(CardElement);
    if (!card) {
      submittedRef.current = false;
      setBusy(false);
      return;
    }
    const { error: confirmError, paymentIntent } = await stripe.confirmCardPayment(clientSecret, {
      payment_method: { card },
    });

    if (confirmError) {
      submittedRef.current = false;
      setBusy(false);
      setError(
        confirmError.type === "card_error" || confirmError.type === "validation_error"
          ? (confirmError.message ?? "That card didn't go through. Please check it or try another card.")
          : "We couldn't complete the payment. Nothing was charged. Please try again."
      );
      return;
    }
    if (paymentIntent && (paymentIntent.status === "succeeded" || paymentIntent.status === "processing")) {
      onPaid();
      return;
    }
    // A redirect (3DS) is in progress; the page reloads and re-checks.
    submittedRef.current = false;
    setBusy(false);
  }

  return (
    <form onSubmit={handleSubmit} style={{ display: "flex", flexDirection: "column", gap: "var(--space-4)" }}>
      <ExpressCheckoutElement
        onConfirm={async () => {
          if (!stripe || !elements || submittedRef.current) return;
          submittedRef.current = true;
          const { error: walletError, paymentIntent } = await stripe.confirmPayment({
            elements,
            clientSecret,
            confirmParams: { return_url: window.location.href },
            redirect: "if_required",
          });
          if (walletError) {
            submittedRef.current = false;
            setError(walletError.message ?? "We couldn't complete the payment. Nothing was charged.");
          } else if (paymentIntent && (paymentIntent.status === "succeeded" || paymentIntent.status === "processing")) {
            onPaid();
          } else {
            submittedRef.current = false;
          }
        }}
        options={{
          paymentMethods: { link: "never", amazonPay: "never", paypal: "never", klarna: "never", applePay: "never", googlePay: "auto" },
        }}
      />
      <div style={{ padding: "12px 14px", border: "1px solid var(--color-border, #d0d5dd)", borderRadius: 8, background: "#fff" }}>
        <CardElement onReady={() => setReady(true)} options={{ hidePostalCode: false, disableLink: true }} />
      </div>
      <p style={{ margin: 0, fontSize: 14, color: "var(--color-fg-muted)" }}>
        Your card is used for this payment only. We won&apos;t save it for future visits.
      </p>
      {error && <ErrorBanner>{error}</ErrorBanner>}
      <button
        type="submit"
        disabled={busy || !ready || !stripe || !elements}
        style={{ ...buttonStyle, opacity: busy || !ready ? 0.6 : 1 }}
      >
        {busy ? "Processing…" : `Approve & pay ${formatUsd(amountCents)}`}
      </button>
    </form>
  );
}
