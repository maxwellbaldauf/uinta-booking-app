import "./theme.css";
import "./marketing.css";
import { inter, tenorSans } from "@/app/fonts";
import { SiteHeader } from "@/components/marketing/SiteHeader";
import { SiteFooter } from "@/components/marketing/SiteFooter";
import { MobileCtaBar } from "@/components/marketing/MobileCtaBar";
import { MarketingScripts } from "@/components/marketing/MarketingScripts";

// Shared chrome for the public marketing pages: home + /ice-machine-cleaning,
// /troubleshooting, /brands, /service-areas. The booking flow, contact form,
// and token pages are outside this route group and keep their bare layout.
// The wrapper carries the next/font CSS variables, scoped to these routes.
export default function MarketingLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <div className={`mkt-root ${inter.variable} ${tenorSans.variable}`}>
      <SiteHeader />
      <main className="mkt-main">{children}</main>
      <SiteFooter />
      <MobileCtaBar />
      <MarketingScripts />
    </div>
  );
}
