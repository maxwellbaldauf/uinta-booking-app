import Link from "next/link";
import { NAP } from "@/lib/site";
import { pageMetadata } from "@/lib/seo";
import { breadcrumbSchema } from "@/lib/schema";
import { JsonLd } from "@/components/marketing/JsonLd";
import { Accordion, AccordionItem } from "@/components/marketing/Accordion";

export const metadata = pageMetadata({
  title: "Ice Machine Not Making Ice? Common Causes and Fixes",
  description:
    "Black slime, bad-tasting ice, low production, a clean light that won't reset. What each symptom means inside a residential ice machine, and how to fix it.",
  path: "/troubleshooting",
});

// No FAQPage schema: the visible accordion prose doesn't match lib/faq.ts's
// condensed Q&A verbatim, and Google wants the answer in the markup to be
// present on the page. Home and /ice-machine-cleaning keep theirs — they
// render the same array they pass to faqPageSchema().
const schema = [
  breadcrumbSchema([
    { name: "Home", path: "/" },
    { name: "Troubleshooting", path: "/troubleshooting" },
  ]),
];

// Editorial date, shown under the H1. Bump this by hand whenever a section
// changes — the copy calls the recency signal load-bearing for search and AI
// answers, so it must reflect real edits, not the current date.
const LAST_UPDATED = "September 2026";

const JUMP = [
  { id: "signs", label: "9 signs your ice machine needs cleaning" },
  { id: "black-slime", label: "Why is there black slime or mold in my ice maker?" },
  { id: "not-making-ice", label: "Why is my ice machine not making ice?" },
  { id: "bad-taste", label: "Why does my ice taste or smell bad?" },
  { id: "cloudy-ice", label: "Why is my ice cloudy, hollow, or misshapen?" },
  { id: "clean-light", label: "Why won’t my clean light turn off?" },
  { id: "how-often", label: "How often should you clean an ice machine in Utah?" },
  {
    id: "never-cleaned",
    label: "What happens if you never clean your ice machine?",
  },
  {
    id: "descaling-vs-sanitizing",
    label: "Descaling vs. sanitizing: what’s the difference?",
  },
  { id: "diy", label: "Can I clean my own ice machine?" },
  {
    id: "commercial-vs-residential",
    label: "Why does commercial cost more than residential?",
  },
];

const COMPARISON = [
  {
    row: "Target",
    descaling: "Mineral scale: calcium and magnesium deposits",
    sanitizing: "Bacteria, mold, and biofilm",
  },
  {
    row: "Where it acts",
    descaling: "Evaporator plate, water distribution tubes, pump",
    sanitizing:
      "Every surface the water and ice contact, especially reservoir and bin",
  },
  {
    row: "Chemistry",
    descaling: "Acid-based, must be nickel-safe for plated evaporators",
    sanitizing: "Food-contact sanitizer",
  },
  {
    row: "Symptom it fixes",
    descaling: "Low production, hollow or misshapen ice",
    sanitizing: "Bad taste and smell, visible slime",
  },
  { row: "Order", descaling: "First", sanitizing: "Second" },
];

