import type { Metadata } from "next";
import { absoluteUrl } from "./site";

// Per-page metadata for the marketing pages: title and description straight
// from content/*.md, a canonical URL, and matching Open Graph / Twitter tags.
export function pageMetadata({
  title,
  description,
  path,
}: {
  title: string;
  description: string;
  path: string;
}): Metadata {
  const url = absoluteUrl(path);
  return {
    title,
    description,
    alternates: { canonical: path },
    openGraph: {
      title,
      description,
      url,
      type: "website",
      siteName: "Uinta Ice Co.",
      locale: "en_US",
    },
    twitter: { card: "summary", title, description },
  };
}
