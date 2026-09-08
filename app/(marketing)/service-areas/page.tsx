import Link from "next/link";
import type { Metadata } from "next";
import { NAP, SERVICE_CITIES } from "@/lib/site";

export const metadata: Metadata = {
  title: "Ice Machine Cleaning Service Areas | Utah County & SLC",
  description:
    "In-home ice machine cleaning from Alpine and Highland to Holladay, Park City, Heber, and Salt Lake City. Based in Lehi, serving a 75-mile radius.",
  alternates: { canonical: "/service-areas" },
};

const SECTIONS = [
  { id: "alpine-highland", label: "Alpine and Highland" },
  { id: "east-bench", label: "The Salt Lake east bench" },
  { id: "park-city-heber", label: "Park City and Heber" },
  { id: "utah-valley", label: "Utah Valley" },
  { id: "full-list", label: "Every city we serve" },
];

export default function ServiceAreasPage() {
  return (
    <div className="mkt-wrap mkt-prose">
      <header className="mkt-pagehead">
        <h1>Ice Machine Cleaning Near You in Utah</h1>
        <p className="mkt-lead">
          Uinta Ice Co. is based in Lehi and cleans residential ice machines
          within a 75-mile radius, covering Utah County, Salt Lake County, and the
          Park City and Heber corridor. We come to the house. A visit takes about
          an hour.
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
          {SECTIONS.map((s) => (
            <li key={s.id}>
              <a href={`#${s.id}`}>{s.label}</a>
            </li>
          ))}
        </ul>
      </nav>

      {/* SECTION 1 */}
      <section id="alpine-highland" className="mkt-section">
        <h2>Do You Service Alpine and Highland?</h2>
        <p>
          Yes. The Alpine and Highland foothills are where we do more work than
          anywhere else we serve, and it’s a fifteen minute drive from our base in
          Lehi.
        </p>
        <p>
          The homes here are the reason. Newer construction along the bench, built
          in the last fifteen to twenty years, with the ice machine sitting in the
          kitchen island or tucked into a butler’s pantry off the main run.
          Undercounter Scotsman and Sub-Zero units mostly, installed as part of
          the original build, panel-fronted to match the cabinetry, and in a lot
          of cases never serviced since the day they were commissioned.
        </p>
        <p>
          That last part is the pattern. A machine installed by the builder
          doesn’t come with a maintenance conversation. The homeowner inherits an
          appliance nobody told them needed anything, and the first sign of
          trouble arrives years later as ice that tastes wrong or a bin that’s
          half as full as it used to be.
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
      </section>

      {/* SECTION 2 */}
      <section id="east-bench" className="mkt-section">
        <h2>Do You Service Salt Lake City and the East Bench?</h2>
        <p>
          Yes. We service Salt Lake City, Holladay, Cottonwood Heights, and the
          surrounding east bench neighborhoods, including Old Colony and Walker
          Lane. Salt Lake City and Holladay are two of our busiest areas.
        </p>
        <p>
          The housing stock here is more varied than the Utah County foothills.
          Older east bench homes with renovated kitchens sit next to newer builds,
          and the ice machines reflect that. We see more retrofit installations
          here, machines added during a remodel rather than specified in an
          original build, and those tend to be tighter in the cabinet and more
          particular about drainage.
        </p>
        <p>
          Water on this side of the valley moves through the year. Salt Lake
          City’s Department of Public Utilities draws most of its supply from
          Wasatch canyon streams and supplements with deep valley wells during
          high-demand summer months, and it says plainly that the well water is
          harder. A machine here sees a harder summer than winter.
        </p>
      </section>

      {/* SECTION 3 */}
      <section id="park-city-heber" className="mkt-section">
        <h2>Do You Service Park City, Heber, and Midway?</h2>
        <p>
          Yes. We service Park City, Heber City, Midway, and Sundance. Park City
          is one of our denser areas, and machines up there face the hardest water
          we deal with anywhere in our service radius.
        </p>
        <p>
          That’s documented rather than estimated. Mountain Regional Water, the
          Summit County district supplying much of the Park City area, publishes
          its hardness at roughly 300 mg/L as calcium carbonate, about 17.5 grains
          per gallon. Anything above 10.5 grains per gallon is classified as very
          hard.
        </p>
        <p>
          Scale accumulates faster at that level, which is why machines in this
          corridor often need attention sooner than the same unit would in the
          valley.
        </p>
        <p>
          There’s a second pattern here worth naming. A lot of these are second
          homes, occupied heavily for stretches and empty in between. An ice
          machine left running in an unoccupied house keeps cycling water through
          a reservoir nobody opens for weeks, and a machine shut off and drained
          improperly sits wet. Both produce biofilm faster than a house that’s
          lived in year-round.
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
      </section>

      {/* SECTION 4 */}
      <section id="utah-valley" className="mkt-section">
        <h2>Do You Service Lehi, Draper, and the Rest of Utah Valley?</h2>
        <p>
          Yes. Lehi is our base, and we serve Draper, American Fork, Pleasant
          Grove, Lindon, Orem, Provo, Mapleton, Saratoga Springs, Eagle Mountain,
          Riverton, South Jordan, Sandy, Genola, and Woodland Hills.
        </p>
        <p>
          This is the broadest of our four areas and the most varied. Draper and
          the Lehi bench look like Alpine, newer high-end construction with
          built-in machines specified during the build. Provo, Orem, and the older
          Utah Valley cities skew toward retrofit installs in remodeled kitchens.
        </p>
        <p>
          Where we have a published figure, we use it. South Jordan lists its
          Jordan Valley Water Conservancy District supply at 7 to 10 grains per
          gallon, classified as hard. Herriman City reports Jordan Valley supply
          generally running 12 to 15 grains per gallon. Both sit at or above the
          threshold where scale becomes a maintenance issue rather than a
          nuisance.
        </p>
        <p>
          We also serve Kaysville, Ogden, and the northern edge of our radius. If
          you’re unsure whether you’re inside it, call or text and we’ll tell you.
        </p>
        <p>
          <Link href="/ice-machine-cleaning">What a cleaning includes</Link>.
        </p>
      </section>

      {/* SECTION 5 */}
      <section id="full-list" className="mkt-section">
        <h2>Every City We Serve</h2>
        <p>{SERVICE_CITIES.join(", ")}.</p>
        <p>
          We’re based in Lehi and serve a 75-mile radius, so if your city isn’t on
          the list there’s a good chance you’re still inside it. Call or text{" "}
          <a href={NAP.phoneHref}>{NAP.phoneDisplay}</a> and we’ll confirm.
        </p>
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
    </div>
  );
}
