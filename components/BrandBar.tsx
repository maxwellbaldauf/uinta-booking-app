import Image from "next/image";
import Link from "next/link";

// Minimal brand bar for the focused pages outside the marketing route group
// (/book, /contact): a logo that links home, nothing else — no nav links to
// pull people out of the flow. Self-contained styles against the tokens in
// globals.css, so these pages don't need the marketing stylesheet.
export function BrandBar() {
  return (
    <div
      style={{
        borderBottom: "1px solid var(--color-border)",
        background: "var(--color-bg)",
      }}
    >
      <div
        style={{
          maxWidth: "var(--max-width)",
          margin: "0 auto",
          padding: "14px 16px",
        }}
      >
        <Link
          href="/"
          aria-label="Uinta Ice Co. — home"
          style={{
            display: "inline-flex",
            alignItems: "center",
            gap: 8,
            textDecoration: "none",
            color: "var(--color-fg)",
          }}
        >
          <Image src="/images/logo2.png" alt="" width={24} height={24} />
          <span
            style={{
              fontFamily: "var(--font-display), 'Trebuchet MS', sans-serif",
              textTransform: "uppercase",
              letterSpacing: "0.2em",
              fontSize: 13,
              paddingLeft: "0.1em",
            }}
          >
            Uinta Ice Co.
          </span>
        </Link>
      </div>
    </div>
  );
}
