import { GOOGLE_PROFILE_URL, PAGE_UPDATED } from "@/lib/site";
import { pageMetadata } from "@/lib/seo";
import { breadcrumbSchema } from "@/lib/schema";
import { JsonLd } from "@/components/marketing/JsonLd";
import { TESTIMONIALS } from "@/content/testimonials";

// First-party testimonials, shared with each customer's permission (see
// content/testimonials.ts). Deliberately NO Review / AggregateRating JSON-LD,
// no star ratings, no counts, and no "verified" claims. The Google link below
// is a plain outbound link: nothing here calls a Google service.
export const metadata = pageMetadata({
  title: "Customer Reviews | Uinta Ice Co.",
  description:
    "What Utah customers say about Uinta Ice Co. ice machine cleaning, in their own words.",
  path: "/reviews",
});

const schema = [
  breadcrumbSchema([
    { name: "Home", path: "/" },
    { name: "Reviews", path: "/reviews" },
  ]),
];

export default function ReviewsPage() {
  return (
    <div className="mkt-wrap mkt-prose">
      <JsonLd graph={schema} />
      <header className="mkt-pagehead">
        <h1>Customer Reviews</h1>
        <p className="mkt-updated">Last updated: {PAGE_UPDATED.reviews.display}</p>
        <p className="mkt-lead">
          Words from customers who agreed to let us share them.
        </p>
      </header>

      <section className="mkt-section">
        <ul className="mkt-testimonials">
          {TESTIMONIALS.map((t, i) => (
            <li key={`${t.displayName}-${i}`}>
              <figure className="mkt-testimonial">
                <blockquote>
                  <p>{t.quote}</p>
                </blockquote>
                <figcaption>{t.displayName}</figcaption>
              </figure>
            </li>
          ))}
        </ul>

        <p className="mkt-testimonials__more">
          <a href={GOOGLE_PROFILE_URL} target="_blank" rel="noopener noreferrer">
            Read more reviews on Google.
          </a>
        </p>
      </section>
    </div>
  );
}
