import Link from "next/link";
import { NAP, PAGE_UPDATED, SERVICE_CITIES } from "@/lib/site";
import { pageMetadata } from "@/lib/seo";
import { breadcrumbSchema, webPageSchema } from "@/lib/schema";
import { JsonLd } from "@/components/marketing/JsonLd";
import { Accordion, AccordionItem } from "@/components/marketing/Accordion";
import { Sources } from "@/components/marketing/Sources";
import { SOURCE_LINKS } from "@/lib/sources";

export const metadata = pageMetadata({
  title: "Ice Machine Cleaning Service Areas | Utah County & SLC",
  description:
    "In-home ice machine cleaning in Salt Lake City, Holladay, Park City, Heber, Alpine, Highland, Provo, Mapleton, and more. Based in Lehi, serving a 75-mile radius.",
  path: "/service-areas",
});

const JUMP = [
  { id: "alpine-highland", label: "Alpine and Highland" },
  { id: "east-bench", label: "The Salt Lake east bench" },
  { id: "park-city-heber", label: "Park City and Heber" },
  { id: "ogden-northern-utah", label: "Ogden and northern Utah" },
  { id: "utah-valley", label: "Utah Valley" },
  { id: "orem-provo", label: "Orem and Provo" },
  { id: "full-list", label: "Every city we serve" },
  { id: "water-hardness", label: "Water hardness by area" },
];

// Every figure already stated in the accordion prose above, gathered into one
// table.
const WATER_HARDNESS = [
  {
    area: "Park City, Heber, Midway, Sundance",
    supplier: "Mountain Regional Water",
    hardness: "≈300 mg/L (≈17.5 gpg)",
    classification: "Very hard",
  },
  {
    area: "South Jordan, Riverton, and other Jordan Valley–supplied areas",
    supplier: "Jordan Valley Water Conservancy District",
    hardness:
      "182.4 mg/L average total hardness (≈10.7 gpg); range 16–381 mg/L",
    classification: "Very hard (average)",
  },
  {
    area: "Salt Lake City, Holladay, Millcreek, Cottonwood Heights",
    supplier: "SLC Dept. of Public Utilities",
    hardness:
      "Canyon plants 136–212 mg/L (8.0–12.4 gpg); city wells 154–571 mg/L (9.6–33.4 gpg)",
    classification: "Hard to very hard",
  },
  {
    area: "Ogden",
    supplier:
      "Ogden City (wells, Pineview, Wheeler Creek) and Weber Basin WCD",
    hardness:
      "Ogden City publishes no hardness figure; Weber Basin publishes 10–18 gpg (171–308 mg/L)",
    classification: "Very hard (Weber Basin portion)",
  },
  {
    area: "Provo",
    supplier: "Provo City Water (springs and wells)",
    hardness: "10–15 gpg (typical)",
    classification: "Hard to very hard",
  },
  {
    area: "Orem",
    supplier: "City of Orem (wells, springs, and treated surface water)",
    hardness:
      "7–25 gpg (city sources); 6.55–9 gpg (regional treatment plant water)",
    classification: "Moderately hard to very hard",
  },
  {
    area: "Mapleton, Springville, Spanish Fork, Salem",
    supplier: "Each city’s own system (wells and springs)",
    hardness:
      "Not published by these cities; independent estimates 13–25 gpg (231–427 mg/L)",
    classification: "Very hard (estimated)",
  },
] as const;

// No FAQPage schema: the visible accordion prose doesn't match lib/faq.ts's
// condensed Q&A verbatim (Google wants the markup answer present on the page).
const schema = [
  breadcrumbSchema([
    { name: "Home", path: "/" },
    { name: "Service Areas", path: "/service-areas" },
  ]),
  webPageSchema({
    path: "/service-areas",
    dateModified: PAGE_UPDATED.serviceAreas.iso,
  }),
];

