"use client";

import { useEffect } from "react";
import { usePathname } from "next/navigation";
import Script from "next/script";

// Google Ads base tag (gtag.js) — no conversion event, no GA4. Mounted by the
// (marketing) layout and /book ONLY. Never add it to the root layout: the
// token pages (/visit, /pay, /invoice, /cluster-consent) and /contact must not
// load it. (A client-side navigation from a tagged page to /contact leaves the
// script resident in memory, but no config/event call is made there.)
//
// Loads only in production, and only when NEXT_PUBLIC_GOOGLE_ADS_ID is set.
// The config call runs from an effect rather than an inline <script> so it
// stays compatible with a CSP that disallows inline scripts.
const RAW_ID =
  process.env.NODE_ENV === "production"
    ? process.env.NEXT_PUBLIC_GOOGLE_ADS_ID
    : undefined;
const ADS_ID = RAW_ID && /^AW-\d+$/.test(RAW_ID) ? RAW_ID : undefined;

// Stripe's 3DS return lands on /book with these in the URL; they must not be
// reported to Google as part of page_location. gclid and every other param
// stay (Google Ads needs gclid for attribution).
const STRIPPED_PARAMS = [
  "setup_intent",
  "setup_intent_client_secret",
  "redirect_status",
];

function sanitizedLocation(): string {
  try {
    const url = new URL(window.location.href);
    for (const p of STRIPPED_PARAMS) url.searchParams.delete(p);
    return url.toString();
  } catch {
    // Can't parse the URL — report the path only rather than risk the secret.
    return window.location.origin + window.location.pathname;
  }
}

declare global {
  interface Window {
    dataLayer?: unknown[];
  }
}

// The (marketing) layout persists across client-side navigations, and gtag.js
// does not re-report a repeated config call for an already-configured ID. So
// the first call per page load is "js" + "config" (which sends the initial
// page_view); every later call (client-side navigation, or crossing between
// the marketing layout and /book) sends an explicit page_view event. That is
// a page view, not a conversion event.
let initialised = false;

export function GoogleAdsTag() {
  const pathname = usePathname();

  useEffect(() => {
    if (!ADS_ID) return;
    window.dataLayer = window.dataLayer || [];
    // gtag.js requires the `arguments` object itself, not a rest array.
    function gtag(..._args: unknown[]) {
      window.dataLayer!.push(arguments);
    }
    if (!initialised) {
      initialised = true;
      gtag("js", new Date());
      gtag("config", ADS_ID, { page_location: sanitizedLocation() });
    } else {
      gtag("event", "page_view", {
        send_to: ADS_ID,
        page_location: sanitizedLocation(),
        page_title: document.title,
      });
    }
  }, [pathname]);

  if (!ADS_ID) return null;
  return (
    <Script
      src={`https://www.googletagmanager.com/gtag/js?id=${ADS_ID}`}
      strategy="afterInteractive"
    />
  );
}
