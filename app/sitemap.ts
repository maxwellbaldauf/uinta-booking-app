import type { MetadataRoute } from "next";
import { SITE_ORIGIN } from "@/lib/site";

// The public, indexable pages. The token pages (/visit, /pay) and dev routes
// are intentionally excluded and also disallowed in robots.ts.
export default function sitemap(): MetadataRoute.Sitemap {
  const lastModified = new Date();
  const pages: { path: string; priority: number }[] = [
    { path: "/", priority: 1 },
    { path: "/ice-machine-cleaning", priority: 0.9 },
    { path: "/troubleshooting", priority: 0.9 },
    { path: "/brands", priority: 0.8 },
    { path: "/service-areas", priority: 0.8 },
    { path: "/book", priority: 0.7 },
    { path: "/contact", priority: 0.5 },
  ];

  return pages.map(({ path, priority }) => ({
    url: path === "/" ? `${SITE_ORIGIN}/` : `${SITE_ORIGIN}${path}`,
    lastModified,
    changeFrequency: "monthly",
    priority,
  }));
}
