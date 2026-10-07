"use client";

import { useRef, useState } from "react";
import { buttonStyle, inputStyle, invalidInputStyle, secondaryButtonStyle } from "@/components/ui/form";
import {
  HEARD_ABOUT_DETAIL_MAX,
  HEARD_ABOUT_OPTIONS,
  parseHeardAbout,
  type HeardAboutAnswer,
  type HeardAboutSource,
} from "@/lib/heardAbout";

// Which options carry a text box that is always visible beneath them.
const DETAIL_LABEL: Partial<Record<HeardAboutSource, string>> = {
  referral: "Referred by:",
  other: "Other:",
};

// "How did you hear about us?" — shown to first-time bookers only (the server
// decides; see heardAboutRequired in lib/booking.ts). Single choice. Focusing or
// typing in the Referral / Other box selects that option. Text typed under an
// option the person then moves away from is kept on screen (in case they switch
// back) but never submitted: only the selected option's text goes out.
export function HeardAboutStep({
  initial,
  error: serverError,
  onBack,
  onContinue,
}: {
  initial: HeardAboutAnswer | null;
  // From a rejected booking (server said the answer was missing / invalid).
  error: string | null;
  onBack: () => void;
  onContinue: (answer: HeardAboutAnswer) => void;
}) {
  const [source, setSource] = useState<HeardAboutSource | null>(initial?.source ?? null);
  const [details, setDetails] = useState<Partial<Record<HeardAboutSource, string>>>(
    initial?.detail && initial.source ? { [initial.source]: initial.detail } : {}
  );
  const [clientError, setClientError] = useState<{ msg: string; field: "choice" | "other" } | null>(
    null
  );
  const fieldsetRef = useRef<HTMLFieldSetElement>(null);
  const otherInputRef = useRef<HTMLInputElement>(null);

  const shownError = clientError?.msg ?? serverError;

  function choose(key: HeardAboutSource) {
    // Only a real change of option clears the error: submit() programmatically
    // focuses the Other box on a blank-Other error, and that focus must not
    // wipe the message it just set.
    if (key !== source) setClientError(null);
    setSource(key);
  }

  function submit(e: React.FormEvent) {
    e.preventDefault();
    const parsed = parseHeardAbout({ source, detail: source ? details[source] : null });
    if (!parsed.ok) {
      const field = source === "other" ? "other" : "choice";
      setClientError({ msg: parsed.error, field });
      // Move focus to where the problem is: the Other box, else the question.
      (field === "other" ? otherInputRef.current : fieldsetRef.current)?.focus();
      return;
    }
    onContinue(parsed.value);
  }

  const otherInvalid = clientError?.field === "other";

  return (
    <form
      onSubmit={submit}
      noValidate
      style={{ display: "flex", flexDirection: "column", gap: "var(--space-4)" }}
    >
      <fieldset
        ref={fieldsetRef}
        tabIndex={-1}
        aria-describedby={shownError ? "heard-about-error" : undefined}
        style={{
          border: "none",
          margin: 0,
          padding: 0,
          minWidth: 0,
          display: "flex",
          flexDirection: "column",
          gap: "var(--space-3)",
          outline: "none",
        }}
      >
        <legend style={{ padding: 0, marginBottom: "var(--space-3)" }}>
          <span style={{ fontSize: 22, fontWeight: 600 }}>How did you hear about us?</span>{" "}
          <span style={{ fontSize: 14, fontWeight: 400, color: "var(--color-fg-muted)" }}>
            (required)
          </span>
        </legend>

        {shownError && (
          <div
            id="heard-about-error"
            role="alert"
            style={{
              display: "flex",
              gap: 6,
              alignItems: "baseline",
              fontSize: 14,
              fontWeight: 600,
              color: "var(--color-fg)",
            }}
          >
            <span aria-hidden="true">!</span>
            {shownError}
          </div>
        )}

        {HEARD_ABOUT_OPTIONS.map((o) => {
          const selected = source === o.key;
          const detailLabel = DETAIL_LABEL[o.key];
          const inputId = `heard-about-${o.key}`;
          return (
            <div
              key={o.key}
              style={{
                border: `1px solid ${selected ? "var(--color-primary)" : "var(--color-border)"}`,
                background: selected ? "var(--color-bg-subtle)" : "var(--color-bg)",
                borderRadius: "var(--radius)",
                display: "flex",
                flexDirection: "column",
              }}
            >
              <label
                style={{
                  display: "flex",
                  gap: 12,
                  alignItems: "center",
                  minHeight: 48,
                  padding: "10px var(--space-4)",
                  cursor: "pointer",
                  fontSize: 16,
                }}
              >
                <input
                  type="radio"
                  name="heard-about"
                  value={o.key}
                  checked={selected}
                  onChange={() => choose(o.key)}
                  style={{ width: 20, height: 20, flexShrink: 0, margin: 0 }}
                />
                <span>{o.label}</span>
              </label>
              {detailLabel && (
                <div
                  style={{
                    display: "flex",
                    flexDirection: "column",
                    gap: 4,
                    padding: "0 var(--space-4) var(--space-3)",
                  }}
                >
                  <label
                    htmlFor={inputId}
                    style={{ fontSize: 13, color: "var(--color-fg-muted)" }}
                  >
                    {detailLabel}
                  </label>
                  <input
                    id={inputId}
                    ref={o.key === "other" ? otherInputRef : undefined}
                    type="text"
                    maxLength={HEARD_ABOUT_DETAIL_MAX}
                    autoComplete="off"
                    value={details[o.key] ?? ""}
                    aria-invalid={o.key === "other" && otherInvalid ? true : undefined}
                    aria-describedby={
                      o.key === "other" && otherInvalid ? "heard-about-error" : undefined
                    }
                    // Focus / click / typing in the box picks its option.
                    onFocus={() => choose(o.key)}
                    onClick={() => choose(o.key)}
                    onChange={(e) => {
                      setDetails((d) => ({ ...d, [o.key]: e.target.value }));
                      choose(o.key);
                    }}
                    style={
                      o.key === "other" && otherInvalid
                        ? { ...inputStyle, ...invalidInputStyle }
                        : inputStyle
                    }
                  />
                </div>
              )}
            </div>
          );
        })}
      </fieldset>

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
        <button type="submit" style={buttonStyle}>
          Continue
        </button>
      </div>
    </form>
  );
}
