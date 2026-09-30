import Link from "next/link";
import { NAP, PAGE_UPDATED } from "@/lib/site";
import { pageMetadata } from "@/lib/seo";
import { breadcrumbSchema } from "@/lib/schema";
import { JsonLd } from "@/components/marketing/JsonLd";

// Written against what the site actually does (audited 2026-09-30): booking,
// contact form, chat widget (Anthropic), Stripe saved card, Resend email, Kit
// opt-in, Plausible, Google address autocomplete + geocoding, Supabase,
// Netlify. If a new data flow is added, this page has to change with it —
// bump PAGE_UPDATED.privacy when it does.
export const metadata = pageMetadata({
  title: "Privacy Policy | Uinta Ice Co.",
  description:
    "What information Uinta Ice Co. collects through this website, how it is used, who it is shared with, and how to ask us to change or delete it.",
  path: "/privacy",
});

const schema = [
  breadcrumbSchema([
    { name: "Home", path: "/" },
    { name: "Privacy Policy", path: "/privacy" },
  ]),
];

export default function PrivacyPage() {
  return (
    <div className="mkt-wrap mkt-prose">
      <JsonLd graph={schema} />
      <header className="mkt-pagehead">
        <h1>Privacy Policy</h1>
        <p className="mkt-updated">Last updated: {PAGE_UPDATED.privacy.display}</p>
        <p className="mkt-lead">
          This policy explains what information {NAP.legalName} (“Uinta Ice
          Co.,” “we,” “us”) collects through this website, what we do with
          it, and the choices you have. We are a small local service
          business. We collect what we need to schedule, perform, and bill
          for ice machine cleaning, and we do not sell your information.
        </p>
      </header>

      <section className="mkt-section">
        <h2>Information You Give Us</h2>
        <ul>
          <li>
            <strong>When you book a cleaning:</strong> your name, email
            address, phone number, service address, the brand and model of
            your ice machine, the appointment you choose, and your acceptance
            of our Service Agreement.
          </li>
          <li>
            <strong>When you pay or save a card:</strong> your card details
            go directly to our payment processor, Stripe. We never see or
            store your full card number. We keep a reference to the saved
            card so we can charge the agreed price after each visit, as
            described in the Service Agreement.
          </li>
          <li>
            <strong>When you use the contact form:</strong> your name,
            contact details, address, machine details, and your message.
          </li>
          <li>
            <strong>When you use the chat assistant:</strong> the messages
            you type. If you share your name and an email or phone number so
            we can follow up, we save those details along with a short
            summary and the recent part of the conversation.
          </li>
          <li>
            <strong>When you opt in to our quotes email list:</strong> your
            email address. This list is optional and separate
            from the emails about your service.
          </li>
        </ul>
      </section>

      <section className="mkt-section">
        <h2>Information Collected Automatically</h2>
        <ul>
          <li>
            <strong>Analytics:</strong> we use Plausible Analytics to count
            page visits. Plausible does not use cookies and does not collect
            personal information or track you across other websites.
          </li>
          <li>
            <strong>Browser storage:</strong> the chat assistant and payment
            pages keep a small amount of information in your browser’s
            session storage (for example, the current chat conversation) so
            it survives a page reload. It is cleared when you close the tab.
            We do not use advertising or tracking cookies.
          </li>
          <li>
            <strong>IP address:</strong> our hosting provider receives your
            IP address with every request, as all websites do. We use it
            briefly to limit abuse of the chat assistant and do not store it
            with your customer record.
          </li>
        </ul>
      </section>

      <section className="mkt-section">
        <h2>How We Use It</h2>
        <ul>
          <li>To schedule, confirm, remind you about, and perform your service visits.</li>
          <li>
            To send service emails: booking confirmations, reminders before
            a visit, invoices and receipts, and a report with photos of your
            machine after a visit.
          </li>
          <li>To charge the saved card for completed visits.</li>
          <li>To answer questions you send us and follow up on requests.</li>
          <li>To plan efficient routes between service visits.</li>
          <li>To keep business, tax, and accounting records.</li>
        </ul>
        <p>
          We do not sell your personal information, and we do not share it
          with anyone for their own advertising.
        </p>
      </section>

      <section className="mkt-section">
        <h2>Service Providers We Share It With</h2>
        <p>
          We use a few outside services to run the business. Each receives
          only what it needs to do its job for us:
        </p>
        <ul>
          <li><strong>Stripe</strong> — payment processing and saved cards.</li>
          <li><strong>Supabase</strong> — the database that holds customer and appointment records.</li>
          <li><strong>Netlify</strong> — website hosting.</li>
          <li><strong>Resend</strong> — delivery of service emails.</li>
          <li><strong>Kit</strong> — the optional quotes email list, only if you opt in.</li>
          <li>
            <strong>Anthropic</strong> — the AI model that powers the chat
            assistant. Your chat messages are sent to Anthropic to generate
            replies.
          </li>
          <li>
            <strong>Google</strong> — address suggestions while you type
            your address, converting addresses to map coordinates for
            scheduling and routing, and the Google reviews shown on this
            site. Google’s use of information is governed by the{" "}
            <a href="https://policies.google.com/privacy" rel="noopener noreferrer">
              Google Privacy Policy
            </a>
            .
          </li>
          <li><strong>Plausible</strong> — cookie-free visit counts.</li>
        </ul>
        <p>
          We may also disclose information if required by law, or to protect
          our rights or the safety of our customers and staff.
        </p>
      </section>

      <section className="mkt-section">
        <h2>Google Maps Content</h2>
        <p>
          Parts of this site, including address suggestions and Google
          reviews, use Google Maps Platform services. By using those
          features, you are also subject to the{" "}
          <a href="https://policies.google.com/privacy" rel="noopener noreferrer">
            Google Privacy Policy
          </a>
          , which is incorporated into this policy by reference.
        </p>
      </section>

      <section className="mkt-section">
        <h2>How Long We Keep It</h2>
        <p>
          We keep customer and appointment records for as long as you are a
          customer and afterward as long as we reasonably need them for
          business, tax, and legal records. Contact-form and chat leads that
          never become customers are kept only as long as they are useful for
          following up. You can ask us to delete your information at any
          time (see below).
        </p>
      </section>

      <section className="mkt-section">
        <h2>Your Choices</h2>
        <ul>
          <li>
            <strong>Access, correction, deletion:</strong> email{" "}
            <a href={NAP.emailHref}>{NAP.email}</a> and we will tell you what
            we have, fix it, or delete it. We may need to keep some records
            we are legally required to keep, such as payment records.
          </li>
          <li>
            <strong>Quotes email list:</strong> every email has an
            unsubscribe link.
          </li>
          <li>
            <strong>Service emails:</strong> these are part of the service
            you booked. If you stop service, they stop too.
          </li>
          <li>
            <strong>Saved card:</strong> ask us to remove it at any time.
            Future visits will then need another payment method.
          </li>
        </ul>
      </section>

      <section className="mkt-section">
        <h2>Security</h2>
        <p>
          The site is served over HTTPS, card details are handled by Stripe
          and never touch our servers, and customer records are only
          accessible to us. No system is perfectly secure, but we take
          reasonable steps to protect your information.
        </p>
      </section>

      <section className="mkt-section">
        <h2>Children</h2>
        <p>
          This site and our services are for adults. We do not knowingly
          collect information from children under 13.
        </p>
      </section>

      <section className="mkt-section">
        <h2>Changes and Contact</h2>
        <p>
          If we change this policy, we will update the date at the top of
          this page. Questions or requests go to {NAP.legalName},{" "}
          {NAP.locality}, {NAP.regionName} — <a href={NAP.emailHref}>{NAP.email}</a>{" "}
          or <a href={NAP.phoneHref}>{NAP.phoneDisplay}</a>.
        </p>
        <p>
          See also our <Link href="/terms">Terms of Use</Link>.
        </p>
      </section>
    </div>
  );
}
