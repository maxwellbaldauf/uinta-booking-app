// Data layer for /blog. A post exists only as a content_drafts row with kind
// 'blog_post' and status 'posted' — written each Monday by
// lib/jobs/runWeeklyContentDrafts.ts from last week's real completed jobs.
// URL: /blog/{week_start}-{title-slug}; the date part is the lookup key, so a
// stale title slug redirects to the current one.
import { unstable_cache } from "next/cache";
import { businessDb } from "@/lib/tenant/business";
import { citySlug } from "./cityFacts";

export type BlogPost = {
  slug: string;
  date: string; // week_start (Monday of the week written about)
  publishedAt: string;
  title: string;
  paragraphs: string[];
};

function toPost(r: { week_start: string; title: string | null; body: string; posted_at: string | null; created_at: string }): BlogPost {
  const title = (r.title ?? "").trim() || "Last week's cleanings";
  return {
    slug: `${r.week_start}-${citySlug(title).slice(0, 60).replace(/-+$/, "")}`,
    date: r.week_start,
    publishedAt: r.posted_at ?? r.created_at,
    title,
    paragraphs: r.body
      .split(/\n\s*\n/)
      .map((p) => p.replace(/\s+/g, " ").trim())
      .filter(Boolean),
  };
}

async function loadPosts(): Promise<BlogPost[]> {
  const { data, error } = await businessDb()
    .from("content_drafts")
    .select("week_start, title, body, posted_at, created_at")
    .eq("kind", "blog_post")
    .eq("status", "posted")
    .order("week_start", { ascending: false })
    .limit(200);
  if (error) throw new Error(`blog posts query failed: ${error.message}`);
  return (data ?? []).map(toPost);
}

export const getPublishedBlogPosts = unstable_cache(loadPosts, ["blog-posts-v1"], {
  revalidate: 3600,
  tags: ["blog-posts"],
});

// Returns the post for a slug's date part (null if none / malformed).
export async function getBlogPost(slug: string): Promise<BlogPost | null> {
  const m = /^(\d{4}-\d{2}-\d{2})(-[a-z0-9-]{0,80})?$/.exec(slug);
  if (!m) return null;
  return (await getPublishedBlogPosts()).find((p) => p.date === m[1]) ?? null;
}
