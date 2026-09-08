import "./marketing.css";
import { SiteHeader } from "@/components/marketing/SiteHeader";
import { SiteFooter } from "@/components/marketing/SiteFooter";

// Shared chrome for the public marketing pages: home + /ice-machine-cleaning,
// /troubleshooting, /brands, /service-areas. The booking flow, contact form,
// and token pages are outside this route group and keep their bare layout.
export default function MarketingLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <>
      <SiteHeader />
      <main className="mkt-main">{children}</main>
      <SiteFooter />
    </>
  );
}
