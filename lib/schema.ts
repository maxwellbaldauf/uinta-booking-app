// JSON-LD builders for the marketing pages. Each returns a plain schema.org
// node without its own @context — components/marketing/JsonLd.tsx wraps a
// page's nodes in a single { "@context", "@graph": [...] } script.
//
// No Review or AggregateRating anywhere: there are no real reviews yet, and
// publishing fake ones is a trust and legal problem.
//
// Price: shown once in the home page pricing section, sourced live from the
// database (never hardcoded) so the page and any JSON-LD referencing it can't
// drift apart. serviceSchema()'s optional `offer` takes the already-fetched
// cents value from the caller (this module stays synchronous, matching its
// sibling builders) rather than a literal string.

import {
  absoluteUrl,
  ESTABLISHED_YEAR,
  NAP,
  SAME_AS,
  SERVICE_CITIES,
  SITE_ORIGIN,
} from "./site";
import type { FaqItem } from "./faq";

const BUSINESS_ID = `${SITE_ORIGIN}/#business`;
const LOGO_URL = `${SITE_ORIGIN}/images/logo2.png`;

const BUSINESS_DESCRIPTION =
  "Residential and light commercial ice machine cleaning service based in " +
  "Lehi, Utah. We descale, deep clean, and sanitize undercounter and built-in " +
  "ice machines in homes, offices, retail showrooms, and small business " +
  "breakrooms across Utah County and Salt Lake County, within a 75-mile radius.";

export function localBusinessSchema(geo?: {
  lat: number;
  lng: number;
}): Record<string, unknown> {
  return {
    "@type": "LocalBusiness",
    "@id": BUSINESS_ID,
    name: NAP.name,
    legalName: NAP.legalName,
    url: `${SITE_ORIGIN}/`,
    telephone: NAP.phoneDisplay,
    email: NAP.email,
    description: BUSINESS_DESCRIPTION,
    foundingDate: String(ESTABLISHED_YEAR),
    logo: LOGO_URL,
    image: [LOGO_URL],
    address: {
      "@type": "PostalAddress",
      addressLocality: NAP.locality,
      addressRegion: NAP.region,
      addressCountry: NAP.country,
    },
    ...(geo
      ? {
          geo: {
            "@type": "GeoCoordinates",
            latitude: geo.lat,
            longitude: geo.lng,
          },
        }
      : {}),
    areaServed: SERVICE_CITIES.map((city) => ({ "@type": "City", name: city })),
    sameAs: SAME_AS,
  };
}

export function serviceSchema(opts: {
  name: string;
  description: string;
  path: string;
  // Defaults to the general (both-tiers) description; pass an explicit value
  // for a tier-specific entry (e.g. the home page's two Service offerings).
  serviceType?: string;
  // Present only for an entry that names a specific tier's price — the caller
  // passes the already-fetched settings value, so this stays live/DB-sourced
  // rather than a literal that could drift. durationIso is an ISO 8601
  // duration (e.g. "PT1H", "PT1H30M"); attached via additionalProperty since
  // Service has no first-class duration field, still a fully valid pattern
  // for a checkable structured fact.
  offer?: { priceCents: number; durationIso: string };
  // Required when a page emits more than one Service node at the same path
  // (e.g. home's residential + commercial offerings) — without it both would
  // share the same #service @id, an invalid collision for two distinct nodes.
  idSuffix?: string;
}): Record<string, unknown> {
  return {
    "@type": "Service",
    "@id": `${SITE_ORIGIN}${opts.path}#service${opts.idSuffix ?? ""}`,
    serviceType: opts.serviceType ?? "Residential and light commercial ice machine cleaning",
    name: opts.name,
    description: opts.description,
    url: `${SITE_ORIGIN}${opts.path}`,
    provider: {
      "@type": "LocalBusiness",
      "@id": BUSINESS_ID,
      name: NAP.name,
      telephone: NAP.phoneDisplay,
      url: `${SITE_ORIGIN}/`,
    },
    areaServed: [
      { "@type": "AdministrativeArea", name: "Utah County, Utah" },
      { "@type": "AdministrativeArea", name: "Salt Lake County, Utah" },
    ],
    ...(opts.offer
      ? {
          offers: {
            "@type": "Offer",
            price: (opts.offer.priceCents / 100).toFixed(2),
            priceCurrency: "USD",
          },
          additionalProperty: {
            "@type": "PropertyValue",
            name: "duration",
            value: opts.offer.durationIso,
          },
        }
      : {}),
  };
}

export function faqPageSchema(items: FaqItem[]): Record<string, unknown> {
  return {
    "@type": "FAQPage",
    mainEntity: items.map((item) => ({
      "@type": "Question",
      name: item.q,
      acceptedAnswer: { "@type": "Answer", text: item.a },
    })),
  };
}

export function breadcrumbSchema(
  trail: { name: string; path: string }[]
): Record<string, unknown> {
  return {
    "@type": "BreadcrumbList",
    itemListElement: trail.map((crumb, i) => ({
      "@type": "ListItem",
      position: i + 1,
      name: crumb.name,
      item: absoluteUrl(crumb.path),
    })),
  };
}
