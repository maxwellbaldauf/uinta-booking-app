// Hand-supplied local content for /service-areas/[city]. Entirely optional:
// a city page publishes on its own once it has real completed jobs
// (lib/cityPages.ts). Add an entry here to
//   - give a city its own intro, local notes and FAQ answers, and/or
//   - publish a city that has no completed job yet — it needs a real `intro`
//     (and the city must already be in SERVICE_CITIES in lib/site.ts).
//
// Only write what is true. No invented jobs, customers, reviews, addresses or
// claims of a physical location outside Lehi.
//
// Photos: drop real job photos in public/images/cities/ with descriptive
// filenames (e.g. ge-undercounter-reservoir-before-holladay.webp), then list
// them here with alt text that states only what the photo shows. Never use
// customer-identifying shots (house numbers, faces, street views).
//
// Keys are URL slugs: lowercase, hyphenated ("south-jordan").
import type { FaqItem } from "@/lib/faq";

export type CityPhoto = { src: string; alt: string; caption: string };

export type CityContent = {
  intro?: string;
  localNotes?: string[];
  faqs?: FaqItem[];
  photos?: CityPhoto[];
  // Bump when you edit this city's content; feeds dateModified and the sitemap.
  updated?: string; // ISO date, e.g. "2026-11-16"
};

export const CITY_CONTENT: Record<string, CityContent> = {
  // "holladay": {
  //   intro: "…",
  //   localNotes: ["…"],
  //   faqs: [{ q: "…", a: "…" }],
  //   photos: [{ src: "/images/cities/…webp", alt: "…", caption: "…" }],
  //   updated: "2026-11-16",
  // },
};
