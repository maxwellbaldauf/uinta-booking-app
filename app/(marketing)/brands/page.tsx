import Link from "next/link";
import { NAP } from "@/lib/site";
import { pageMetadata } from "@/lib/seo";
import { BRANDS_FAQ } from "@/lib/faq";
import { breadcrumbSchema, faqPageSchema, serviceSchema } from "@/lib/schema";
import { JsonLd } from "@/components/marketing/JsonLd";

export const metadata = pageMetadata({
  title: "Ice Machine Cleaning by Brand | Scotsman, Sub-Zero, U-Line",
  description:
    "We service Scotsman, Sub-Zero, U-Line, KitchenAid and GE undercounter ice machines, plus most other makes. Brand-specific quirks and clean light behavior.",
  path: "/brands",
});

const SECTIONS = [
  { id: "scotsman", label: "Scotsman" },
  { id: "sub-zero", label: "Sub-Zero" },
  { id: "u-line", label: "U-Line" },
  { id: "kitchenaid", label: "KitchenAid" },
  { id: "ge", label: "GE Profile and GE Monogram" },
  { id: "other-brands", label: "Every other brand" },
];

const schema = [
  serviceSchema({
    name: "Ice machine cleaning by brand",
    description:
      "Brand-specific residential ice machine cleaning for Scotsman, Sub-Zero, U-Line, KitchenAid, GE Profile and GE Monogram, plus most other residential makes.",
    path: "/brands",
  }),
  breadcrumbSchema([
    { name: "Home", path: "/" },
    { name: "Brands", path: "/brands" },
  ]),
  faqPageSchema(BRANDS_FAQ),
];

