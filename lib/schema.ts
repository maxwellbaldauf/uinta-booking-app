// JSON-LD builders for the marketing pages. Each returns a plain schema.org
// node without its own @context — components/marketing/JsonLd.tsx wraps a
// page's nodes in a single { "@context", "@graph": [...] } script.
//
// No Review or AggregateRating anywhere: there are no real reviews yet, and
// publishing fake ones is a trust and legal problem.
//
// No price anywhere: the price appears exactly once on the site, in the home
// page pricing section, and is read from the database. It is deliberately kept
// out of JSON-LD too.

import {
  ESTABLISHED_YEAR,
  NAP,
  SAME_AS,
  SERVICE_CITIES,
  SITE_ORIGIN,
} from "./site";
import type { FaqItem } from "./faq";

const BUSINESS_ID = `${SITE_ORIGIN}/#business`;
const LOGO_URL = `${SITE_ORIGIN}/images/logo.png`;

const BUSINESS_DESCRIPTION =
  "Residential ice machine cleaning service based in Lehi, Utah. We descale, " +
  "deep clean, and sanitize undercounter and built-in residential ice machines " +
  "in customers' homes across Utah County and Salt Lake County, within a " +
  "75-mile radius.";

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
}): Record<string, unknown> {
  return {
    "@type": "Service",
    "@id": `${SITE_ORIGIN}${opts.path}#service`,
    serviceType: "Residential ice machine cleaning",
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
      item:
        crumb.path === "/"
          ? `${SITE_ORIGIN}/`
          : `${SITE_ORIGIN}${crumb.path}`,
    })),
  };
}
