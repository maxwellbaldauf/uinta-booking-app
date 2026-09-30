import Link from "next/link";
import { LEGAL_LINKS } from "@/lib/site";

// Terms / Privacy line for the focused pages outside the marketing route group
// (/book, /contact) — the pages that actually collect personal information but
// don't get the marketing footer. Same self-contained-styles approach as
// BrandBar, against the tokens in globals.css.
export function LegalLinks() {
  return (
    <p
      style={{
        maxWidth: "var(--max-width)",
        margin: "0 auto",
        padding: "0 16px var(--space-6)",
        fontSize: 13,
        color: "var(--color-fg-muted)",
      }}
    >
      {LEGAL_LINKS.map((link, i) => (
        <span key={link.href}>
          {i > 0 && <span aria-hidden="true"> · </span>}
          <Link href={link.href} style={{ color: "inherit" }}>
            {link.label}
          </Link>
        </span>
      ))}
    </p>
  );
}
