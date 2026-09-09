"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { buttonStyle, secondaryButtonStyle, ErrorBanner } from "@/components/ui/form";
import { AgreementText } from "./AgreementText";

// Wording lives here (not lib/agreement.ts) — it's UI consent copy that
// summarizes the agreement, not part of the agreement text itself.
const CONSENT_LABEL =
  "I have read and agree to the Uinta Ice Co. Service Agreement, including the " +
  "recurring semi-annual service, automatic card charges, and the $50 fee for " +
  "missed appointments.";

export function AgreementStep({
  staleAcceptance,
  busy,
  error,
  onBack,
  onContinue,
}: {
  // true = a matched customer who accepted an older version and must re-accept.
  staleAcceptance: boolean;
  busy: boolean;
  error: string | null;
  onBack: () => void;
  onContinue: () => void;
}) {
  const scrollRef = useRef<HTMLDivElement>(null);
  const [reachedEnd, setReachedEnd] = useState(false);
  const [agreed, setAgreed] = useState(false);

  const recheck = useCallback(() => {
    const el = scrollRef.current;
    if (!el) return;
    // Actual scroll position, within 2px of the bottom (tolerance for
    // sub-pixel rounding and browser zoom). This is also true from the start
    // when the text is short enough that there's nothing to scroll — e.g. a
    // very tall viewport — so the checkbox isn't left permanently disabled.
    const atEnd = el.scrollHeight - el.scrollTop - el.clientHeight <= 2;
    if (atEnd) setReachedEnd(true); // latch — scrolling back up doesn't undo it
  }, []);

  useEffect(() => {
    recheck();
    const el = scrollRef.current;
    if (!el || typeof ResizeObserver === "undefined") return;
    // Re-check when the container or its content changes size: a late web-font
    // swap, a viewport resize, or a device rotation can flip a "fits" layout
    // into a scrolling one or the reverse.
    const ro = new ResizeObserver(recheck);
    ro.observe(el);
    if (el.firstElementChild) ro.observe(el.firstElementChild);
    return () => ro.disconnect();
  }, [recheck]);

  const canContinue = agreed && !busy;

  return (
    <div style={{ display: "flex", flexDirection: "column", gap: "var(--space-4)" }}>
      <div>
        <h1 style={{ fontSize: 22, margin: 0 }}>Service agreement</h1>
        <p style={{ color: "var(--color-fg-muted)", margin: "4px 0 0" }}>
          Please read the agreement below. It covers the recurring service, how
          your card is used, and what happens if we can&apos;t get in.
        </p>
      </div>

      {staleAcceptance && (
        <div
          role="status"
          style={{
            background: "var(--color-warning-bg)",
            color: "var(--color-warning)",
            padding: "var(--space-3)",
            borderRadius: "var(--radius)",
            fontSize: 14,
            lineHeight: 1.5,
          }}
        >
          We&apos;ve updated our Service Agreement since your last visit. Please
          review the current version and accept it to continue.
        </div>
      )}

      <div
        ref={scrollRef}
        onScroll={recheck}
        tabIndex={0}
        role="region"
        aria-label="Service agreement"
        style={{
          maxHeight: "min(60vh, 30rem)",
          overflowY: "auto",
          border: "1px solid var(--color-border)",
          borderRadius: "var(--radius)",
          padding: "var(--space-4)",
          background: "var(--color-bg)",
        }}
      >
        <AgreementText />
      </div>

      <div style={{ display: "flex", flexDirection: "column", gap: 6 }}>
        <label
          style={{
            display: "flex",
            gap: 10,
            alignItems: "flex-start",
            fontSize: 14,
            lineHeight: 1.5,
            color: reachedEnd ? "var(--color-fg)" : "var(--color-fg-muted)",
            cursor: reachedEnd ? "pointer" : "default",
          }}
        >
          <input
            type="checkbox"
            checked={agreed}
            disabled={!reachedEnd}
            onChange={(e) => setAgreed(e.target.checked)}
            style={{ marginTop: 3, width: 18, height: 18, flexShrink: 0 }}
          />
          <span>{CONSENT_LABEL}</span>
        </label>
        {!reachedEnd && (
          <p style={{ margin: "0 0 0 28px", fontSize: 13, color: "var(--color-fg-muted)" }}>
            Scroll to the end of the agreement to enable this.
          </p>
        )}
      </div>

      {error && <ErrorBanner>{error}</ErrorBanner>}

      <div style={{ display: "flex", gap: "var(--space-2)" }}>
        <button
          type="button"
          onClick={onBack}
          style={{
            ...secondaryButtonStyle,
            width: "auto",
            flex: "0 0 auto",
            padding: "14px 16px",
          }}
        >
          Back
        </button>
        <button
          type="button"
          disabled={!canContinue}
          onClick={onContinue}
          style={{ ...buttonStyle, opacity: canContinue ? 1 : 0.6 }}
        >
          {busy ? "Working…" : "Continue"}
        </button>
      </div>
    </div>
  );
}
