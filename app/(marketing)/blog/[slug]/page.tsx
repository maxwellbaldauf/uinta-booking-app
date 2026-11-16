import Link from "next/link";
import { notFound, permanentRedirect } from "next/navigation";
import type { Metadata } from "next";
import { pageMetadata } from "@/lib/seo";
import { getBlogPost } from "@/lib/blogPosts";
import { breadcrumbSchema, webPageSchema } from "@/lib/schema";
import { JsonLd } from "@/components/marketing/JsonLd";

// One weekly post (lib/blogPosts.ts). Unknown slugs 404; an outdated title
// slug for a real post redirects to the current one.
export const revalidate = 3600;
export const dynamicParams = true;

type Params = { slug: string };

export async function generateMetadata({ params }: { params: Promise<Params> }): Promise<Metadata> {
  const { slug } = await params;
  const post = await getBlogPost(slug);
  if (!post) return { title: "Not found", robots: { index: false } };
  return pageMetadata({
    title: `${post.title} | Uinta Ice Co.`,
    description: (post.paragraphs[0] ?? post.title).slice(0, 155),
    path: `/blog/${post.slug}`,
  });
}

export default async function BlogPostPage({ params }: { params: Promise<Params> }) {
  const { slug } = await params;
  const post = await getBlogPost(slug);
  if (!post) notFound();
  if (post.slug !== slug) permanentRedirect(`/blog/${post.slug}`);

  const path = `/blog/${post.slug}`;
  return (
    <article className="mkt-wrap mkt-prose">
      <JsonLd
        graph={[
          breadcrumbSchema([
            { name: "Home", path: "/" },
            { name: "Blog", path: "/blog" },
            { name: post.title, path },
          ]),
          webPageSchema({ path, dateModified: post.publishedAt }),
        ]}
      />
      <header className="mkt-pagehead">
        <p className="mkt-updated">
          <Link href="/blog">Blog</Link> / {new Date(post.publishedAt).toLocaleDateString("en-US", { month: "long", day: "numeric", year: "numeric", timeZone: "America/Denver" })}
        </p>
        <h1>{post.title}</h1>
      </header>
      <section className="mkt-section">
        {post.paragraphs.map((p, i) => (
          <p key={i}>{p}</p>
        ))}
      </section>
      <section className="mkt-section">
        <div className="mkt-cta-row">
          <Link href="/book" className="mkt-btn mkt-btn--primary">
            Book a cleaning
          </Link>
          <Link href="/blog" className="mkt-btn mkt-btn--secondary">
            All posts
          </Link>
        </div>
      </section>
    </article>
  );
}
