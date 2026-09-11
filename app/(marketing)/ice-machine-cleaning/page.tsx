import Link from "next/link";
import { NAP } from "@/lib/site";
import { pageMetadata } from "@/lib/seo";
import { SERVICE_FAQ } from "@/lib/faq";
import { breadcrumbSchema, faqPageSchema, serviceSchema } from "@/lib/schema";
import { JsonLd } from "@/components/marketing/JsonLd";
import { Accordion, AccordionItem } from "@/components/marketing/Accordion";

export const metadata = pageMetadata({
  title: "Residential Ice Machine Cleaning Service | Uinta Ice Co.",
  description:
    "Full teardown, nickel-safe descale, reservoir and bin deep clean, and food-safe sanitize. About an hour for homes, 90 minutes for light commercial units.",
  path: "/ice-machine-cleaning",
});

const schema = [
  serviceSchema({
    name: "Residential and light commercial ice machine cleaning",
    description:
      "A full teardown, nickel-safe descale, reservoir and bin deep clean, food-contact sanitize, and test cycle. About an hour for a residential visit, about an hour and a half for light commercial. All supplies included.",
    path: "/ice-machine-cleaning",
  }),
  breadcrumbSchema([
    { name: "Home", path: "/" },
    { name: "Ice Machine Cleaning", path: "/ice-machine-cleaning" },
  ]),
  faqPageSchema(SERVICE_FAQ),
];

