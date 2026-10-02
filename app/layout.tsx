import type { Metadata, Viewport } from "next";
import { SITE_ORIGIN } from "@/lib/site";
import { inter, tenorSans } from "./fonts";
import "./globals.css";

export const metadata: Metadata = {
  metadataBase: new URL(SITE_ORIGIN),
  title: "Uinta Ice Co — Book a Cleaning",
  description:
    "Book a residential or light commercial ice machine cleaning with Uinta Ice Co. Semi-annual service, cards on file, no account needed.",
};

export const viewport: Viewport = {
  themeColor: "#12110f",
  width: "device-width",
  initialScale: 1,
};

export default function RootLayout({
  children,
}: Readonly<{ children: React.ReactNode }>) {
  return (
    // data-scroll-behavior="smooth": marketing.css sets `scroll-behavior: smooth`
    // on <html>; this attribute lets Next 16 force it back to `auto` during route
    // transitions (so client-side navigations jump instantly) while in-page
    // anchor scrolls still animate. See node_modules/next/dist/shared/lib/router/
    // utils/disable-smooth-scroll.js.
    <html lang="en" data-scroll-behavior="smooth">
      <body className={`${inter.variable} ${tenorSans.variable}`}>
        {children}
      </body>
    </html>
  );
}
