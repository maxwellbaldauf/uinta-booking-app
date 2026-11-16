import Image from "next/image";
import Link from "next/link";
import { notFound } from "next/navigation";
import type { Metadata } from "next";
import { NAP, PAGE_UPDATED } from "@/lib/site";
import { pageMetadata } from "@/lib/seo";
import { getCityPage } from "@/lib/cityPages";
import { COMMERCIAL_INQUIRY_ANSWER, type FaqItem } from "@/lib/faq";
import { breadcrumbSchema, faqPageSchema, webPageSchema } from "@/lib/schema";
import { JsonLd } from "@/components/marketing/JsonLd";
import { Accordion, AccordionItem } from "@/components/marketing/Accordion";

// Published only when lib/cityPages.ts finds real data for the city; any
// other slug is a 404. Refreshes hourly (the data layer's cache window).
export const revalidate = 3600;
export const dynamicParams = true;

type Params = { city: string };

export async function generateMetadata({
  params,
}: {
  params: Promise<Params>;
}): Promise<Metadata> {
  const { city } = await params;
  const page = await getCityPage(city);
  if (!page) return { title: "Not found", robots: { index: false } };
  return pageMetadata({
    title: `Ice Machine Cleaning in ${page.name}, Utah | Uinta Ice Co.`,
    description: `In-home residential ice machine cleaning in ${page.name}, Utah. Based in Lehi, we descale, deep clean, and sanitize undercounter ice machines. Book online.`,
    path: `/service-areas/${page.slug}`,
  });
}

export default async function CityPage({ params }: { params: Promise<Params> }) {
  const { city } = await params;
  const page = await getCityPage(city);
  if (!page) notFound();

  const path = `/service-areas/${page.slug}`;
  const { content } = page;

  const faqs: FaqItem[] = [
    {
      q: `Do you clean ice machines in ${page.name}?`,
      a: `Yes. We’re based in Lehi, Utah, and travel to ${page.name} for in-home residential ice machine cleaning.`,
    },
    {
      q: "How long does a visit take?",
      a: "A visit takes about an hour.",
    },
    {
      q: `Do you clean commercial ice machines in ${page.name}?`,
      a: COMMERCIAL_INQUIRY_ANSWER,
    },
    {
      q: "How do I book?",
      a: `Book online, or call or text ${NAP.phoneDisplay}.`,
      link: { href: "/book", text: "Book a cleaning" },
    },
    ...(content?.faqs ?? []),
  ];

  const intro =
    content?.intro?.trim() ||
    `Uinta Ice Co. cleans residential ice machines in ${page.name}, Utah${
      page.jobCount > 0 && page.firstMonth
        ? `, and has completed ${page.jobCount} ${
            page.jobCount === 1 ? "cleaning" : "cleanings"
          } there since ${page.firstMonth}`
        : ""
    }. We’re based in Lehi and come to you.`;

  const schema = [
    breadcrumbSchema([
      { name: "Home", path: "/" },
      { name: "Service Areas", path: "/service-areas" },
      { name: page.name, path },
    ]),
    webPageSchema({
      path,
      dateModified: page.lastModified ?? PAGE_UPDATED.serviceAreas.iso,
    }),
    faqPageSchema(faqs),
  ];

  return (
    <div className="mkt-wrap mkt-prose">
      <JsonLd graph={schema} />
      <header className="mkt-pagehead">
        <p className="mkt-updated">
          <Link href="/service-areas">Service areas</Link> / {page.name}
        </p>
        <h1>Ice Machine Cleaning in {page.name}, Utah</h1>
        <p className="mkt-lead">{intro}</p>
        <div className="mkt-cta-row">
          <Link href="/book" className="mkt-btn mkt-btn--primary">
            Book a cleaning
          </Link>
          <a href={NAP.phoneHref} className="mkt-btn mkt-btn--secondary">
            Call or text {NAP.phoneDisplay}
          </a>
        </div>
      </header>

      {content?.localNotes?.length ? (
        <section className="mkt-section" aria-label={`About ${page.name}`}>
          <h2>Cleaning in {page.name}</h2>
          {content.localNotes.map((n) => (
            <p key={n}>{n}</p>
          ))}
        </section>
      ) : null}

      {page.recentJobs.length > 0 && (
        <section className="mkt-section" aria-label="Recent cleanings">
          <h2>Recent cleanings in {page.name}</h2>
          <ul className="mkt-city-jobs">
            {page.recentJobs.map((j, i) => (
              <li key={i}>
                <span>{j.month}</span>
                <span>{j.machine}</span>
              </li>
            ))}
          </ul>
          <p className="mkt-city-note">
            Completed jobs only. Customer names and addresses are never shown.
          </p>
        </section>
      )}

      {content?.photos?.length ? (
        <section className="mkt-section" aria-label="Photos">
          <h2>From the job</h2>
          <div className="mkt-city-photos">
            {content.photos.map((p) => (
              <figure key={p.src}>
                <Image src={p.src} alt={p.alt} width={600} height={800} />
                <figcaption>{p.caption}</figcaption>
              </figure>
            ))}
          </div>
        </section>
      ) : null}

      <section className="mkt-section" aria-label="Questions">
        <h2>Questions about service in {page.name}</h2>
        <Accordion>
          {faqs.map((f, i) => (
            <AccordionItem key={f.q} id={`faq-${i + 1}`} summary={f.q}>
              <p>{f.a}</p>
              {f.link && (
                <p>
                  <Link href={f.link.href}>{f.link.text}</Link>
                </p>
              )}
            </AccordionItem>
          ))}
        </Accordion>
      </section>

      <section className="mkt-section">
        <div className="mkt-cta-row">
          <Link href="/book" className="mkt-btn mkt-btn--primary">
            Book a cleaning
          </Link>
          <Link href="/service-areas" className="mkt-btn mkt-btn--secondary">
            All service areas
          </Link>
        </div>
      </section>
    </div>
  );
}
