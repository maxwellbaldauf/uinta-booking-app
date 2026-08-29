"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { loadStripe, type Stripe } from "@stripe/stripe-js";
import {
  Elements,
  PaymentElement,
  useElements,
  useStripe,
} from "@stripe/react-stripe-js";
import { buttonStyle, ErrorBanner } from "@/components/ui/form";

// ---------------------------------------------------------------------------
// Shared card-on-file setup (spec §4). Used by the booking flow, the imported-
// customer payment page (§6), and the per-property "use a different card"
// option. It collects a card via Stripe Elements + a required authorization
// checkbox, confirms a card-only SetupIntent, and hands the confirmed
// SetupIntent id back to the host — which decides what to persist it against.
//
// This component never writes to the database. Cards only — the SetupIntent is
// created server-side with payment_method_types: ["card"].
// ---------------------------------------------------------------------------

export type SetupIntentRequest =
  | { context: "new_customer"; email: string; name?: string; phone?: string }
  | { context: "existing_customer"; customerId: string }
  | { context: "setup_token"; token: string };

export type PaymentSetupResult = {
  setupIntentId: string;
  stripeCustomerId: string;
};

type Props = {
  request: SetupIntentRequest;
  onComplete: (result: PaymentSetupResult) => void | Promise<void>;
  submitLabel?: string;
  /** Shown on the button while onComplete() is running. */
  completingLabel?: string;
};

const AUTHORIZATION_TEXT =
  "I authorize Uinta Ice Co to charge my card on file for services performed.";

const PUBLISHABLE_KEY = process.env.NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY;

let stripePromise: Promise<Stripe | null> | null = null;
function getStripePromise(): Promise<Stripe | null> | null {
  if (!PUBLISHABLE_KEY) return null;
  if (!stripePromise) stripePromise = loadStripe(PUBLISHABLE_KEY);
  return stripePromise;
}

export function PaymentSetup(props: Props) {
  const [clientSecret, setClientSecret] = useState<string | null>(null);
  const [stripeCustomerId, setStripeCustomerId] = useState<string | null>(null);
  const [initError, setInitError] = useState<string | null>(null);

  // Serialize the request so the effect refires only if the request changes.
  const requestKey = JSON.stringify(props.request);

  useEffect(() => {
    // React 18 strict mode double-invokes this in dev: the first pass is
    // cancelled by the cleanup, the second sets state. That creates one
    // throwaway SetupIntent in dev (harmless — unconfirmed SetupIntents
    // expire on their own); production runs the effect once.
    let cancelled = false;
    setClientSecret(null);
    setStripeCustomerId(null);
    setInitError(null);

    (async () => {
      try {
        const res = await fetch("/api/payment/setup-intent", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: requestKey,
        });
        const data = await res.json();
        if (cancelled) return;
        if (!res.ok) {
          setInitError(data?.error ?? "Could not start card setup.");
          return;
        }
        setClientSecret(data.clientSecret);
        setStripeCustomerId(data.stripeCustomerId);
      } catch {
        if (!cancelled) setInitError("Could not reach the payment service.");
      }
    })();

    return () => {
      cancelled = true;
    };
  }, [requestKey]);

  const stripe = getStripePromise();

  if (!stripe) {
    return (
      <ErrorBanner>
        Payment isn&apos;t configured yet (missing Stripe publishable key).
      </ErrorBanner>
    );
  }

  if (initError) return <ErrorBanner>{initError}</ErrorBanner>;

  if (!clientSecret || !stripeCustomerId) {
    return (
      <p style={{ color: "var(--color-fg-muted)", fontSize: 14 }}>
        Loading secure payment form…
      </p>
    );
  }

  return (
    <Elements
      stripe={stripe}
      options={{
        clientSecret,
        appearance: { theme: "stripe", variables: { borderRadius: "8px" } },
      }}
    >
      <CardForm
        stripeCustomerId={stripeCustomerId}
        onComplete={props.onComplete}
        submitLabel={props.submitLabel ?? "Save card"}
        completingLabel={props.completingLabel ?? "Saving…"}
      />
    </Elements>
  );
}

