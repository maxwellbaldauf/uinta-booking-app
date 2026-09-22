import Link from "next/link";
import { NAP, PAGE_UPDATED } from "@/lib/site";
import { pageMetadata } from "@/lib/seo";
import { aboutPageSchema, breadcrumbSchema } from "@/lib/schema";
import { JsonLd } from "@/components/marketing/JsonLd";
import { BeforeAfter } from "@/components/marketing/BeforeAfter";
import { JOB_PHOTOS } from "@/lib/jobPhotos";

export const metadata = pageMetadata({
  title: "About Uinta Ice Co. | Ice Machine Cleaning in Lehi, Utah",
  description:
    "Uinta Ice Co., LLC cleans residential and light commercial ice machines across Utah County and Salt Lake County. Licensed and insured, cleaning only, since 2022.",
  path: "/about",
});

const schema = [
  breadcrumbSchema([
    { name: "Home", path: "/" },
    { name: "About", path: "/about" },
  ]),
  aboutPageSchema({
    dateModified: PAGE_UPDATED.about.iso,
    authorName: "Max Baldauf",
  }),
];

export default function AboutPage() {
  return (
    <div className="mkt-wrap mkt-prose">
      <JsonLd graph={schema} />
      <header className="mkt-pagehead">
        <h1>About Uinta Ice Co.</h1>
        <p className="mkt-updated">Last updated: {PAGE_UPDATED.about.display}</p>
        <p className="mkt-lead">
          Uinta Ice Co. is a Lehi, Utah company that cleans residential and
          light commercial ice machines. Undercounter and built-in ice
          machines are our specialty, and cleaning them is all we do. We take
          pride in an obsessive level of detail and cleanliness, and if
          you’re not satisfied with the cleaning, we’ll come back and clean
          it again for free. We’ve been in business since 2022, and we’re
          excited to keep growing.
        </p>
      </header>

      <section className="mkt-section">
        <h2>Cleaning Only</h2>
        <p>
          We don’t do appliance repair, so we have no reason to find
          problems that aren’t there. If your machine has a mechanical or
          electrical fault, we’ll tell you plainly and send you elsewhere —
          our only business is descaling, deep cleaning, and sanitizing.
        </p>
      </section>

      <section className="mkt-section">
        <h2>Who We Serve</h2>
        <p>
          Residential ice machines in Utah homes, and light commercial
          machines in offices, retail showrooms, and small business
          breakrooms.{" "}
          <Link href="/brands">The brands we service most often</Link> and{" "}
          <Link href="/service-areas">where we work</Link> have their own
          pages.
        </p>
      </section>

      <section className="mkt-section">
        <h2>Licensed and Insured</h2>
        <p>
          Uinta Ice Co., LLC is licensed and insured, based in Lehi, Utah,
          and serves a 75-mile radius across Utah County and Salt Lake
          County.
        </p>
      </section>

      <section className="mkt-section">
        <h2>Owner</h2>
        <p>Uinta Ice Co. is owned and operated by Max Baldauf.</p>
      </section>

      <section className="mkt-section">
        <h2>A Recent Cleaning</h2>
        <BeforeAfter pairs={JOB_PHOTOS.filter((p) => p.id === "uline-grid-chute-lehi")} />
      </section>

      <section className="mkt-section">
        <div className="mkt-cta-row">
          <Link href="/book" className="mkt-btn mkt-btn--primary">
            Book a cleaning
          </Link>
          <p className="mkt-cta-row__below">
            Call or text <a href={NAP.phoneHref}>{NAP.phoneDisplay}</a>
          </p>
        </div>
      </section>
    </div>
  );
}
