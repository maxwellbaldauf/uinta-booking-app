"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { buttonStyle, secondaryButtonStyle, ErrorBanner } from "@/components/ui/form";
import { AgreementText } from "./AgreementText";

// Wording lives here (not lib/agreement.data.json) — it's UI consent copy that
// summarizes the agreement, not part of the agreement text itself.
const CONSENT_LABEL =
  "I have read and agree to the Uinta Ice Co. Service Agreement, including " +
  "recurring semi-annual service, charges to my card on file after each visit, " +
  "and the $50 fee if we can't safely get in.";

export function AgreementStep({
  staleAcceptance,
  error,
  onBack,
  onContinue,
}: {
  // true = a matched customer who accepted an older version and must re-accept.
  staleAcceptance: boolean;
  error: string | null;
  onBack: () => void;
  onContinue: () => void;
}) {
  const scrollRef = useRef<HTMLDivElement>(null);
  // Latched: set once the user has actually scrolled the text to the bottom.
  const [scrolledToEnd, setScrolledToEnd] = useState(false);
  // Live (not latched): the text currently fits without needing a scroll — e.g.
  // a very tall viewport. Re-evaluated on every resize so that if a late font
  // swap or rotation makes the text overflow again, the gate re-engages.
  const [fitsWithoutScroll, setFitsWithoutScroll] = useState(false);
  const [agreed, setAgreed] = useState(false);

  const recheck = useCallback(() => {
    const el = scrollRef.current;
    if (!el) return;
    // 2px tolerance for sub-pixel rounding and browser zoom.
    const fits = el.scrollHeight - el.clientHeight <= 2;
    setFitsWithoutScroll(fits);
    // Only latch from a genuine scroll (scrollTop > 0) — never from the "it
    // fits" case, or an early measurement that fits could permanently unlock
    // the checkbox before the text has grown to its real height.
    if (el.scrollTop > 0 && el.scrollHeight - el.scrollTop - el.clientHeight <= 2) {
      setScrolledToEnd(true);
    }
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

  const canConsent = scrolledToEnd || fitsWithoutScroll;

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
            color: canConsent ? "var(--color-fg)" : "var(--color-fg-muted)",
            cursor: canConsent ? "pointer" : "default",
          }}
        >
          <input
            type="checkbox"
            checked={agreed}
            disabled={!canConsent}
            onChange={(e) => setAgreed(e.target.checked)}
            style={{ marginTop: 3, width: 18, height: 18, flexShrink: 0 }}
          />
          <span>{CONSENT_LABEL}</span>
        </label>
        {!canConsent && (
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
          disabled={!agreed}
          onClick={onContinue}
          style={{ ...buttonStyle, opacity: agreed ? 1 : 0.6 }}
        >
          Continue
        </button>
      </div>
    </div>
  );
}