export default function IceMachineCleaningPage() {
  return (
    <div className="mkt-wrap mkt-prose">
      <JsonLd graph={schema} />
      <header className="mkt-pagehead">
        <h1>Residential Ice Machine Cleaning in Utah, Start to Finish</h1>
        <p className="mkt-lead">
          Uinta Ice Co. descales, deep cleans, and sanitizes residential ice
          machines in the customer’s home. A visit takes about an hour, covers
          every component the water and ice touch, and includes all supplies.
          We’re based in Lehi and serve Utah County and Salt Lake County within a
          75-mile radius.
        </p>
        <p>
          We also service light commercial machines in offices, retail
          showrooms, and small business breakrooms. Those visits run about an
          hour and a half, because the units are larger and have more
          components.
        </p>
        <p>
          This page covers exactly what that visit involves, what we use, and
          what we send you afterward.
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

      {/* SECTION 1 — stays open */}
      <section id="included" className="mkt-section">
        <h2>What’s Included in a Professional Ice Machine Cleaning?</h2>
        <p>
          Every visit covers four things: descaling the water path, deep cleaning
          the reservoir and bin, sanitizing every ice-contact surface, and
          testing the machine before we leave. Here’s what each of those actually
          involves.
        </p>

        <h3>We start by looking at the machine before we touch it.</h3>
        <p>
          Power down, panels off, and an assessment of what condition it’s in.
          How much scale is on the evaporator, whether there’s biofilm in the
          reservoir, whether the machine has ever been serviced. That assessment
          shapes the rest of the visit, and it’s the first thing in the writeup
          we send you.
        </p>

        <h3>We remove the components that hold buildup.</h3>
        <p>
          The bin, the reservoir, the water distribution parts, and the pump
          components come out. This is the step that separates a real cleaning
          from a clean cycle. A built-in cleaning cycle circulates solution
          through the water path and then drains. It does not reach the parts
          that hold the most residue, because those parts sit outside the
          circulating path or hold standing water at the bottom of the machine.
          Those pieces get cleaned by hand, off the machine.
        </p>

        <h3>We descale the water path with a nickel-safe descaler.</h3>
        <p>
          Mineral scale bonds to the evaporator plate, the inside of the water
          distribution tubes, and the pump housing. Descaling dissolves that bond
          chemically. It isn’t scrubbing, and it can’t be, because the evaporator
          surface is plated and abrasives ruin it. See the next section for why
          the specific chemistry matters more than anything else on this list.
        </p>

        <h3>We deep clean the reservoir and the bin by hand.</h3>
        <p>
          Biofilm is a physical layer, not a stain. It’s what bacteria and mold
          build on a wet surface to hold themselves in place, and it resists
          rinsing by design. It has to be broken down and wiped out. This is the
          part of the machine most responsible for ice that tastes or smells
          wrong, and it’s the part no automated cycle touches.
        </p>

        <h3>We sanitize every surface the ice contacts.</h3>
        <p>
          Evaporator, distribution tubes, reservoir, bin, and the components that
          came out. Food-contact sanitizer, applied after the descale, because
          sanitizing a scaled surface accomplishes very little. Scale gives
          microorganisms somewhere to hide.
        </p>

        <h3>We reassemble and run it.</h3>
        <p>
          The machine goes back together and cycles while we’re still there. We
          watch it through a harvest so we know it’s freezing and releasing
          correctly before we leave. If something’s wrong mechanically, this is
          where it shows up.
        </p>
      </section>

      {/* The supporting detail — collapsed */}
      <section className="mkt-section" aria-label="About the service">
        <Accordion>
          <AccordionItem
            id="descaler"
            headingLevel={2}
            defaultOpen
            summary="Why a Nickel-Safe Descaler Matters"
          >
            <p>
              The evaporator plate in most residential ice machines is
              nickel-plated. A descaler that isn’t formulated as nickel-safe will
              attack that plating, and once the plating is gone it does not come
              back.
            </p>
            <p>
              That’s the reason we don’t use general-purpose lime and scale
              removers, the kind sold for bathroom fixtures and coffee makers.
              They dissolve mineral effectively. They also pit and strip plated
              surfaces, because nothing about them was designed for a
              food-contact evaporator. Vinegar is gentler and correspondingly
              less effective, and it does nothing for biofilm.
            </p>
            <p>
              A stripped evaporator causes problems that look like unrelated
              failures. Ice picks up a metallic taste. The exposed base metal
              corrodes. Ice stops releasing cleanly during harvest, because the
              surface it’s forming on is no longer smooth, which shows up as
              misshapen cubes or a machine that seems to jam mid-cycle.
              Manufacturers are specific about this, and using a non-approved
              cleaner is grounds for denying a warranty claim.
            </p>
            <p>
              We use a universal nickel-safe descaler on every machine,
              regardless of brand. It costs more than what’s on the shelf at a
              hardware store. It’s also the difference between a maintenance
              visit and an expensive mistake.
            </p>
            <p>
              <Link href="/troubleshooting#descaling-vs-sanitizing">
                Descaling and sanitizing do different jobs
              </Link>
              .
            </p>
          </AccordionItem>

          <AccordionItem
            id="before-we-arrive"
            headingLevel={2}
            summary="What Do I Need to Do Before You Come?"
          >
            <p>Nothing. Leave the machine as it is.</p>
            <p>
              We bring the descaler, the sanitizer, the tools, and the towels.
              You don’t need to empty the bin, run a cycle, buy a cleaning kit,
              or clear the cabinet. If the machine is full of ice, that’s fine.
            </p>
            <p>
              You don’t need to be home, but we do need a way into the house —
              however you arrange that is up to you. We send reminders in the
              week before the visit, and if we arrive and can’t get in, there’s a
              $50 rescheduling fee. We work in one spot, we keep it clean, and we
              take everything out with us.
            </p>
          </AccordionItem>

          <AccordionItem
            id="walkthrough"
            headingLevel={2}
            summary="What We Send You After the Visit"
          >
            <p>
              Every visit ends with an email breakdown, with before-and-after
              photos attached. It covers four things.
            </p>
            <p>
              <strong>What condition the machine was in.</strong> How heavy the
              scale was, whether there was biofilm in the reservoir, and how that
              compares to what we typically see in your area.
            </p>
            <p>
              <strong>What came out of it.</strong> Specific to your unit, not a
              general description.
            </p>
            <p>
              <strong>When yours should be serviced again.</strong> Six months is
              standard for Utah. Machines on especially hard water, in heavy-use
              households, or that have gone years without service sometimes need a
              shorter interval, and we’ll say so if yours does.
            </p>
            <p>
              <strong>Whether anything looks mechanical.</strong> If we see
              something that cleaning won’t fix, it’s in the writeup, called out
              plainly. We don’t do repairs, so we have no reason to find
              problems.
            </p>
            <p>
              The receipt comes with it. This is a recurring six-month service,
              so we schedule the next visit and track the date — you don’t have
              to keep a calendar for it.
            </p>
          </AccordionItem>

          <AccordionItem
            id="how-often"
            headingLevel={2}
            summary="How Often Should a Residential Ice Machine Be Cleaned?"
          >
            <p>
              Every six months for most Utah homes. Manufacturers typically
              recommend descaling every three to six months, and that range
              assumes average water hardness. Utah sits at the hard end of it.
            </p>
            <p>
              The U.S. Geological Survey classifies water above 180 mg/L as very
              hard. Mountain Regional Water, which supplies much of the Park City
              area, publishes its hardness at roughly 300 mg/L, about 17.5 grains
              per gallon. Herriman City reports Jordan Valley Water Conservancy
              District supply generally running 12 to 15 grains per gallon.
              Machines here scale faster than the same unit would in most of the
              country.
            </p>
            <p>
              We run it as a recurring service. You sign a short agreement, we
              come back every six months at the same flat rate, and we handle the
              scheduling. Semi-annual service keeps an undercounter machine at
              full production and keeps the reservoir from becoming a problem in
              the first place. Waiting until the ice tastes wrong means the
              buildup has been there a long time.
            </p>
            <p>
              <Link href="/troubleshooting#never-cleaned">
                What happens to a machine that’s never cleaned
              </Link>
              .
            </p>
          </AccordionItem>

          <AccordionItem
            id="commercial"
            headingLevel={2}
            summary="What’s Different About a Commercial Cleaning?"
          >
            <p>
              Three things. The machine is larger, it has more components, and
              the visit takes about an hour and a half instead of an hour.
            </p>
            <p>
              We service light commercial accounts: offices, retail showrooms,
              and small business breakrooms. The process is the same one
              described above. Nickel-safe descale of the water path, hand
              cleaning of the reservoir and bin, food-contact sanitizing of
              every surface the ice touches, and a test cycle before we leave.
            </p>
            <p>
              What changes is the scope of the disassembly. A commercial unit
              has more removable parts, more surface area in the water path,
              and a larger bin. Every one of those has to come apart, get
              cleaned, and go back together. That’s where the additional half
              hour goes, and it’s the whole of the difference in price.
            </p>
            <p>
              Light commercial is the boundary. We’re not a restaurant
              equipment company. We don’t service high-volume food-service
              machines and we don’t provide health-code inspection support.
            </p>
            <p>
              <Link href="/#pricing">Residential and commercial pricing</Link>.
            </p>
          </AccordionItem>

          <AccordionItem
            id="what-we-dont-do"
            headingLevel={2}
            summary="What We Don’t Do"
          >
            <p>We clean ice machines. That’s the whole business.</p>
            <p>
              We don’t do appliance repair, refrigeration work, or installation.
              If your machine has a failed compressor, a refrigerant issue, or an
              electrical fault, cleaning it won’t fix that, and we’ll tell you
              rather than clean it anyway and let you find out.
            </p>
            <p>
              That boundary is deliberate. A repair company that also cleans has
              a reason to find something expensive. We don’t.
            </p>
          </AccordionItem>

          <AccordionItem
            id="machines"
            headingLevel={2}
            summary="Which Machines Do You Service?"
          >
            <p>
              Undercounter and built-in residential ice machines producing
              nugget, pebble, gourmet, clear, and crescent ice.
            </p>
            <p>
              The brands we see most often are Scotsman, Sub-Zero, U-Line,
              KitchenAid, GE Profile, and GE Monogram. We service most other
              residential makes as well, so call if yours isn’t on that list.
            </p>
            <p>
              On the light commercial side, we service undercounter and
              freestanding machines in offices, retail showrooms, and
              breakrooms.
            </p>
            <p>
              <Link href="/brands">
                What each brand needs, and where each one tends to fail
              </Link>
              .
            </p>
            <p>
              <Link href="/service-areas">
                The cities we serve across Utah County and Salt Lake County
              </Link>
              .
            </p>
          </AccordionItem>
        </Accordion>
      </section>

      {/* FAQ — collapsed */}
      <section id="faq" className="mkt-section">
        <h2>Common Questions About the Service</h2>
        <Accordion>
          {SERVICE_FAQ.map(({ q, a }, i) => (
            <AccordionItem key={q} summary={q} defaultOpen={i === 0}>
              <p>{a}</p>
            </AccordionItem>
          ))}
        </Accordion>
      </section>

      {/* CLOSING CTA */}
      <section id="book" className="mkt-section">
        <h2>Book a Cleaning</h2>
        <p>
          Flat rate, all supplies included, about an hour.{" "}
          <Link href="/#pricing">See what a cleaning costs</Link>.
        </p>
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
