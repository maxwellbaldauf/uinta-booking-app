import Link from "next/link";
import type { Metadata } from "next";
import { NAP } from "@/lib/site";

export const metadata: Metadata = {
  title: "Residential Ice Machine Cleaning Service | Uinta Ice Co.",
  description:
    "A full teardown, nickel-safe descale, reservoir and bin deep clean, and food-safe sanitize, done in your kitchen in about an hour. All supplies included.",
  alternates: { canonical: "/ice-machine-cleaning" },
};

const FAQ = [
  {
    q: "Do you have to pull the machine out of the cabinet?",
    a: "Usually not. Most of the work is done through the front. If yours needs to come out, we’ll say so before we start.",
  },
  {
    q: "Can you clean a machine that hasn’t been touched in years?",
    a: "Yes. Those are the ones where the difference is most obvious. Heavily scaled machines occasionally need a second descale pass, which we do on the same visit.",
  },
  {
    q: "Will cleaning fix my ice production?",
    a: "If scale is the cause, yes, and scale is the most common cause we see in Utah. If the machine has a mechanical fault, cleaning won’t fix it, and we’ll tell you that on the same visit.",
  },
  {
    q: "Is the sanitizer safe around food?",
    a: "It’s a food-contact sanitizer, applied to surfaces the ice touches and used as directed for that purpose.",
  },
  {
    q: "Do you service commercial machines?",
    a: (
      <>
        This page covers residential service. For anything commercial, call or
        text <a href={NAP.phoneHref}>{NAP.phoneDisplay}</a> and we’ll talk it
        through directly.
      </>
    ),
  },
];

export default function IceMachineCleaningPage() {
  return (
    <div className="mkt-wrap mkt-prose">
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
          This page covers exactly what that visit involves, what we use, and
          what we’ll tell you when we’re done.
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

      {/* SECTION 1 */}
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
          shapes the rest of the visit and it’s the first thing we’ll tell you
          about at the end.
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

      {/* SECTION 2 */}
      <section id="descaler" className="mkt-section">
        <h2>Why a Nickel-Safe Descaler Matters</h2>
        <p>
          The evaporator plate in most residential ice machines is nickel-plated.
          A descaler that isn’t formulated as nickel-safe will attack that
          plating, and once the plating is gone it does not come back.
        </p>
        <p>
          That’s the reason we don’t use general-purpose lime and scale removers,
          the kind sold for bathroom fixtures and coffee makers. They dissolve
          mineral effectively. They also pit and strip plated surfaces, because
          nothing about them was designed for a food-contact evaporator. Vinegar
          is gentler and correspondingly less effective, and it does nothing for
          biofilm.
        </p>
        <p>
          A stripped evaporator causes problems that look like unrelated
          failures. Ice picks up a metallic taste. The exposed base metal
          corrodes. Ice stops releasing cleanly during harvest, because the
          surface it’s forming on is no longer smooth, which shows up as
          misshapen cubes or a machine that seems to jam mid-cycle. Manufacturers
          are specific about this, and using a non-approved cleaner is grounds for
          denying a warranty claim.
        </p>
        <p>
          We use a universal nickel-safe descaler on every machine, regardless of
          brand. It costs more than what’s on the shelf at a hardware store. It’s
          also the difference between a maintenance visit and an expensive
          mistake.
        </p>
        <p>
          <Link href="/troubleshooting#descaling-vs-sanitizing">
            Descaling and sanitizing do different jobs
          </Link>
          .
        </p>
      </section>

      {/* SECTION 3 */}
      <section id="before-we-arrive" className="mkt-section">
        <h2>What Do I Need to Do Before You Come?</h2>
        <p>Nothing. Leave the machine as it is.</p>
        <p>
          We bring the descaler, the sanitizer, the tools, and the towels. You
          don’t need to empty the bin, run a cycle, buy a cleaning kit, or clear
          the cabinet. If the machine is full of ice, that’s fine.
        </p>
        <p>
          Someone needs to be there to let us in and to hear what we found at the
          end. Beyond that, you can go about your day. We work in one spot, we
          keep it clean, and we take everything out with us.
        </p>
      </section>

      {/* SECTION 4 */}
      <section id="walkthrough" className="mkt-section">
        <h2>What We Tell You Before We Leave</h2>
        <p>Every visit ends with a short walkthrough. You’ll hear four things.</p>
        <p>
          <strong>What condition the machine was in.</strong> How heavy the scale
          was, whether there was biofilm in the reservoir, and how that compares
          to what we typically see in your area.
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
          <strong>Whether anything looks mechanical.</strong> If we see something
          that cleaning won’t fix, you’ll hear it directly. We don’t do repairs,
          so we have no reason to find problems.
        </p>
        <p>
          We track your next service date and reach out when it comes due. You
          don’t have to keep a calendar for it.
        </p>
      </section>

      {/* SECTION 5 */}
      <section id="how-often" className="mkt-section">
        <h2>How Often Should a Residential Ice Machine Be Cleaned?</h2>
        <p>
          Every six months for most Utah homes. Manufacturers typically recommend
          descaling every three to six months, and that range assumes average
          water hardness. Utah sits at the hard end of it.
        </p>
        <p>
          The U.S. Geological Survey classifies water above 180 mg/L as very hard.
          Mountain Regional Water, which supplies much of the Park City area,
          publishes its hardness at roughly 300 mg/L, about 17.5 grains per
          gallon. Herriman City reports Jordan Valley Water Conservancy District
          supply generally running 12 to 15 grains per gallon. Machines here scale
          faster than the same unit would in most of the country.
        </p>
        <p>
          Semi-annual service keeps an undercounter machine at full production and
          keeps the reservoir from becoming a problem in the first place. Waiting
          until the ice tastes wrong means the buildup has been there a long time.
        </p>
        <p>
          <Link href="/troubleshooting#never-cleaned">
            What happens to a machine that’s never cleaned
          </Link>
          .
        </p>
      </section>

      {/* SECTION 6 */}
      <section id="what-we-dont-do" className="mkt-section">
        <h2>What We Don’t Do</h2>
        <p>We clean ice machines. That’s the whole business.</p>
        <p>
          We don’t do appliance repair, refrigeration work, or installation. If
          your machine has a failed compressor, a refrigerant issue, or an
          electrical fault, cleaning it won’t fix that, and we’ll tell you rather
          than clean it anyway and let you find out.
        </p>
        <p>
          That boundary is deliberate. A repair company that also cleans has a
          reason to find something expensive. We don’t.
        </p>
      </section>

      {/* SECTION 7 */}
      <section id="machines" className="mkt-section">
        <h2>Which Machines Do You Service?</h2>
        <p>
          Undercounter and built-in residential ice machines producing nugget,
          pebble, gourmet, clear, and crescent ice.
        </p>
        <p>
          The brands we see most often are Scotsman, Sub-Zero, U-Line, KitchenAid,
          GE Profile, and GE Monogram. We service most other residential makes as
          well, so call if yours isn’t on that list.
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
      </section>

      {/* SECTION 8 */}
      <section id="faq" className="mkt-section mkt-faq">
        <h2>Common Questions About the Service</h2>
        {FAQ.map(({ q, a }) => (
          <div key={q}>
            <h3>{q}</h3>
            <p>{a}</p>
          </div>
        ))}
      </section>

      {/* SECTION 9 */}
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
