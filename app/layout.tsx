import type { Metadata, Viewport } from "next";
import Script from "next/script";
import "./globals.css";

export const metadata: Metadata = {
  title: "Uinta Ice Co — Book a Cleaning",
  description:
    "Book a residential ice machine cleaning with Uinta Ice Co. Semi-annual service, cards on file, no account needed.",
};

export const viewport: Viewport = {
  themeColor: "#0f6e8c",
  width: "device-width",
  initialScale: 1,
};

const PLAUSIBLE_DOMAIN = process.env.NEXT_PUBLIC_PLAUSIBLE_DOMAIN;

export default function RootLayout({
  children,
}: Readonly<{ children: React.ReactNode }>) {
  return (
    <html lang="en">
      <body>
        {children}
        {/* Plausible — privacy-friendly, no cookie banner needed. Loads only
            when a domain is configured. This is a plain public website: no
            service worker, no PWA (Project A is the installable one). */}
        {PLAUSIBLE_DOMAIN && (
          <Script
            defer
            data-domain={PLAUSIBLE_DOMAIN}
            src="https://plausible.io/js/script.js"
            strategy="afterInteractive"
          />
        )}
      </body>
    </html>
  );
}
