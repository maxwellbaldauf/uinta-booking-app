import Image from "next/image";
import Link from "next/link";
import { getSettings, formatUsd } from "@/lib/settings";
import { buttonStyle, secondaryButtonStyle } from "@/components/ui/form";

export const dynamic = "force-dynamic";

export const metadata = {
  title: "Ice Machine Maintenance | Uinta Ice Company | American Fork",
  description:
    "Uinta Ice Company provides residential pebble ice machine cleaning and descaling",
};

const CONTACT_EMAIL = "max@uintaice.com";
const CONTACT_PHONE = "801-796-2675";

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
    <>
      <section
        style={{
          position: "relative",
          width: "100%",
          minHeight: 360,
          display: "flex",
          alignItems: "flex-end",
          overflow: "hidden",
        }}
      >
        <Image
          src="/images/Uinta Ice Co Mountain Photo.jpg"
          alt="Snow-capped mountain range near American Fork, Utah"
          fill
          sizes="100vw"
          style={{ objectFit: "cover", objectPosition: "center 70%" }}
          preload
        />
        <div
          aria-hidden
          style={{
            position: "absolute",
            inset: 0,
            background:
              "linear-gradient(to top, var(--overlay-scrim) 0%, rgba(0,0,0,0.15) 55%, transparent 100%)",
          }}
        />
        <div
          style={{
            position: "relative",
            width: "100%",
            maxWidth: "var(--max-width)",
            margin: "0 auto",
            padding: "var(--space-6) var(--space-4) var(--space-5)",
            color: "var(--color-fg-inverse)",
          }}
        >
          <div
            style={{
              width: 56,
              height: 56,
              borderRadius: "50%",
              overflow: "hidden",
              marginBottom: "var(--space-3)",
            }}
          >
            <Image
              src="/images/logo.png"
              alt="Uinta Ice Co logo"
              width={56}
              height={56}
              style={{ width: "100%", height: "auto" }}
            />
          </div>
          <div
            style={{
              fontSize: 12,
              fontWeight: 700,
              letterSpacing: "0.12em",
              textTransform: "uppercase",
              marginBottom: "var(--space-2)",
              opacity: 0.9,
            }}
          >
            Residential ice machine cleaning
          </div>
          <h1
            style={{
              fontSize: 30,
              lineHeight: 1.15,
              margin: 0,
              fontWeight: 800,
              textTransform: "uppercase",
              letterSpacing: "0.01em",
            }}
          >
            Making sure your ice is clean. Every time.
          </h1>
        </div>
      </section>

      <main className="page">
        <div style={{ marginTop: "var(--space-5)", marginBottom: "var(--space-5)" }}>
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
          <p style={{ color: "var(--color-fg-muted)", margin: 0, fontSize: 16 }}>
            Residential ice machine cleaning{" "}
            {intervalMonths === 6 ? "twice a year" : `every ${intervalMonths} months`}. No
            account, no contract to sign online, no upfront charge.
          </p>
        </div>

        {price && (
          <div
            style={{
              border: "1px solid var(--color-border)",
              borderRadius: "var(--radius)",
              padding: "var(--space-4)",
              marginBottom: "var(--space-5)",
            }}
          >
            <div style={{ fontSize: 30, fontWeight: 800, lineHeight: 1 }}>{price}</div>
            <div style={{ color: "var(--color-fg-muted)", marginTop: 4 }}>
              per visit &middot; billed after each cleaning
            </div>
          </div>
        )}

        <div
          style={{
            display: "flex",
            flexDirection: "column",
            gap: "var(--space-3)",
            marginBottom: "var(--space-6)",
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

        <section style={{ marginBottom: "var(--space-6)" }}>
          <h2 style={{ fontSize: 20, fontWeight: 700, margin: "0 0 var(--space-3)" }}>
            The Services You Want, When You Need Them
          </h2>
          <p style={{ color: "var(--color-fg-muted)", lineHeight: 1.7, margin: "0 0 var(--space-3)" }}>
            There is not much worse than going to get ice from a machine you spent a lot of
            money on only to find that your ice machine has broken down and isn&rsquo;t
            working. Most people are unaware of how damaging hard water can be on their ice
            maker, which could cause minerals to accumulate and halt ice production or damage
            other components.
          </p>
          <p style={{ color: "var(--color-fg-muted)", lineHeight: 1.7, margin: 0 }}>
            Manufacturers recommend descaling every 3&ndash;6 months, but because
            Utah&rsquo;s water is so hard, every 3 months is recommended. Uinta Ice Company
            removes mineral deposits and buildup to keep your unit running at peak
            performance, and also cleans and sanitizes it &mdash; the bottom of a pebble ice
            machine is a breeding ground for mold and mildew, and we make sure your ice stays
            clean.
          </p>
        </section>

        <section style={{ marginBottom: "var(--space-6)" }}>
          <h2 style={{ fontSize: 20, fontWeight: 700, margin: "0 0 var(--space-3)" }}>
            When To Clean Your Ice Machine
          </h2>
          <p style={{ color: "var(--color-fg-muted)", lineHeight: 1.7, margin: "0 0 var(--space-3)" }}>
            Most ice machines have a &ldquo;time to clean&rdquo; light that lets you know
            when service is due. Here&rsquo;s what else to watch for:
          </p>
          <ul
            style={{
              margin: 0,
              paddingLeft: "1.2em",
              color: "var(--color-fg-muted)",
              lineHeight: 1.8,
            }}
          >
            <li>Visible mineral buildup or scale inside the machine</li>
            <li>Ice with an unusual taste or smell</li>
            <li>Lower ice capacity than usual</li>
            <li>Dark-colored ice</li>
            <li>A dark or discolored bottom basin</li>
            <li>Ice that&rsquo;s incompletely formed or misshapen</li>
            <li>Unusual noise while making ice</li>
          </ul>
        </section>

        <section style={{ marginBottom: "var(--space-6)" }}>
          <h2 style={{ fontSize: 20, fontWeight: 700, margin: "0 0 var(--space-3)" }}>
            Our Services
          </h2>
          <div
            style={{
              position: "relative",
              width: "100%",
              aspectRatio: "1000 / 666",
              borderRadius: "var(--radius)",
              overflow: "hidden",
              marginBottom: "var(--space-3)",
            }}
          >
            <Image
              src="/images/opal-ice-maker-making.jpg"
              alt="Scooping cylindrical pebble ice from an ice machine"
              fill
              sizes="(max-width: 480px) 100vw, 480px"
              style={{ objectFit: "cover" }}
            />
          </div>
          <p style={{ color: "var(--color-fg-muted)", lineHeight: 1.7, margin: 0 }}>
            We come with all the supplies needed to descale, clean, and sanitize your machine
            efficiently. We advise when&rsquo;s best to book your next appointment based on
            your specific make and model.
          </p>
        </section>

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
          <p style={{ fontSize: 13, color: "var(--color-fg-muted)", margin: "0 0 var(--space-6)" }}>
            We service homes within {Math.round(Number(areaMiles))} miles of our shop.
            Enter your address when you book and we&rsquo;ll let you know right away.
          </p>
        )}

        <section style={{ marginBottom: "var(--space-6)" }}>
          <h2 style={{ fontSize: 20, fontWeight: 700, margin: "0 0 var(--space-3)" }}>
            Contact
          </h2>
          <p style={{ color: "var(--color-fg-muted)", lineHeight: 1.7, margin: "0 0 var(--space-3)" }}>
            Questions before you book? Reach out directly.
          </p>
          <div style={{ display: "flex", flexDirection: "column", gap: "var(--space-2)" }}>
            <a
              href={`mailto:${CONTACT_EMAIL}`}
              style={{ color: "var(--color-primary)", fontSize: 16, textDecoration: "none" }}
            >
              {CONTACT_EMAIL}
            </a>
            <a
              href={`tel:${CONTACT_PHONE.replace(/[^\d+]/g, "")}`}
              style={{ color: "var(--color-primary)", fontSize: 16, textDecoration: "none" }}
            >
              {CONTACT_PHONE}
            </a>
          </div>
        </section>
      </main>

      <footer
        style={{
          marginTop: "var(--space-6)",
          borderTop: "1px solid var(--color-border)",
          background: "var(--color-bg-subtle)",
        }}
      >
        <div
          style={{
            maxWidth: "var(--max-width)",
            margin: "0 auto",
            padding: "var(--space-5) var(--space-4)",
            fontSize: 12,
            color: "var(--color-fg-muted)",
            textAlign: "center",
          }}
        >
          &copy; {new Date().getFullYear()} Uinta Ice Company, LLC. All rights reserved.
        </div>
      </footer>
    </>
  );
}
