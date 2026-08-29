import Link from "next/link";
import { getSettings, formatUsd } from "@/lib/settings";
import { buttonStyle, secondaryButtonStyle } from "@/components/ui/form";

export const dynamic = "force-dynamic";

// Minimal marketing placeholder (spec §7 — the Wix-vs-replace decision isn't
// made yet). Just the price and the two CTAs, wired.
export default async function HomePage() {
  let priceLine = "";
  try {
    const settings = await getSettings();
    priceLine = `${formatUsd(settings.base_price_cents)} per visit · billed semi-annually`;
  } catch {
    priceLine = "";
  }

  return (
    <main className="page">
      <h1 style={{ fontSize: 26, marginBottom: "var(--space-2)" }}>
        Uinta Ice Co
      </h1>
      <p style={{ color: "var(--color-fg-muted)", marginBottom: "var(--space-5)" }}>
        Residential ice machine cleaning. We keep your ice maker running clean on
        a semi-annual schedule — no account, no hassle.
      </p>

      {priceLine && (
        <p
          style={{
            fontSize: 20,
            fontWeight: 700,
            marginBottom: "var(--space-5)",
          }}
        >
          {priceLine}
        </p>
      )}

      <div style={{ display: "flex", flexDirection: "column", gap: "var(--space-3)" }}>
        <Link href="/book" style={{ ...buttonStyle, textAlign: "center", textDecoration: "none" }}>
          Book a cleaning
        </Link>
        <Link
          href="/contact"
          style={{ ...secondaryButtonStyle, textAlign: "center", textDecoration: "none" }}
        >
          Contact us
        </Link>
      </div>
    </main>
  );
}
