import Link from "next/link";
import { NAP, PAGE_UPDATED } from "@/lib/site";
import { pageMetadata } from "@/lib/seo";
import { breadcrumbSchema } from "@/lib/schema";
import { JsonLd } from "@/components/marketing/JsonLd";

// Terms for using the WEBSITE. The cleaning service itself is governed by the
// Service Agreement customers accept in /book (lib/agreement.ts) — this page
// defers to it rather than restating or contradicting it. The Google section
// is required by the Places API policies for showing Google reviews.
export const metadata = pageMetadata({
  title: "Terms of Use | Uinta Ice Co.",
  description:
    "The terms for using the Uinta Ice Co. website, including the chat assistant and the Google Maps content shown on the site.",
  path: "/terms",
});

const schema = [
  breadcrumbSchema([
    { name: "Home", path: "/" },
    { name: "Terms of Use", path: "/terms" },
  ]),
];

export default function TermsPage() {
  return (
    <div className="mkt-wrap mkt-prose">
      <JsonLd graph={schema} />
      <header className="mkt-pagehead">
        <h1>Terms of Use</h1>
        <p className="mkt-updated">Last updated: {PAGE_UPDATED.terms.display}</p>
        <p className="mkt-lead">
          These terms apply to your use of this website, operated by{" "}
          {NAP.legalName} (“Uinta Ice Co.,” “we,” “us”). By using the site,
          you agree to them. If you don’t agree, please don’t use the site.
        </p>
      </header>

      <section className="mkt-section">
        <h2>Our Service Is Covered by the Service Agreement</h2>
        <p>
          These terms cover the website. The ice machine cleaning service
          itself — scheduling, pricing, payment, cancellations, and our
          guarantee — is governed by the Service Agreement you accept when
          you book. If these terms and the Service Agreement ever conflict
          about the service, the Service Agreement controls.
        </p>
      </section>

      <section className="mkt-section">
        <h2>Information on This Site</h2>
        <p>
          The articles, troubleshooting guides, and other information on this
          site are general guidance for residential and light commercial ice
          machines. They are not a substitute for your manufacturer’s
          instructions or for an in-person inspection, and you follow them at
          your own risk. Prices and availability shown on the site can change;
          the price that applies to your visit is the one confirmed when you
          book.
        </p>
      </section>

      <section className="mkt-section">
        <h2>The Chat Assistant</h2>
        <p>
          The chat assistant is an automated AI tool. It can make mistakes,
          and what it says is not a quote, a promise, or professional advice.
          Anything it tells you about pricing, scheduling, or your machine is
          confirmed only by us directly or through the booking process.
          Please don’t enter sensitive information like card numbers or
          passwords into the chat.
        </p>
      </section>

      <section className="mkt-section">
        <h2>Acceptable Use</h2>
        <p>
          Please don’t misuse the site: no submitting false bookings or
          someone else’s information, no attempts to break, overload, or
          gain unauthorized access to the site or its systems, no automated
          scraping, and no using the chat assistant for anything unrelated to
          our service. We may block access to anyone who does.
        </p>
      </section>

      <section className="mkt-section">
        <h2>Google Maps Content</h2>
        <p>
          This site uses Google Maps Platform services, including address
          suggestions and Google reviews. Your use of that content is
          subject to the{" "}
          <a href="https://maps.google.com/help/terms_maps/" rel="noopener noreferrer">
            Google Maps/Google Earth Additional Terms of Service
          </a>{" "}
          and the{" "}
          <a href="https://policies.google.com/privacy" rel="noopener noreferrer">
            Google Privacy Policy
          </a>
          , which are incorporated into these terms by reference. Reviews
          shown on this site are written by Google users, not by us.
        </p>
      </section>

      <section className="mkt-section">
        <h2>Our Content</h2>
        <p>
          The text, photos, and design of this site belong to Uinta Ice Co.
          or are used with permission. You’re welcome to read, share links
          to, and print pages for personal use, but please don’t copy or
          republish them commercially without asking. Third-party names and
          trademarks, such as appliance brands, belong to their owners and
          are used only to describe the machines we service.
        </p>
      </section>

      <section className="mkt-section">
        <h2>Links to Other Sites</h2>
        <p>
          The site links to other websites, such as water-quality sources,
          manufacturers, and our social media profiles. We don’t control
          those sites and aren’t responsible for their content or practices.
        </p>
      </section>

      <section className="mkt-section">
        <h2>Disclaimers and Limitation of Liability</h2>
        <p>
          The website is provided “as is” and “as available.” We do our best
          to keep it accurate and running, but we don’t guarantee that it
          will always be available, error-free, or up to date. To the
          fullest extent the law allows, Uinta Ice Co. is not liable for any
          indirect, incidental, or consequential damages arising from your
          use of the website. This section is about the website; our
          responsibilities for the service we perform are set out in the
          Service Agreement.
        </p>
      </section>

      <section className="mkt-section">
        <h2>Governing Law</h2>
        <p>
          These terms are governed by the laws of the State of Utah. Any
          dispute about the website will be handled in the state or federal
          courts located in Utah County, Utah.
        </p>
      </section>

      <section className="mkt-section">
        <h2>Changes and Contact</h2>
        <p>
          We may update these terms from time to time; the date at the top
          of this page shows the latest version. Continuing to use the site
          after a change means you accept the updated terms. Questions go to{" "}
          <a href={NAP.emailHref}>{NAP.email}</a> or{" "}
          <a href={NAP.phoneHref}>{NAP.phoneDisplay}</a>.
        </p>
        <p>
          See also our <Link href="/privacy">Privacy Policy</Link>.
        </p>
      </section>
    </div>
  );
}