export default function TroubleshootingPage() {
  return (
    <div className="mkt-wrap mkt-prose">
      <JsonLd graph={schema} />
      <header className="mkt-pagehead">
        <h1>Ice Machine Symptoms and What They Mean</h1>
        <p className="mkt-updated">Last updated: {LAST_UPDATED}</p>
        <p className="mkt-lead">
          Most residential ice machine problems come down to two things: mineral
          scale in the water path, and biofilm in the reservoir. This page covers
          the symptoms homeowners actually notice, what’s causing each one, and
          what fixes it.
        </p>
        <p>
          Uinta Ice Co. is a residential ice machine cleaning service based in
          Lehi, Utah, serving Utah County and Salt Lake County.
        </p>
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

      {/* 9 SIGNS — stays open */}
      <section id="signs" className="mkt-section">
        <h2>9 Signs Your Ice Machine Needs Cleaning</h2>
        <p>
          If the machine’s “Time to Clean” indicator is lit, or you notice any of
          the following, it’s due:
        </p>
        <ol>
          <li>Visible scale or white buildup inside the machine</li>
          <li>Ice that tastes or smells off</li>
          <li>Noticeably lower ice production</li>
          <li>Ice with a dark or cloudy tint</li>
          <li>A dark film in the bottom basin or reservoir</li>
          <li>Ice that comes out incompletely formed</li>
          <li>Ice that comes out misshapen or hollow</li>
          <li>Unusual noise from the pump or motor</li>
          <li>The “Time to Clean” light is on</li>
        </ol>
      </section>

      {/* The symptom topics — collapsed */}
      <section className="mkt-section" aria-label="Symptoms and fixes">
        <Accordion>
          <AccordionItem
            id="black-slime"
            headingLevel={2}
            defaultOpen
            summary="Why Is There Black Slime or Mold in My Ice Maker?"
          >
            <p>
              That’s biofilm. It’s the slick layer that bacteria and mold build
              on a wet surface to anchor themselves, and it forms in the
              reservoir and bin of a residential ice machine because those areas
              are dark, wet, and almost never inspected. Cold slows biofilm down.
              It does not stop it.
            </p>
            <p>
              It shows up as a dark, pink, or grey film along the bottom of the
              reservoir, around the drain, or on the bin walls. It feels slick
              rather than smooth. The reason it comes back a week after you wipe
              it out is that biofilm is a structure, not a stain: unless the
              whole layer is broken down and physically removed, what’s left
              reestablishes itself quickly.
            </p>
            <p>
              A rinse cycle won’t touch it. Neither will the machine’s built-in
              clean cycle, which circulates solution through the water path and
              drains, never reaching the standing water at the bottom of the
              machine or the surfaces of the bin.
            </p>
            <p>
              Ice is a food product. If there’s visible biofilm in the machine,
              ice is being formed and stored in contact with it, which is reason
              enough to stop using it until the machine has been cleaned.
            </p>
            <p>
              Removing it takes disassembly, hand cleaning of the reservoir and
              bin, and a food-contact sanitizer applied to every surface
              afterward.
            </p>
            <p>
              <Link href="/ice-machine-cleaning#included">
                What a professional cleaning includes
              </Link>
              .
            </p>
          </AccordionItem>

          <AccordionItem
            id="not-making-ice"
            headingLevel={2}
            summary="Why Is My Ice Machine Not Making Ice?"
          >
            <p>
              In Utah homes, the most common cause of low or stopped ice
              production is mineral scale on the evaporator, the cold plate where
              ice forms. Scale insulates that surface, so the machine runs longer
              and colder to make less ice. But there are five causes worth ruling
              out, in this order.
            </p>
            <p>
              <strong>Scale on the evaporator.</strong> Most likely, especially
              if production dropped gradually rather than stopping overnight, and
              especially if the machine has never been professionally descaled.
            </p>
            <p>
              <strong>Restricted airflow.</strong> Undercounter machines reject
              heat through a front vent. If that vent is blocked, or the
              condenser behind it is packed with dust and pet hair, the machine
              can’t shed heat and production falls. You can check the vent
              yourself.
            </p>
            <p>
              <strong>Water supply.</strong> A closed shutoff valve, a kinked
              supply line behind the unit, or a clogged inline water filter will
              all starve the machine. Also homeowner-checkable.
            </p>
            <p>
              <strong>Ambient temperature.</strong> These units are rated for a
              temperature range. A machine in a hot garage, a closed butler’s
              pantry, or against a wall with no clearance will underperform in
              summer.
            </p>
            <p>
              <strong>Mechanical or refrigeration failure.</strong> A failed
              pump, fan motor, or compressor, or a refrigerant issue. This is the
              least common cause and the only one on the list that isn’t a
              maintenance problem.
            </p>
            <p>
              If production dropped off slowly over months, it’s almost certainly
              scale. If it stopped abruptly, check water and airflow first.
            </p>
          </AccordionItem>

          <AccordionItem
            id="bad-taste"
            headingLevel={2}
            summary="Why Does My Ice Taste or Smell Bad?"
          >
            <p>
              Bad-tasting ice usually comes from one of three sources: biofilm in
              the reservoir, odors absorbed from the surrounding air, or the
              water supply itself. The taste tells you which.
            </p>
            <p>
              <strong>Musty, earthy, or sour</strong> points to biofilm in the
              reservoir or bin. This is the most common cause, and it gets worse
              the longer the machine goes between cleanings.
            </p>
            <p>
              <strong>Tasting like whatever’s nearby</strong> means absorption.
              Ice is porous and readily takes on odors from its environment, so
              an ice bin near strong-smelling food, or ice that has sat in the
              bin for weeks, will pick up that smell. Ice is not a preserved
              product. Old ice tastes old.
            </p>
            <p>
              <strong>Metallic or chemical</strong> is worth taking seriously. It
              can indicate a damaged evaporator surface, which happens when a
              machine has been cleaned with a descaler that isn’t nickel-safe and
              the plating has been stripped. It can also come from a water line or
              a filter past its service life.
            </p>
            <p>
              Emptying the bin and letting the machine make a fresh batch will
              tell you a lot. If fresh ice still tastes wrong, the problem is
              inside the machine, not in the bin.
            </p>
            <p>
              <Link href="/ice-machine-cleaning#descaler">
                Why the descaler has to be nickel-safe
              </Link>
              .
            </p>
          </AccordionItem>

          <AccordionItem
            id="cloudy-ice"
            headingLevel={2}
            summary="Why Is My Ice Cloudy, Hollow, or Misshapen?"
          >
            <p>
              First, rule out normal. Nugget and pebble ice is opaque and soft by
              design, because it’s made from compacted flakes with air trapped
              throughout. If you have a nugget machine, cloudy ice is what it’s
              supposed to produce. Clear-ice and gourmet machines are the ones
              where cloudiness means something.
            </p>
            <p>
              <strong>Hollow or incompletely formed cubes</strong> usually mean
              the freeze cycle is being cut short or water isn’t reaching part of
              the evaporator. Scale in the water distribution tubes is the common
              cause: as the tubes narrow, water stops spreading evenly across the
              plate, and the areas that get less water produce thin, hollow, or
              partial cubes.
            </p>
            <p>
              <strong>Misshapen or fused ice</strong> points the same direction.
              Ice that won’t release cleanly during the harvest cycle is forming
              on a surface that’s no longer smooth, which is what a scaled or
              damaged evaporator plate looks like.
            </p>
            <p>
              <strong>Cloudy ice in a clear-ice machine</strong> comes from
              dissolved minerals and trapped air freezing into the cube instead
              of being pushed out. Hard water makes this more pronounced, and
              scale in the system makes it worse.
            </p>
            <p>
              All three of these are water-path problems. Descaling addresses the
              cause directly.
            </p>
          </AccordionItem>

          <AccordionItem
            id="clean-light"
            headingLevel={2}
            summary="Why Won’t My Clean Light Turn Off?"
          >
            <p>
              On most residential ice machines, the clean light is an interval
              timer, not a sensor. It comes on after a set number of operating
              hours or cycles, and it has to be reset manually after cleaning. If
              it stayed on after you cleaned the machine, the reset almost
              certainly wasn’t performed.
            </p>
            <p>
              The reset procedure varies by brand and often by model within a
              brand. Some use a button held for several seconds, some require a
              specific power-cycle sequence, some reset automatically only after a
              complete factory clean cycle runs start to finish.
            </p>
            <p>
              A smaller number of machines use a conductivity or scale sensor
              rather than a timer. On those, the light staying on after cleaning
              means the sensor is still detecting buildup, which usually means the
              cleaning didn’t fully remove the scale.
            </p>
            <p>
              Either way, the light itself isn’t the problem. An indicator that’s
              been on for months means the machine has gone at least one full
              service interval past due, and clearing the light without cleaning
              the machine only removes the reminder.
            </p>
            <p>We reset the indicator as part of every visit.</p>
            <p>
              <Link href="/brands">Clean light behavior by brand</Link>.
            </p>
          </AccordionItem>

          <AccordionItem
            id="how-often"
            headingLevel={2}
            summary="How Often Should You Clean an Ice Machine in Utah?"
          >
            <p>
              Every six months. Manufacturers typically recommend descaling
              residential ice machines every three to six months, and that range
              assumes average water hardness. Utah water sits at the hard end of
              it, so machines here scale faster than the same unit would
              elsewhere.
            </p>
            <p>
              The U.S. Geological Survey classifies water above 180 mg/L of
              hardness as very hard. Mountain Regional Water, the Summit County
              district supplying much of the Park City area, publishes its
              hardness at roughly 300 mg/L as calcium carbonate, about 17.5 grains
              per gallon. Herriman City reports that Jordan Valley Water
              Conservancy District supply generally runs 12 to 15 grains per
              gallon, and South Jordan lists its Jordan Valley supply at 7 to 10
              grains per gallon. Anything above 10.5 grains per gallon is
              classified as very hard.
            </p>
            <p>
              Some machines need a shorter interval. Households that run the
              machine heavily, homes on especially hard water, and machines that
              have gone years without service are all candidates for cleaning
              more often than twice a year.
            </p>
            <p>
              Sanitizing follows the same schedule as descaling, since both
              happen during the same visit.
            </p>
          </AccordionItem>

          <AccordionItem
            id="never-cleaned"
            headingLevel={2}
            summary="What Happens If You Never Clean Your Ice Machine?"
          >
            <p>
              It fails, in a predictable order. Production drops first, then ice
              quality, then components. Most residential ice machines that die
              early were never descaled.
            </p>
            <p>
              <strong>Six to twelve months in,</strong> a thin layer of scale is
              on the evaporator and inside the distribution tubes. Production is
              measurably lower, though most people don’t notice yet.
            </p>
            <p>
              <strong>One to two years in,</strong> ice starts coming out hollow,
              soft, or misshapen as water distribution becomes uneven. Biofilm is
              established in the reservoir. This is the stage where the ice starts
              tasting wrong and people start buying bagged ice to supplement.
            </p>
            <p>
              <strong>Two years and beyond,</strong> the pump is working against
              restricted flow and the evaporator is heavily coated. Pump failure
              is common at this stage. So is a machine that runs constantly and
              produces very little, which drives up the electrical load while
              doing less.
            </p>
            <p>
              Then there’s the warranty. Manufacturer warranties on residential
              ice machines commonly exclude damage caused by lack of maintenance
              or by mineral buildup. A pump that fails on a machine with no
              service history is a difficult claim to make.
            </p>
            <p>
              A built-in undercounter machine is a four-figure appliance, and
              replacing one means matching a cabinet opening built around that
              specific model.
            </p>
          </AccordionItem>

          <AccordionItem
            id="descaling-vs-sanitizing"
            headingLevel={2}
            summary="Descaling vs. Sanitizing: What’s the Difference?"
          >
            <p>
              Descaling removes mineral buildup. Sanitizing kills microorganisms.
              They’re different chemistries aimed at different problems, and doing
              one does not accomplish the other. A complete cleaning requires
              both, in that order.
            </p>

            <div className="mkt-table-wrap">
              <table className="mkt-table">
                <thead>
                  <tr>
                    <td />
                    <th scope="col">Descaling</th>
                    <th scope="col">Sanitizing</th>
                  </tr>
                </thead>
                <tbody>
                  {COMPARISON.map((c) => (
                    <tr key={c.row}>
                      <th scope="row">{c.row}</th>
                      <td data-col="Descaling">{c.descaling}</td>
                      <td data-col="Sanitizing">{c.sanitizing}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>

            <p>
              The order matters. Sanitizing a scaled machine accomplishes very
              little, because scale is a rough, porous layer that gives
              microorganisms somewhere to sit out the application. Remove the
              scale first, then sanitize the clean surface underneath.
            </p>

            <h3>Definitions</h3>
            <p>
              <strong>Descaling</strong> is the chemical dissolution of mineral
              deposits left behind by hard water.
            </p>
            <p>
              <strong>Sanitizing</strong> is the reduction of bacteria and mold
              on a surface to a safe level using an agent approved for food
              contact.
            </p>
            <p>
              <strong>Scale</strong> is the hardened calcium and magnesium
              residue that bonds to surfaces water passes over.
            </p>
            <p>
              <strong>Biofilm</strong> is the protective layer bacteria and mold
              build on a wet surface to anchor themselves.
            </p>
          </AccordionItem>

          <AccordionItem
            id="diy"
            headingLevel={2}
            summary="Can I Clean My Own Ice Machine?"
          >
            <p>
              Partly. There’s real maintenance a homeowner can do safely, and
              there are two things that go wrong when people try to do the whole
              job themselves: the wrong descaler permanently damages the
              evaporator, and the reservoir and pump can’t be reached without
              disassembly.
            </p>
            <h3>What you can do without risk</h3>
            <p>
              Empty the bin and let the machine make fresh ice. Wipe down the bin
              interior with mild soap and warm water, then rinse thoroughly. Keep
              the front vent clear and vacuum dust out of the condenser area. If
              your machine has an inline water filter, replace it on the
              manufacturer’s schedule. All of this is worth doing between
              services.
            </p>
            <h3>Where it goes wrong</h3>
            <p>
              The evaporator plate in most residential ice machines is
              nickel-plated, and general-purpose lime and scale removers strip
              that plating. The damage is permanent, it makes ice release worse
              rather than better, and using a non-approved cleaner is grounds for
              a denied warranty claim. Vinegar avoids that risk but is too weak to
              remove established scale and does nothing to biofilm.
            </p>
            <p>
              The other limit is physical. The reservoir, the pump components, and
              the water distribution parts hold the most buildup, and they hold it
              where a circulating clean cycle never reaches. Getting them clean
              means taking them out of the machine.
            </p>
            <p>
              <strong>The honest version:</strong> running the manufacturer’s
              clean cycle with the manufacturer’s approved solution is better than
              doing nothing, and on a newer machine it will slow scale down. It
              won’t remove biofilm from the reservoir, and in Utah’s water it
              won’t keep up with scale on its own.
            </p>
          </AccordionItem>

          <AccordionItem
            id="commercial-vs-residential"
            headingLevel={2}
            summary="Why Does Commercial Ice Machine Cleaning Cost More Than Residential?"
          >
            <p>
              Because the job is bigger. A residential cleaning is $150 and
              takes about an hour. A light commercial cleaning is $300 and
              takes about an hour and a half, on a larger machine with more
              components to take apart, clean, and put back.
            </p>
            <p>
              The process itself doesn’t change. Both get a nickel-safe
              descale of the water path, hand cleaning of the reservoir and
              bin, and food-contact sanitizing of every surface the ice
              touches. What changes is how much there is to take apart. More
              removable parts, more surface area in the water path, and a
              larger bin all have to come out, get cleaned, and go back in.
            </p>
            <p>
              Light commercial means offices, retail showrooms, and small
              business breakrooms. It does not mean restaurant or high-volume
              food-service equipment, which is a different category of machine
              and a different kind of service company.
            </p>
            <p>
              <Link href="/#pricing">Residential and commercial pricing</Link>.
            </p>
          </AccordionItem>
        </Accordion>
      </section>

      {/* CLOSING CTA */}
      <section id="book" className="mkt-section">
        <h2>Still Not Sure What’s Wrong?</h2>
        <p>
          Tell us what the machine is doing and we’ll tell you whether cleaning
          fixes it. If it’s mechanical, we’ll say so, because we don’t do
          repairs.
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
