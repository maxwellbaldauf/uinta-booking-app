import Link from "next/link";
import { getSettings, formatUsd } from "@/lib/settings";
import { buttonStyle, secondaryButtonStyle } from "@/components/ui/form";

export const dynamic = "force-dynamic";

// Minimal marketing placeholder (spec §7 — the Wix-vs-replace decision isn't
// made yet). Enough to stand on its own: the price up front, how it works, and
// the two CTAs wired. Real marketing content is step 7's "full" path.
export default async function HomePage() {
  let settings: Awaited<ReturnType<typeof getSettings>> | null = null;
  try {
    settings = await getSettings();
  } catch {
    settings = null;
  }

  const businessName = settings?.business_name || "Uinta Ice Co";
  const price = settings ? formatUsd(settings.base_price_cents) : null;
  const intervalMonths = settings?.service_interval_months ?? 6;
  const areaMiles = settings?.service_area_max_miles ?? null;

  return (
    <main className="page">
      <header style={{ marginBottom: "var(--space-6)" }}>
        <div
          style={{
            fontSize: 13,
            fontWeight: 700,
            letterSpacing: "0.08em",
            textTransform: "uppercase",
            color: "var(--color-primary)",
            marginBottom: "var(--space-2)",
          }}
        >
          {businessName}
        </div>
        <h1 style={{ fontSize: 28, lineHeight: 1.2, margin: "0 0 var(--space-3)" }}>
          Clean ice, on a schedule you don&rsquo;t have to think about.
        </h1>
        <p style={{ color: "var(--color-fg-muted)", margin: 0, fontSize: 16 }}>
          Residential ice machine cleaning{" "}
          {intervalMonths === 6 ? "twice a year" : `every ${intervalMonths} months`}. No
          account, no contract to sign online, no upfront charge.
        </p>
      </header>

      {price && (
        <div
          style={{
            border: "1px solid var(--color-border)",
            borderRadius: "var(--radius)",
            padding: "var(--space-4)",
            marginBottom: "var(--space-6)",
          }}
        >
          <div style={{ fontSize: 30, fontWeight: 800, lineHeight: 1 }}>{price}</div>
          <div style={{ color: "var(--color-fg-muted)", marginTop: 4 }}>
            per visit &middot; billed after each cleaning
          </div>
        </div>
      )}

      <section style={{ marginBottom: "var(--space-6)" }}>
        <h2 style={{ fontSize: 16, margin: "0 0 var(--space-3)" }}>How it works</h2>
        <ol
          style={{
            margin: 0,
            paddingLeft: "1.2em",
            color: "var(--color-fg-muted)",
            lineHeight: 1.7,
          }}
        >
          <li>Book online and pick a 90-minute arrival window.</li>
          <li>We come out, clean and sanitize your ice machine.</li>
          <li>Your card on file is charged after the visit — nothing before.</li>
          <li>
            We schedule the next one automatically,{" "}
            {intervalMonths === 6 ? "about six months" : `about ${intervalMonths} months`}{" "}
            out.
          </li>
        </ol>
      </section>

      <div
        style={{
          display: "flex",
          flexDirection: "column",
          gap: "var(--space-3)",
          marginBottom: "var(--space-5)",
        }}
      >
        <Link
          href="/book"
          style={{ ...buttonStyle, textAlign: "center", textDecoration: "none" }}
        >
          Book a cleaning
        </Link>
        <Link
          href="/contact"
          style={{ ...secondaryButtonStyle, textAlign: "center", textDecoration: "none" }}
        >
          Not ready? Send us a question
        </Link>
      </div>

      {areaMiles != null && (
        <p style={{ fontSize: 13, color: "var(--color-fg-muted)", margin: 0 }}>
          We service homes within {Math.round(Number(areaMiles))} miles of our shop.
          Enter your address when you book and we&rsquo;ll let you know right away.
        </p>
      )}
    </main>
  );
}
