import Link from "next/link";
import { NAP } from "@/lib/site";

// Persistent bottom bar on phones: the primary "Book a cleaning" action plus a
// call button, always reachable. Hidden at >=48rem, where the header carries
// both. The (marketing) tree reserves --botbar-h of bottom space so this never
// covers content.
export function MobileCtaBar() {
  return (
    <div className="mkt-botbar">
      <Link href="/book" className="mkt-btn mkt-btn--primary">
        Book a cleaning
      </Link>
      <a
        href={NAP.phoneHref}
        className="mkt-btn mkt-btn--secondary"
        aria-label={`Call or text ${NAP.phoneDisplay}`}
      >
        <svg
          width="20"
          height="20"
          viewBox="0 0 24 24"
          fill="none"
          stroke="currentColor"
          strokeWidth="2"
          strokeLinecap="round"
          strokeLinejoin="round"
          aria-hidden="true"
        >
          <path d="M22 16.92v3a2 2 0 0 1-2.18 2 19.79 19.79 0 0 1-8.63-3.07 19.5 19.5 0 0 1-6-6 19.79 19.79 0 0 1-3.07-8.67A2 2 0 0 1 4.11 2h3a2 2 0 0 1 2 1.72c.13.99.36 1.95.7 2.87a2 2 0 0 1-.45 2.11L8.09 9.91a16 16 0 0 0 6 6l1.2-1.27a2 2 0 0 1 2.11-.45c.92.34 1.88.57 2.87.7A2 2 0 0 1 22 16.92z" />
        </svg>
      </a>
    </div>
  );
}
