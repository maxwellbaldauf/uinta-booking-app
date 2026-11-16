import Link from "next/link";
import type { Metadata } from "next";
import { pageMetadata } from "@/lib/seo";
import { getPublishedBlogPosts } from "@/lib/blogPosts";
import { longDate } from "@/lib/cityFacts";
import { breadcrumbSchema } from "@/lib/schema";
import { JsonLd } from "@/components/marketing/JsonLd";

// Weekly notes written from last week's real completed jobs (published each
// Monday by the weekly-content-drafts function). Refreshes hourly.
export const revalidate = 3600;

export const metadata: Metadata = pageMetadata({
  title: "Notes from the Route | Uinta Ice Co.",
  description:
    "Weekly notes on the residential ice machine cleanings Uinta Ice Co. completed around Utah. Based in Lehi.",
  path: "/blog",
});

export default async function BlogIndex() {
  const posts = await getPublishedBlogPosts().catch(() => []);
  return (
    <div className="mkt-wrap mkt-prose">
      <JsonLd graph={[breadcrumbSchema([{ name: "Home", path: "/" }, { name: "Blog", path: "/blog" }])]} />
      <header className="mkt-pagehead">
        <h1>Notes from the Route</h1>
        <p className="mkt-lead">Weekly notes on the cleanings we completed, written from our job records.</p>
      </header>
      <section className="mkt-section" aria-label="Posts">
        {posts.length === 0 ? (
          <p>No posts yet.</p>
        ) : (
          <ul className="mkt-blog-list">
            {posts.map((p) => (
              <li key={p.slug}>
                <Link href={`/blog/${p.slug}`}>{p.title}</Link>
                <span>Week of {longDate(p.date)}</span>
              </li>
            ))}
          </ul>
        )}
      </section>
    </div>
  );
}
