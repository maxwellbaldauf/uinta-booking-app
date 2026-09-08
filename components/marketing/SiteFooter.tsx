import Link from "next/link";
import { FOOTER_LINKS, NAP, SINCE_LINE } from "@/lib/site";
import { SocialLinks } from "./SocialLinks";

// Persistent footer for the marketing pages. The NAP line renders the exact
// string used in the JSON-LD (Phase 6) — legal name, phone, email — so the two
// can't disagree.
export function SiteFooter() {
  const year = new Date().getFullYear();

  return (
    <footer className="mkt-footer">
      <div className="mkt-footer__inner">
        <p className="mkt-footer__nap">
          <strong>{NAP.legalName}</strong>
          {" · "}
          <a href={NAP.phoneHref}>{NAP.phoneDisplay}</a>
          {" · "}
          <a href={NAP.emailHref}>{NAP.email}</a>
          <br />
          {NAP.locality}, {NAP.regionName}
        </p>

        <SocialLinks className="mkt-footer__social" />

        <ul className="mkt-footer__links">
          {FOOTER_LINKS.map((link) => (
            <li key={link.href}>
              <Link href={link.href}>{link.label}</Link>
            </li>
          ))}
        </ul>

        <p className="mkt-footer__meta">Licensed and insured. {SINCE_LINE}.</p>

        <Link href="/book" className="mkt-btn mkt-btn--primary mkt-footer__cta">
          Book a cleaning
        </Link>

        <p className="mkt-footer__legal">
          &copy; {year} {NAP.legalName}
        </p>
      </div>
    </footer>
  );
}
