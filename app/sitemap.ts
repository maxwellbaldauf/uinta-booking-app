import type { MetadataRoute } from "next";
import { absoluteUrl, PAGE_UPDATED } from "@/lib/site";

// The public, indexable pages. The token pages (/visit, /pay) and dev routes
// are intentionally excluded and also disallowed in robots.ts. lastModified
// comes from PAGE_UPDATED (lib/site.ts) for pages with a tracked editorial
// date; pages without one (no content-date to report) omit lastModified
// rather than stamp a build timestamp.
export default function sitemap(): MetadataRoute.Sitemap {
  const pages: { path: string; priority: number; dateKey?: keyof typeof PAGE_UPDATED }[] = [
    { path: "/", priority: 1, dateKey: "home" },
    { path: "/ice-machine-cleaning", priority: 0.9, dateKey: "iceMachineCleaning" },
    { path: "/troubleshooting", priority: 0.9, dateKey: "troubleshooting" },
    { path: "/brands", priority: 0.8, dateKey: "brands" },
    { path: "/service-areas", priority: 0.8, dateKey: "serviceAreas" },
    { path: "/about", priority: 0.6, dateKey: "about" },
    { path: "/book", priority: 0.7 },
    { path: "/contact", priority: 0.5 },
  ];

  return pages.map(({ path, priority, dateKey }) => ({
    url: absoluteUrl(path),
    ...(dateKey ? { lastModified: PAGE_UPDATED[dateKey].iso } : {}),
    changeFrequency: "monthly",
    priority,
  }));
}
