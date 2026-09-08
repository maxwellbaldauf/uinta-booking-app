import "./theme.css";
import "./marketing.css";
import { SiteHeader } from "@/components/marketing/SiteHeader";
import { SiteFooter } from "@/components/marketing/SiteFooter";
import { MobileCtaBar } from "@/components/marketing/MobileCtaBar";
import { MarketingScripts } from "@/components/marketing/MarketingScripts";

// Shared chrome for the public marketing pages: home + /ice-machine-cleaning,
// /troubleshooting, /brands, /service-areas. The booking flow, contact form,
// and token pages are outside this route group and keep their bare layout.
// The next/font variables (--font-body, --font-display) are set on <body> in
// the root layout; .mkt-root just carries the marketing type/color base.
export default function MarketingLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <div className="mkt-root">
      <SiteHeader />
      <main className="mkt-main">{children}</main>
      <SiteFooter />
      <MobileCtaBar />
      <MarketingScripts />
    </div>
  );
}