export default function ServiceAreasPage() {
  return (
    <div className="mkt-wrap mkt-prose">
      <JsonLd graph={schema} />
      <header className="mkt-pagehead">
        <h1>Ice Machine Cleaning Near You in Utah</h1>
        <p className="mkt-updated">
          Last updated: {PAGE_UPDATED.serviceAreas.display}
        </p>
        <p className="mkt-lead">
          Uinta Ice Co. is based in Lehi and cleans residential ice
          machines within a 75-mile radius, covering Utah County, Salt Lake
          County, Davis County, Ogden and northern Utah, and the Park City and
          Heber corridor. We come to you. A visit takes about an hour.
        </p>
        <div className="mkt-cta-row">
          <Link href="/book" className="mkt-btn mkt-btn--primary">
            Book a cleaning
          </Link>
          <a href={NAP.phoneHref} className="mkt-btn mkt-btn--secondary">
            Call or text {NAP.phoneDisplay}
          </a>
        </div>
      </header>

      <nav id="contents" className="mkt-jump" aria-label="On this page">
        <p className="mkt-jump__label">On this page</p>
        <ul>
          {JUMP.map((s) => (
            <li key={s.id}>
              <a href={`#${s.id}`}>{s.label}</a>
            </li>
          ))}
        </ul>
      </nav>

      <section className="mkt-section" aria-label="Areas we serve">
        <Accordion>
          <AccordionItem
            id="alpine-highland"
            headingLevel={2}
            defaultOpen
            summary="Do You Service Alpine and Highland?"
          >
            <p>
              Yes. The Alpine and Highland foothills are where we do more work
              than anywhere else we serve, and it’s a fifteen minute drive from
              our base in Lehi.
            </p>
            <p>
              The homes here are the reason. Newer construction along the bench,
              built in the last fifteen to twenty years, with the ice machine
              sitting in the kitchen island or tucked into a butler’s pantry off
              the main run. Undercounter Scotsman and Sub-Zero units mostly,
              installed as part of the original build, panel-fronted to match the
              cabinetry, and in a lot of cases never serviced since the day they
              were commissioned.
            </p>
            <p>
              That last part is the pattern. A machine installed by the builder
              doesn’t come with a maintenance conversation. The homeowner
              inherits an appliance nobody told them needed anything, and the
              first sign of trouble arrives years later as ice that tastes wrong
              or a bin that’s half as full as it used to be.
            </p>
            <p>
              Because we’re close and we’re here often, scheduling in Alpine and
              Highland is usually the easiest of anywhere we serve.
            </p>
            <p>
              <Link href="/brands">
                The brands we see most often in these homes
              </Link>
              .
            </p>
          </AccordionItem>

          <AccordionItem
            id="east-bench"
            headingLevel={2}
            summary="Do You Service Salt Lake City and the East Bench?"
          >
            <p>
              Yes. We service Salt Lake City, Holladay, Cottonwood Heights, and
              the surrounding east bench neighborhoods, including Old Colony and
              Walker Lane. Salt Lake City and Holladay are two of our busiest
              areas.
            </p>
            <p>
              The housing stock here is more varied than the Utah County
              foothills. Older east bench homes with renovated kitchens sit next
              to newer builds, and the ice machines reflect that. We see more
              retrofit installations here, machines added during a remodel rather
              than specified in an original build, and those tend to be tighter
              in the cabinet and more particular about drainage.
            </p>
            <p>
              Water on this side of the valley moves through the year, and the
              published numbers show how far. Salt Lake City’s Department of
              Public Utilities reports hardness by source. Its three canyon
              treatment plants came in at 136 mg/L at Big Cottonwood, 175 at
              Parleys, and 212 at City Creek, or about 8 to 12 grains per
              gallon. The city’s wells are a different matter: 154 to 571 mg/L,
              roughly 10 to 33 grains per gallon.
            </p>
            <p>
              Those wells come online in summer, when mountain runoff drops and
              the department blends groundwater into the system to meet demand.
              A machine in Salt Lake City, Holladay, Millcreek, or Cottonwood
              Heights can be fed water near the low end of hard in March and
              water several times harder in August, depending on which sources
              are feeding that neighborhood.
            </p>
            <p>
              It is why we don’t read a clean evaporator in spring as evidence
              the machine will stay clean through the year.
            </p>
          </AccordionItem>

          <AccordionItem
            id="park-city-heber"
            headingLevel={2}
            summary="Do You Service Park City, Heber, and Midway?"
          >
            <p>
              Yes. We service Park City, Heber City, Midway, and Sundance. Park
              City is one of our denser areas, and machines up there face the
              hardest water we deal with anywhere in our service radius.
            </p>
            <p>
              That’s documented rather than estimated. Mountain Regional Water,
              the Summit County district supplying much of the Park City area,
              states its hardness at roughly 300 mg/L as calcium carbonate,
              about 17.5 grains per gallon. Anything above 10.5 grains per gallon
              is classified as very hard.
            </p>
            <p>
              Scale accumulates faster at that level, which is why machines in
              this corridor often need attention sooner than the same unit would
              in the valley.
            </p>
            <p>
              There’s a second pattern here worth naming. A lot of these are
              second homes, occupied heavily for stretches and empty in between.
              An ice machine left running in an unoccupied house keeps cycling
              water through a reservoir nobody opens for weeks, and a machine
              shut off and drained improperly sits wet. Both produce biofilm
              faster than a house that’s lived in year-round.
            </p>
            <p>
              <Link href="/troubleshooting#how-often">
                How often Utah machines need service
              </Link>
              .
            </p>
            <p>
              <Link href="/troubleshooting#black-slime">
                How biofilm forms in a reservoir
              </Link>
              .
            </p>
          </AccordionItem>

          <AccordionItem
            id="ogden-northern-utah"
            headingLevel={2}
            summary="Do You Service Ogden and Northern Utah?"
          >
            <p>
              Yes. Ogden, Kaysville, and the northern edge of our radius are
              inside the area we serve.
            </p>
            <p>
              Ogden City draws from three sources: groundwater wells, surface
              water from Pineview Reservoir and Wheeler Creek, and treated water
              purchased from Weber Basin Water Conservancy District. Ogden City’s
              own water quality report does not publish a hardness figure. Weber
              Basin does, and tells its customers hardness can range from 10 to
              18 grains per gallon, or 171 to 308 mg/L. The bottom of that range
              is already very hard by USGS classification. The top is nearly
              double the threshold.
            </p>
            <p>
              Because Ogden blends its own wells with that purchased water, what
              arrives at a given house isn’t one published number. The condition
              of the evaporator tells us more than a city average does.
            </p>
          </AccordionItem>

          <AccordionItem
            id="utah-valley"
            headingLevel={2}
            summary="Do You Service Lehi, Draper, and the Rest of Utah Valley?"
          >
            <p>
              Yes. Lehi is our base, and we serve Draper, American Fork, Pleasant
              Grove, Lindon, Orem, Provo, Mapleton, Saratoga Springs, Eagle
              Mountain, Riverton, South Jordan, Sandy, Genola, and Woodland
              Hills.
            </p>
            <p>
              This is the broadest of our service areas and the most varied. Draper
              and the Lehi bench look like Alpine, newer high-end construction
              with built-in machines specified during the build. Provo, Orem, and
              the older Utah Valley cities skew toward retrofit installs in
              remodeled kitchens.
            </p>
            <p>
              Where we have a published figure, we use it. The Jordan Valley
              Water Conservancy District, which supplies South Jordan, Riverton,
              and much of the west side of the valley, reports average total
              hardness of 182.4 mg/L, about 10.7 grains per gallon, across a
              range of 16 to 381 mg/L. The average alone sits above the
              threshold where scale becomes a maintenance issue rather than a
              nuisance.
            </p>
            <p>
              Kaysville and Ogden are included in our radius. If you’re unsure
              whether you’re inside it, call or text and we’ll tell you.
            </p>
            <p>
              <Link href="/ice-machine-cleaning">What a cleaning includes</Link>.
            </p>
          </AccordionItem>

          <AccordionItem
            id="orem-provo"
            headingLevel={2}
            summary="Do You Clean Ice Makers in Orem and Provo?"
          >
            <p>
              Yes. Orem and Provo are twenty to thirty minutes from our base in
              Lehi, well inside the area we serve.
            </p>
            <p>
              Both cities publish their water hardness in their annual water
              quality reports. Provo reports typical levels of 10 to 15 grains
              per gallon. Orem blends surface water with well and spring water,
              and reports 7 to 25 grains per gallon for its own sources and 6.55
              to 9 for water from the regional treatment plant. Provo’s typical
              range straddles the 10.5 grains per gallon line for very hard
              water, and the top of Orem’s range sits well above it, so an ice
              maker in either city is worth keeping on a regular cleaning
              schedule.
            </p>
            <p>
              <Link href="/ice-machine-cleaning">What a cleaning includes</Link>.
            </p>
            <p>
              <Link href="/troubleshooting#how-often">
                How often Utah machines need service
              </Link>
              .
            </p>
          </AccordionItem>

          <AccordionItem
            id="full-list"
            headingLevel={2}
            summary="Every City We Serve"
          >
            <p>{SERVICE_CITIES.join(", ")}.</p>
            <p>
              We’re based in Lehi and serve a 75-mile radius, so if your city
              isn’t on the list there’s a good chance you’re still inside it.
              Call or text <a href={NAP.phoneHref}>{NAP.phoneDisplay}</a> and
              we’ll confirm.
            </p>
          </AccordionItem>
        </Accordion>
      </section>

      {/* WATER HARDNESS BY AREA */}
      <section id="water-hardness" className="mkt-section">
        <h2>Water Hardness by Area</h2>
        <p>
          The published figures from the water suppliers we cite above, in one
          table. Where a city doesn’t publish a hardness figure, we show
          independent estimates and label them as estimates.
        </p>
        <div className="mkt-table-wrap">
          <table className="mkt-table mkt-table--cards">
            <thead>
              <tr>
                <th scope="col">Area</th>
                <th scope="col">Water supplier</th>
                <th scope="col">Published hardness</th>
                <th scope="col">Classification</th>
              </tr>
            </thead>
            <tbody>
              {WATER_HARDNESS.map((row) => (
                <tr key={row.area}>
                  <th scope="row">{row.area}</th>
                  <td data-col="Water supplier">{row.supplier}</td>
                  <td data-col="Published hardness">{row.hardness}</td>
                  <td data-col="Classification">{row.classification}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </section>

      {/* CLOSING CTA */}
      <section id="book" className="mkt-section">
        <h2>Book a Cleaning</h2>
        <p>
          If you’re not satisfied with the cleaning, we come back and clean it
          again at no charge.
        </p>
        <div className="mkt-cta-row">
          <Link href="/book" className="mkt-btn mkt-btn--primary">
            Book a cleaning
          </Link>
          <p className="mkt-cta-row__below">
            Call or text <a href={NAP.phoneHref}>{NAP.phoneDisplay}</a>
          </p>
        </div>
      </section>

      <Sources
        links={[
          SOURCE_LINKS.mountainRegional,
          SOURCE_LINKS.slcDpu2025,
          SOURCE_LINKS.ogden2025,
          SOURCE_LINKS.weberBasin2024,
          SOURCE_LINKS.jvwcd2025,
          {
            href: "https://orem.gov/wp-content/uploads/2026/04/CCR-2026-brochure-version-final.pdf",
            label: "City of Orem, 2026 Water Quality Report",
          },
          {
            href: "https://www.provo.gov/DocumentCenter/View/5209/2025-Water-Report-PDF",
            label: "Provo City, 2025 Water Report",
          },
          SOURCE_LINKS.mapleton2025,
          SOURCE_LINKS.springville2025,
          SOURCE_LINKS.tapWaterDataUt,
          SOURCE_LINKS.aquatellUt,
        ]}
      />
    </div>
  );
}
