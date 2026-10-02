"use client";

import { useEffect, useSyncExternalStore } from "react";
import Script from "next/script";

// Microsoft Clarity (session recordings + heatmaps). Mounted by the (marketing)
// layout and /book ONLY. Never add it to the root layout: the token pages
// (/visit, /pay, /invoice, /cluster-consent) and /contact must not load it. (A
// client-side navigation from a tagged page to /contact leaves Clarity resident
// in memory — Clarity has no documented "stop" call — which is why the contact
// form and chat panel carry data-clarity-mask="true".)
//
// REQUIRED MANUAL STEP before enabling: Clarity dashboard -> Settings ->
// Masking -> Strict. Masking changes aren't retroactive.
//
// Loads only in production, and only when NEXT_PUBLIC_CLARITY_ID is set and
// well-formed. The queue stub (what Clarity's inline snippet creates) is
// installed from an effect instead of an inline <script>, so this stays
// compatible with a CSP that disallows inline scripts. We make no clarity()
// API calls, so the stub is belt-and-braces.
const RAW_ID =
  process.env.NODE_ENV === "production"
    ? process.env.NEXT_PUBLIC_CLARITY_ID
    : undefined;
const CLARITY_ID = RAW_ID && /^[a-z0-9]{6,16}$/.test(RAW_ID) ? RAW_ID : undefined;

type ClarityFn = ((...args: unknown[]) => void) & { q?: unknown[] };

declare global {
  interface Window {
    clarity?: ClarityFn;
  }
}

const subscribe = () => () => {};
// Stripe's 3DS return lands on /book with the SetupIntent client secret, id and
// status in the query string (the same three GoogleAdsTag strips), and Clarity
// records the page URL. Don't load it there. The server snapshot is "blocked",
// so the tag only ever renders after hydration.
const STRIPE_RETURN_PARAMS = ["setup_intent_client_secret", "setup_intent", "redirect_status"];
const urlAllowed = () => {
  const params = new URLSearchParams(window.location.search);
  return !STRIPE_RETURN_PARAMS.some((p) => params.has(p));
};

export function ClarityTag() {
  const allowed = useSyncExternalStore(subscribe, urlAllowed, () => false);
  const enabled = !!CLARITY_ID && allowed;

  useEffect(() => {
    if (!enabled || window.clarity) return;
    const stub: ClarityFn = function (...args: unknown[]) {
      // Queue only; nothing in this app calls clarity().
      (stub.q = stub.q || []).push(args);
    };
    window.clarity = stub;
  }, [enabled]);

  if (!enabled) return null;
  return (
    <Script
      id="clarity-tag"
      src={`https://www.clarity.ms/tag/${encodeURIComponent(CLARITY_ID!)}`}
      strategy="afterInteractive"
    />
  );
}
