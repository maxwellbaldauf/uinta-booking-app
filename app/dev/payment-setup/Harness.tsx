"use client";

import { useState } from "react";
import {
  PaymentSetup,
  type PaymentSetupResult,
  type SetupIntentRequest,
} from "@/components/payment/PaymentSetup";
import {
  Field,
  inputStyle,
  buttonStyle,
  secondaryButtonStyle,
  ErrorBanner,
} from "@/components/ui/form";

type Mode = "booking" | "setup_token";

export function Harness() {
  const [mode, setMode] = useState<Mode>("booking");
  const [email, setEmail] = useState(`dev+${Date.now()}@example.test`);
  const [seed, setSeed] = useState<{ token: string; customerId: string } | null>(
    null
  );
  const [seedError, setSeedError] = useState<string | null>(null);
  const [started, setStarted] = useState(false);
  const [log, setLog] = useState<string[]>([]);

  function append(line: string) {
    setLog((l) => [...l, line]);
  }

  async function seedImportCustomer() {
    setSeedError(null);
    const res = await fetch("/api/dev/seed-import-customer", { method: "POST" });
    const data = await res.json();
    if (!res.ok) {
      setSeedError(data?.error ?? "seed failed");
      return;
    }
    setSeed({ token: data.token, customerId: data.customerId });
    append(`seeded import customer ${data.customerId}`);
  }

  const request: SetupIntentRequest | null =
    mode === "booking"
      ? { context: "booking", email }
      : seed
      ? { context: "setup_token", token: seed.token }
      : null;

  async function onComplete(result: PaymentSetupResult) {
    append(`onComplete: setupIntent ${result.setupIntentId}`);
    append(`onComplete: stripeCustomer ${result.stripeCustomerId}`);

    if (mode === "setup_token" && seed) {
      const res = await fetch("/api/payment/finalize", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          context: "setup_token",
          token: seed.token,
          setupIntentId: result.setupIntentId,
          authorized: true,
        }),
      });
      const data = await res.json();
      append(`finalize -> ${res.status} ${JSON.stringify(data)}`);

      const inspect = await fetch(
        `/api/dev/inspect-customer?customerId=${seed.customerId}`
      );
      append(`customer row -> ${JSON.stringify(await inspect.json(), null, 2)}`);
    }
  }

  return (
    <main className="page">
      <h1 style={{ fontSize: 20, marginBottom: "var(--space-4)" }}>
        PaymentSetup harness <span style={{ color: "var(--color-fg-muted)" }}>(dev)</span>
      </h1>

      <div style={{ display: "flex", gap: "var(--space-2)", marginBottom: "var(--space-4)" }}>
        {(["booking", "setup_token"] as Mode[]).map((m) => (
          <button
            key={m}
            onClick={() => {
              setMode(m);
              setStarted(false);
              setLog([]);
            }}
            style={{
              ...(mode === m ? buttonStyle : secondaryButtonStyle),
              width: "auto",
              fontSize: 14,
              padding: "8px 12px",
            }}
          >
            {m}
          </button>
        ))}
      </div>

      {mode === "booking" && (
        <div style={{ marginBottom: "var(--space-4)" }}>
          <Field label="Email">
            <input
              style={inputStyle}
              value={email}
              onChange={(e) => setEmail(e.target.value)}
            />
          </Field>
        </div>
      )}

      {mode === "setup_token" && (
        <div style={{ marginBottom: "var(--space-4)" }}>
          <button
            onClick={seedImportCustomer}
            style={{ ...secondaryButtonStyle, width: "auto", fontSize: 14, padding: "8px 12px" }}
          >
            Seed a test import customer
          </button>
          {seed && (
            <p style={{ fontSize: 12, color: "var(--color-fg-muted)", marginTop: 6 }}>
              customer {seed.customerId} · token {seed.token.slice(0, 12)}…
            </p>
          )}
          {seedError && <ErrorBanner>{seedError}</ErrorBanner>}
        </div>
      )}

      {!started ? (
        <button
          onClick={() => setStarted(true)}
          disabled={!request}
          style={{ ...buttonStyle, opacity: request ? 1 : 0.5 }}
        >
          Start card setup
        </button>
      ) : request ? (
        <div
          style={{
            border: "1px solid var(--color-border)",
            borderRadius: "var(--radius)",
            padding: "var(--space-4)",
          }}
        >
          <PaymentSetup
            request={request}
            onComplete={onComplete}
            submitLabel="Save card"
          />
        </div>
      ) : null}

      {log.length > 0 && (
        <pre
          style={{
            marginTop: "var(--space-5)",
            padding: "var(--space-3)",
            background: "var(--color-bg-subtle)",
            borderRadius: "var(--radius)",
            fontSize: 12,
            whiteSpace: "pre-wrap",
            wordBreak: "break-all",
          }}
        >
          {log.join("\n")}
        </pre>
      )}

      <p style={{ marginTop: "var(--space-5)", fontSize: 12, color: "var(--color-fg-muted)" }}>
        Test card: 4242 4242 4242 4242 · any future expiry · any CVC · any ZIP.
      </p>
    </main>
  );
}