function CardForm({
  stripeCustomerId,
  onComplete,
  submitLabel,
  completingLabel,
}: {
  stripeCustomerId: string;
  onComplete: (result: PaymentSetupResult) => void | Promise<void>;
  submitLabel: string;
  completingLabel: string;
}) {
  const stripe = useStripe();
  const elements = useElements();

  const [authorized, setAuthorized] = useState(false);
  const [phase, setPhase] = useState<"idle" | "confirming" | "completing">("idle");
  const [error, setError] = useState<string | null>(null);
  const [elementReady, setElementReady] = useState(false);
  const completedRef = useRef(false);

  const finish = useCallback(
    async (setupIntentId: string) => {
      if (completedRef.current) return;
      completedRef.current = true;
      setPhase("completing");
      try {
        await onComplete({ setupIntentId, stripeCustomerId });
      } catch (err) {
        completedRef.current = false;
        setPhase("idle");
        setError(
          err instanceof Error ? err.message : "Something went wrong finishing up."
        );
      }
    },
    [onComplete, stripeCustomerId]
  );

  // Recover from a 3DS redirect: Stripe appends ?setup_intent=…&redirect_status=…
  // to the return_url. If it came back succeeded, pick up where we left off.
  useEffect(() => {
    if (!stripe) return;
    const params = new URLSearchParams(window.location.search);
    if (params.get("redirect_status") !== "succeeded") return;
    const returnedSecret = params.get("setup_intent_client_secret");
    if (!returnedSecret) return;

    stripe.retrieveSetupIntent(returnedSecret).then(({ setupIntent }) => {
      if (setupIntent?.status === "succeeded") finish(setupIntent.id);
    });
  }, [stripe, finish]);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    if (!stripe || !elements || !authorized) return;

    setPhase("confirming");

    // Elements was created with the SetupIntent's clientSecret, so confirmSetup
    // collects + confirms in one step — no separate elements.submit() needed.
    const { error: confirmError, setupIntent } = await stripe.confirmSetup({
      elements,
      confirmParams: { return_url: window.location.href },
      redirect: "if_required",
    });

    if (confirmError) {
      setPhase("idle");
      setError(confirmError.message ?? "Your card could not be saved.");
      return;
    }

    if (setupIntent && setupIntent.status === "succeeded") {
      await finish(setupIntent.id);
      return;
    }

    // A redirect is in progress (3DS) — the page will navigate away and the
    // return-url effect above handles the rest.
    setPhase("idle");
  }

  const busy = phase !== "idle";
  const buttonText =
    phase === "completing"
      ? completingLabel
      : phase === "confirming"
      ? "Saving card…"
      : submitLabel;

  return (
    <form
      onSubmit={handleSubmit}
      style={{ display: "flex", flexDirection: "column", gap: "var(--space-4)" }}
    >
      <PaymentElement
        onReady={() => setElementReady(true)}
        options={{ layout: "tabs" }}
      />

      <label
        style={{
          display: "flex",
          gap: 10,
          alignItems: "flex-start",
          fontSize: 14,
          lineHeight: 1.5,
        }}
      >
        <input
          type="checkbox"
          checked={authorized}
          onChange={(e) => setAuthorized(e.target.checked)}
          style={{ marginTop: 3, width: 18, height: 18, flexShrink: 0 }}
        />
        <span>{AUTHORIZATION_TEXT}</span>
      </label>

      {error && <ErrorBanner>{error}</ErrorBanner>}

      <button
        type="submit"
        disabled={busy || !authorized || !elementReady || !stripe || !elements}
        style={{ ...buttonStyle, opacity: busy || !authorized || !elementReady ? 0.6 : 1 }}
      >
        {buttonText}
      </button>
    </form>
  );
}
