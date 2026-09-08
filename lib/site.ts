// Site-wide constants for the public marketing pages (home + the four content
// pages). Plain data, safe to import from client and server components alike —
// nothing secret here.
//
// The price is the one thing that is NOT here: it lives in Supabase
// (`settings.base_price_cents`, via lib/settings.ts) so the site and the amount
// actually charged can't drift.

// Canonical origin for absolute URLs (canonical tags, sitemap, JSON-LD).
// Overridable per environment; defaults to the production domain.
export const SITE_ORIGIN = (
  process.env.NEXT_PUBLIC_SITE_URL?.trim() || "https://uintaice.com"
).replace(/\/$/, "");

// Name / Address / Phone. `NAP_LINE` is the exact string rendered wherever the
// NAP appears as one line (the footer today); keep it byte-identical to the
// values used in the JSON-LD so the two never disagree.
export const NAP = {
  legalName: "Uinta Ice Co., LLC",
  name: "Uinta Ice Co.",
  phoneDisplay: "(801) 796-2675",
  phoneHref: "tel:+18017962675",
  email: "max@uintaice.com",
  emailHref: "mailto:max@uintaice.com",
  locality: "Lehi",
  region: "UT",
  regionName: "Utah",
  country: "US",
} as const;

export const NAP_LINE = `${NAP.legalName} · ${NAP.phoneDisplay} · ${NAP.email}`;

// Google Business Profile listing, for JSON-LD `sameAs`. Derived from the
// feature id in the Maps place URL (…:0xb6a2edb97452562d).
export const SAME_AS: string[] = [
  "https://www.google.com/maps?cid=13160342441906296365",
];

export const ESTABLISHED_YEAR = 2022;
export const SINCE_LINE = `Serving Utah homes since ${ESTABLISHED_YEAR}`;
export const SERVICE_RADIUS_MILES = 75;

// Header nav — the four text links. "Book a cleaning" and click-to-call are
// rendered separately and never collapse into the mobile menu.
export const NAV_ITEMS = [
  { href: "/ice-machine-cleaning", label: "Service" },
  { href: "/troubleshooting", label: "Troubleshooting" },
  { href: "/brands", label: "Brands" },
  { href: "/service-areas", label: "Service Areas" },
] as const;

// Footer page links (nav items plus Home).
export const FOOTER_LINKS = [
  { href: "/", label: "Home" },
  ...NAV_ITEMS,
] as const;

// Rendered as plain text in the footer, and the basis for the brands covered
// on /brands. Order matches the home page copy.
export const BRANDS_SERVICED = [
  "Scotsman",
  "Sub-Zero",
  "U-Line",
  "KitchenAid",
  "GE Profile",
  "GE Monogram",
] as const;

// Every city named on /service-areas (§ "Every City We Serve"). Feeds the
// LocalBusiness `areaServed` in Phase 6; kept here so there's one list.
export const SERVICE_CITIES = [
  "Alpine",
  "American Fork",
  "Cottonwood Heights",
  "Draper",
  "Eagle Mountain",
  "Genola",
  "Heber City",
  "Highland",
  "Holladay",
  "Kaysville",
  "Lehi",
  "Lindon",
  "Mapleton",
  "Midway",
  "Ogden",
  "Orem",
  "Park City",
  "Pleasant Grove",
  "Provo",
  "Riverton",
  "Salt Lake City",
  "Sandy",
  "Saratoga Springs",
  "South Jordan",
  "Sundance",
  "Woodland Hills",
] as const;
