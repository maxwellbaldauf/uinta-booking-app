// Shared form primitives — ported from Project A's components/ui/form.tsx and
// kept visually consistent with it. Plain inline styles against the CSS custom
// properties in app/globals.css; no CSS framework.

export const inputStyle: React.CSSProperties = {
  padding: "12px 14px",
  borderRadius: "var(--radius)",
  border: "1px solid var(--color-border)",
  background: "var(--color-bg)",
  color: "var(--color-fg)",
  fontSize: 16, // >=16px so mobile Safari doesn't zoom on focus
  width: "100%",
};

export const buttonStyle: React.CSSProperties = {
  padding: "14px 18px",
  borderRadius: "var(--radius)",
  border: "none",
  background: "var(--color-primary)",
  color: "var(--color-primary-fg)",
  fontSize: 16,
  fontWeight: 600,
  width: "100%",
  cursor: "pointer",
};

export const secondaryButtonStyle: React.CSSProperties = {
  ...buttonStyle,
  background: "transparent",
  border: "1px solid var(--color-border)",
  color: "var(--color-fg)",
};

// Invalid state is marked by shape and weight, not color: a solid near-black
// border plus an extra bottom rule on the input, and a "!" marker on the message.
// Only the `border` shorthand and boxShadow change, so clearing the error
// restores inputStyle's border exactly (no longhand/shorthand mixing).
export const invalidInputStyle: React.CSSProperties = {
  border: "1px solid var(--color-fg)",
  boxShadow: "0 1px 0 0 var(--color-fg)",
};

export function Field({
  label,
  children,
  hint,
  error,
  errorId,
}: {
  label: string;
  children: React.ReactNode;
  hint?: string;
  // When set, rendered outside the <label> (so it isn't part of the input's
  // accessible name); the input points at it via aria-describedby={errorId}.
  error?: string | null;
  errorId?: string;
}) {
  return (
    <div style={{ display: "flex", flexDirection: "column", gap: 6 }}>
      <label style={{ display: "flex", flexDirection: "column", gap: 6 }}>
        <span style={{ fontSize: 13, color: "var(--color-fg-muted)" }}>{label}</span>
        {children}
        {hint && (
          <span style={{ fontSize: 12, color: "var(--color-fg-muted)" }}>{hint}</span>
        )}
      </label>
      {error && (
        <span
          id={errorId}
          role="alert"
          style={{
            display: "flex",
            gap: 6,
            alignItems: "baseline",
            fontSize: 13,
            fontWeight: 600,
            color: "var(--color-fg)",
          }}
        >
          <span aria-hidden="true">!</span>
          {error}
        </span>
      )}
    </div>
  );
}

export function ErrorBanner({ children }: { children: React.ReactNode }) {
  return (
    <div
      role="alert"
      style={{
        background: "var(--color-danger-bg)",
        color: "var(--color-danger)",
        padding: "var(--space-3)",
        borderRadius: "var(--radius)",
        fontSize: 14,
      }}
    >
      {children}
    </div>
  );
}