export default function BrandsPage() {
  return (
    <div className="mkt-wrap mkt-prose">
      <JsonLd graph={schema} />
      <header className="mkt-pagehead">
        <h1>The Brands We Service Most Often</h1>
        <p className="mkt-lead">
          Uinta Ice Co. cleans residential ice machines from every major
          manufacturer. The brands below are the ones we see most often in Utah
          homes, and each section covers what that brand’s machines actually need,
          how its clean indicator behaves, and where that make tends to fail.
        </p>
        <p>
          If yours isn’t listed, call or text{" "}
          <a href={NAP.phoneHref}>{NAP.phoneDisplay}</a>. We service most
          residential makes.
        </p>
        <div className="mkt-cta-row">
          <Link href="/book" className="mkt-btn mkt-btn--primary">
            Book a cleaning
          </Link>
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
      <section id="scotsman" className="mkt-section">
        <h2>What Does a Scotsman Ice Machine Need?</h2>
        <p>
          Scotsman residential machines need descaling with a nickel-safe scale
          remover on a regular interval, and on the nugget models the consequence
          of skipping it is mechanical rather than gradual. Scotsman’s own
          maintenance guidance is direct about this: scale buildup on the
          evaporator strains the gearbox and auger motor and can cause premature
          failure.
        </p>
        <p>
          That’s a function of how nugget ice is made. A Scotsman Brilliance
          nugget machine freezes water on the inside of an evaporator cylinder
          while an auger scrapes it off and compresses it into nuggets, which is
          why the ice is opaque and soft. It’s compacted flakes rather than a
          frozen block. When scale coats that cylinder, the auger has to work
          against it, and the load travels back into the gearbox.
        </p>
        <p>
          Scotsman machines carry a “Time to Clean” indicator, and the reset is a
          button-hold combination that varies by model. The clean cycle length
          differs by product line as well. A nugget machine’s cycle runs about an
          hour. A Brilliance gourmet cuber runs just over two.
        </p>
        <p>
          Scotsman specifies its Clear 1 scale remover, which is nickel-safe. That
          specification is not marketing. The evaporator surfaces in these
          machines are plated, and a general-purpose descaler strips the plating.
        </p>
        <p>
          Common failure points: gearbox and auger motor strain from scale,
          condenser fins packed with dust, and reservoir biofilm on nugget units,
          which hold standing water by design.
        </p>
        <p>
          <Link href="/troubleshooting#how-often">
            How often Utah machines need service
          </Link>
          .
        </p>
      </section>

      {/* SECTION 2 */}
      <section id="sub-zero" className="mkt-section">
        <h2>What Does a Sub-Zero Ice Machine Need?</h2>
        <p>
          Sub-Zero undercounter ice makers produce clear ice, which makes them
          among the least forgiving machines when it comes to scale. Clear ice
          depends on water freezing slowly and evenly, so any restriction in the
          distribution path shows up in the ice itself before it shows up in the
          production numbers.
        </p>
        <p>
          These units are usually panel-fronted and integrated into cabinetry,
          which affects the visit more than the cleaning. Access is tighter, the
          surrounding finish work is expensive, and we plan for that rather than
          discovering it.
        </p>
        <p>
          Sub-Zero units also have a water filter on most configurations, and a
          filter past its service life contributes to both taste problems and
          reduced flow. That’s separate from descaling and worth checking on its
          own schedule.
        </p>
        <p>
          The evaporator is plated, as it is across this category, so the descaler
          has to be nickel-safe.
        </p>
      </section>

      {/* SECTION 3 */}
      <section id="u-line" className="mkt-section">
        <h2>What Does a U-Line Ice Machine Need?</h2>
        <p>
          U-Line undercounter machines run a clean alert on an interval timer. On
          most models it appears as “CL” in the control display after a set number
          of operating hours. It’s a reminder, not a measurement, so it tells you
          time has passed rather than that scale is present.
        </p>
        <p>
          That distinction matters because the alert can be cleared without the
          machine ever being cleaned, and on units we open for the first time, it
          usually has been. A U-Line that’s been reset repeatedly without service
          is one of the more heavily scaled machines we see.
        </p>
        <p>
          U-Line sells its own clear ice machine cleaner, and their clear-ice
          models are unusually sensitive to scale because clarity depends on water
          freezing slowly and evenly across the plate. Uneven flow from a
          partially blocked distribution path produces cloudy or hollow cubes long
          before production drops enough to be noticed.
        </p>
        <p>
          Drainage is the other thing worth checking. Units installed without a
          drain pump rely on gravity, and a slow or partially blocked drain line
          shows up as standing water in the bottom of the bin, which accelerates
          biofilm.
        </p>
        <p>
          Common failure points: scale in the water distribution path, drain
          restriction on gravity-drain installs, and reset-without-cleaning
          history.
        </p>
        <p>
          <Link href="/troubleshooting#clean-light">
            Why a clean light stays on
          </Link>
          .
        </p>
      </section>

      {/* SECTION 4 */}
      <section id="kitchenaid" className="mkt-section">
        <h2>What Does a KitchenAid Ice Maker Need?</h2>
        <p>
          KitchenAid undercounter ice makers produce clear gourmet-style ice in 15
          and 18 inch widths, and the complaints we hear about them are almost
          always ice quality before production: cloudy cubes, hollow cubes, or ice
          that doesn’t release cleanly.
        </p>
        <p>
          All three point the same direction. Clear-ice production depends on even
          water distribution, and scale narrows the path unevenly, so parts of the
          plate get less water than others. The result looks like a machine defect
          and is usually a maintenance problem.
        </p>
        <p>
          Many of these units are installed on gravity drain rather than a drain
          pump, depending on where the plumbing sat during the build. On a gravity
          install, standing water in the bin is the thing to watch, because it’s
          where biofilm establishes first.
        </p>
        <p>
          Common failure points: cloudy or malformed ice from scale in the
          distribution path, drain restriction, and reservoir biofilm.
        </p>
        <p>
          <Link href="/troubleshooting#cloudy-ice">
            What cloudy and hollow ice means
          </Link>
          .
        </p>
      </section>

      {/* SECTION 5 */}
      <section id="ge" className="mkt-section">
        <h2>What Do GE Profile and GE Monogram Ice Makers Need?</h2>
        <p>
          GE Monogram undercounter ice makers use plated evaporators, and GE’s own
          parts catalog specifies a nickel-safe cleaner for them for exactly that
          reason. It’s a useful confirmation of something most homeowners have
          never been told: the plating on the ice-making surface is the reason the
          chemistry matters.
        </p>
        <p>
          GE Profile and Monogram undercounter units follow the same service
          pattern as the rest of the category. Descale the water path, hand clean
          the reservoir and bin, sanitize everything the ice touches, clear the
          condenser.
        </p>
        <p>
          Common failure points: scale on the evaporator reducing production,
          condenser dust, and reservoir biofilm on nugget-producing models.
        </p>
        <p>
          <Link href="/ice-machine-cleaning#descaler">
            Why the descaler has to be nickel-safe
          </Link>
          .
        </p>
      </section>

      {/* SECTION 6 */}
      <section id="other-brands" className="mkt-section">
        <h2>What If My Brand Isn’t Listed?</h2>
        <p>
          We service most residential ice machine brands. The list above is what
          we see most often in Utah homes, not the limit of what we work on.
        </p>
        <p>
          The service is the same across makes: a nickel-safe descale of the water
          path, hand cleaning of the reservoir and bin, food-contact sanitizing of
          every surface the ice touches, and a test cycle before we leave. What
          changes between brands is the disassembly, the indicator behavior, and
          where that particular machine tends to fail.
        </p>
        <p>
          Call or text <a href={NAP.phoneHref}>{NAP.phoneDisplay}</a> with your
          make and model and we’ll tell you straight away whether we service it.
        </p>
        <p>
          <Link href="/service-areas">The cities we serve</Link>.
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
