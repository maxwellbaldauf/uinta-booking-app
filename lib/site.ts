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

// One absolute-URL builder for the canonical tag, breadcrumb JSON-LD, and the
// sitemap, so a trailing-slash / prefix change is made in one place.
export function absoluteUrl(path: string): string {
  return path === "/" ? `${SITE_ORIGIN}/` : `${SITE_ORIGIN}${path}`;
}

// Name / Address / Phone. Keep byte-identical to the values used in the JSON-LD
// (lib/schema.ts) so the two never disagree.
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

// Social profiles. Rendered as icon links in the home page About section and
// the footer; also feed JSON-LD `sameAs` in Phase 6. `key` maps to the icon in
// components/marketing/SocialLinks.tsx.
export const SOCIAL_LINKS = [
  {
    key: "facebook",
    name: "Facebook",
    href: "https://www.facebook.com/profile.php?id=61593982749812",
  },
  {
    key: "instagram",
    name: "Instagram",
    href: "https://www.instagram.com/uintaiceco/?hl=en",
  },
  { key: "youtube", name: "YouTube", href: "https://www.youtube.com/@uintaiceco" },
  { key: "tiktok", name: "TikTok", href: "https://www.tiktok.com/@uintaiceco" },
] as const;

// JSON-LD `sameAs`: the Google Business Profile listing (derived from the
// feature id in the Maps place URL, …:0xb6a2edb97452562d) plus the socials.
export const SAME_AS: string[] = [
  "https://www.google.com/maps?cid=13160342441906296365",
  ...SOCIAL_LINKS.map((s) => s.href),
];

export const ESTABLISHED_YEAR = 2022;
export const SINCE_LINE = `Serving Utah homes since ${ESTABLISHED_YEAR}`;

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
