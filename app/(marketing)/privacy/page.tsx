import Link from "next/link";
import { NAP, PAGE_UPDATED } from "@/lib/site";
import { pageMetadata } from "@/lib/seo";
import { breadcrumbSchema } from "@/lib/schema";
import { JsonLd } from "@/components/marketing/JsonLd";

// Written against what the site actually does (audited 2026-10-01): booking
// (incl. out-of-area / no-availability leads saved via saveFlaggedLead, in-area
// visitors who see times and leave saved via captureInAreaLead, and the
// sessionStorage handoff to /contact in lib/contactHandoff.ts), contact form,
// chat widget (Anthropic), Stripe saved card, Resend email, Kit opt-in,
// Microsoft Clarity + Google Ads base tag (both marketing pages + /book only), Google
// address autocomplete + geocoding, Supabase, Netlify. If a new data flow is added, this page has to change with it —
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
            <strong>If you check availability but don’t book:</strong> when
            you enter your details in the booking form, we check your
            address. If your address is outside our service area, if we have
            no open appointment, or if we show you open appointment times, we
            save your name, email address, phone number, address (and its map
            location), and your ice machine’s brand and model in our records
            as a lead (matched to an existing record if you are already a
            customer). We save this when we check your address, whether or not
            you go on to book. We do not send you automatic emails or texts
            because of this, and we may follow up with you personally about
            your request. If you leave the booking form before it checks your
            address, we do not save what you typed.
          </li>
          <li>
            <strong>Testimonials:</strong> we publish customer testimonials
            on our reviews page only with the customer’s permission, and we
            remove one on request.
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
            <strong>Analytics and session recordings (Microsoft
            Clarity):</strong> our public pages and the booking page use
            Microsoft Clarity to record how visitors use them, such as where
            they click and scroll, and to build heatmaps, so we can improve
            the site. We configure Clarity to mask text and form inputs, so
            what you type into our forms is not shown in recordings. Clarity
            sets cookies on your device to recognize a returning visitor and
            to join page views into one session; some are set by Microsoft.
            Clarity sends this information to Microsoft, which handles it
            under the{" "}
            <a href="https://privacy.microsoft.com/privacystatement" rel="noopener noreferrer">
              Microsoft Privacy Statement
            </a>
            . We do not add Clarity to the personal links we email to
            customers (payment, invoice, visit, and consent pages) or to the
            contact form page. If you reach the contact form by clicking
            through from another page on our site, Clarity may already be
            loaded from that earlier page.
          </li>
          <li>
            <strong>Advertising (Google Ads):</strong> our public pages and
            the booking page use the Google Ads tag to measure how well our
            Google ads work. When you visit those pages, Google receives
            page-visit and device information, such as the page address,
            your IP address, and your browser and device type. If you came
            from a Google ad, it also receives the ad click identifier in
            the page address. The tag may set cookies on this site and on
            Google’s own domains for this purpose. It does not send Google
            what you type into the booking form. We do not add it to the
            personal links we email to customers (payment, invoice, visit,
            and consent pages) or to the contact form page. If you reach the
            contact form by clicking through from another page on our site,
            the tag may already be loaded in your browser from that earlier
            page, but we do not send it any new information about the
            contact form. Google’s address
            suggestions (see below) are a separate Google service that does
            receive the address text you type.
          </li>
          <li>
            <strong>Browser storage:</strong> the chat assistant and payment
            pages keep a small amount of information in your browser’s
            session storage (for example, the current chat conversation) so
            it survives a page reload. It is cleared when you close the tab.
          </li>
          <li>
            <strong>Contact form hand-off:</strong> if you click “Send us a
            message” from the booking screen telling you we are out of your
            area or have no openings, your name, contact details, address,
            and machine details are held temporarily in your browser’s
            session storage so we can fill in the contact form for you. They
            are deleted as soon as the contact form loads, or after 10
            minutes if it never does. Nothing is sent to us until you submit
            the form.
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
          We do not sell your personal information. The data the Google Ads
          tag collects is described under Information Collected
          Automatically.
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
            <strong>Google</strong> — advertising measurement (the Google Ads
            tag), address suggestions while you type your address, converting
            addresses to map coordinates for scheduling and routing, and the
            Google reviews shown on this site. Google’s use of information is governed by the{" "}
            <a href="https://policies.google.com/privacy" rel="noopener noreferrer">
              Google Privacy Policy
            </a>
            .
          </li>
          <li><strong>Microsoft Clarity</strong> — session recordings and heatmaps of how visitors use our public pages, with text and form input masked.</li>
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
          business, tax, and legal records. We do not delete these
          automatically. Leads (people who contact us, chat with us, or are
          saved when we can’t book them or when they see appointment
          times, and who never become customers) are kept until the
          person asks us to delete them. To ask, email{" "}
          <a href={NAP.emailHref}>{NAP.email}</a> or call{" "}
          <a href={NAP.phoneHref}>{NAP.phoneDisplay}</a>. Copies of our
          database exported to our own computers for backup may also contain
          your records; those files are deleted on request too.
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
            <strong>Advertising:</strong> you can control how Google uses
            your data for ads in{" "}
            <a href="https://adssettings.google.com" rel="noopener noreferrer">
              Google Ads Settings
            </a>
            , and you can block or delete cookies, or turn on your browser’s
            privacy controls, in your browser’s settings.
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
