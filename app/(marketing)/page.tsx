import Image from "next/image";
import Link from "next/link";
import type { Metadata } from "next";
import { getSettings, formatUsdWhole } from "@/lib/settings";
import { NAP } from "@/lib/site";
import { SocialLinks } from "@/components/marketing/SocialLinks";

// The price is read from settings.base_price_cents on every request so the site
// and the amount actually charged can't drift. Everything else on this page is
// static copy from content/home.md.
export const dynamic = "force-dynamic";

export const metadata: Metadata = {
  title: "Ice Machine Cleaning in Utah Homes | Uinta Ice Co.",
  description:
    "We descale, deep clean, and sanitize residential ice machines in your home. Scotsman, Sub-Zero, U-Line and more, across Utah County and Salt Lake County.",
  alternates: { canonical: "/" },
};

const TRUST_BAR = [
  "Licensed and insured",
  "Serving Utah homes since 2022",
  "Scotsman, Sub-Zero, U-Line, KitchenAid, GE",
  "Locally owned in Lehi",
  "Utah County and Salt Lake County",
];

const FAQ: { q: string; a: React.ReactNode }[] = [
  {
    q: "Do you have to pull the machine out of the cabinet?",
    a: "Usually not. Most of the work happens through the front of the unit. If yours needs to come out, we’ll tell you before we start.",
  },
  {
    q: "How long does it take?",
    a: "About an hour, depending on the machine and how long it’s been.",
  },
  {
    q: "Do I need to be home?",
    a: "Someone needs to let us in and be there at the end so we can walk you through what we found. You don’t need to stand over us.",
  },
  {
    q: "My machine is still under warranty. Does this affect it?",
    a: "No. Professional descaling and sanitizing is maintenance the manufacturer recommends. It’s the absence of it that causes warranty problems.",
  },
  {
    q: "What if it still isn’t making ice after you clean it?",
    a: "Then it’s a mechanical or electrical fault, not buildup, and we’ll tell you that plainly. We don’t do appliance repair, so we have no reason to sell you one.",
  },
  {
    q: "Do you repair ice machines too?",
    a: "No. We clean them. That’s the entire business.",
  },
  {
    q: "How do I know if mine has ever been cleaned?",
    a: "We’ll know within a few minutes of opening it, and we’ll show you.",
  },
  {
    q: "What do you use? Is it safe around food?",
    a: "A universal nickel-safe descaler for the mineral buildup, and a food-contact sanitizer for every surface the ice touches. Nickel-safe matters more than most homeowners realize, because the wrong descaler permanently damages an evaporator plate.",
  },
  {
    q: "How often does it actually need this?",
    a: "Every six months for most Utah homes. Heavy use or unusually hard water can mean sooner, and we’ll tell you which category yours is in after we’ve seen inside it.",
  },
  {
    q: "Do you come out to Park City and Heber?",
    a: (
      <>
        Yes. We’re based in Lehi and serve a 75-mile radius.{" "}
        <Link href="/service-areas">See whether you’re in our service area</Link>.
      </>
    ),
  },
  {
    q: "What if I’m not happy with the job?",
    a: "We come back and clean it again at no charge.",
  },
];

export default async function HomePage() {
  let price: string | null = null;
  try {
    const settings = await getSettings();
    price = formatUsdWhole(settings.base_price_cents);
  } catch {
    price = null;
  }

  return (
    <>
      {/* SECTION 1 — HERO */}
      <section className="mkt-hero">
        <div className="mkt-wrap-wide">
          <p className="mkt-hero__eyebrow">Residential ice machine cleaning</p>
          <h1>Get Your Utah Ice Machine Making Clean Ice Again</h1>
          <p className="mkt-hero__subhead">
            Professional descaling, deep cleaning, and sanitizing for Scotsman,
            Sub-Zero, U-Line, KitchenAid, and GE undercounter ice machines. We
            work in your kitchen. It takes about an hour.
          </p>
          <div className="mkt-cta-row">
            <Link href="/book" className="mkt-btn mkt-btn--primary">
              Book a cleaning
            </Link>
            <a href={NAP.phoneHref} className="mkt-btn mkt-btn--secondary">
              Call or text {NAP.phoneDisplay}
            </a>
            <a href="#pricing" className="mkt-btn mkt-btn--link">
              See pricing
            </a>
          </div>
          <div className="mkt-hero__photo">
            <Image
              src="/images/opal-ice-maker-making.jpg"
              alt="Pebble ice in the bin of a residential undercounter ice machine."
              fill
              priority
              sizes="(min-width: 72rem) 1040px, 100vw"
              style={{ objectFit: "cover" }}
            />
          </div>
        </div>
      </section>

      {/* Trust bar */}
      <div className="mkt-trustbar">
        <ul>
          {TRUST_BAR.map((item) => (
            <li key={item}>{item}</li>
          ))}
        </ul>
      </div>

      <div className="mkt-wrap mkt-prose">
        {/* SECTION 2 — THE RECOGNITION MOMENT */}
        <section id="symptoms" className="mkt-section">
          <h2>One of These Is Why You’re Here</h2>
          <p>
            You didn’t search for ice machine cleaning. You searched for whatever
            your machine is doing.
          </p>
          <ul>
            <li>The ice tastes like the inside of the freezer smells.</li>
            <li>
              There’s a dark film in the bottom of the bin. You wipe it out and
              it comes back.
            </li>
            <li>
              It’s making half the ice it used to, and you’ve started buying bags
              again.
            </li>
            <li>The cubes come out hollow, soft, or fused together in a sheet.</li>
            <li>The clean light came on a while ago and you’ve been ignoring it.</li>
            <li>Something smells musty when you open the door.</li>
          </ul>
          <p>
            None of that means the machine is finished. Almost every time, it’s
            what’s built up inside it.
          </p>
        </section>

        {/* SECTION 3 — WHAT'S HAPPENING INSIDE */}
        <section id="inside" className="mkt-section">
          <h2>What’s Actually Happening Inside Your Ice Machine</h2>
          <p>
            Two things build up in a residential ice machine, and they cause
            different problems. Mineral scale coats the surfaces that freeze
            water, which cuts production. Biofilm grows in the reservoir and bin,
            which affects how your ice tastes and smells.
          </p>
          <p>
            Here’s the path water takes. A pump pulls water from the reservoir at
            the bottom of the machine and sends it up through the water
            distribution tubes, which spread it across the{" "}
            <strong>evaporator</strong>, the cold metal surface where ice
            actually forms. Water that doesn’t freeze drains back down to the
            reservoir and gets pumped through again. Then the ice releases into
            the bin.
          </p>
          <p>
            Every pass leaves minerals behind. Calcium and magnesium bond to the
            evaporator plate, to the inside of the distribution tubes, and to the
            pump. That layer is <strong>scale</strong>, and it insulates. The
            machine has to run longer and colder to freeze the same amount of
            water. Production drops first. Then the ice starts coming out hollow
            or misshapen, because the water is no longer spreading evenly across a
            clean surface. Eventually the pump or the evaporator gives out.
          </p>
          <p>
            The reservoir has the opposite problem. It’s dark, wet, and almost
            never inspected, which makes it a good place for{" "}
            <strong>biofilm</strong>, the slick layer that bacteria and mold form
            on wet surfaces. Cold slows biofilm down. It doesn’t stop it. Once
            it’s established in the reservoir, every batch of ice is made from
            water that passed through it.
          </p>
          <p>
            If you’ve ever pulled the bin out and noticed a grey, pink, or black
            film along the bottom of the reservoir, or a surface that felt slick
            instead of smooth, that’s biofilm. No rinse cycle removes it.
          </p>
        </section>

        {/* SECTION 4 — WHY UTAH IS DIFFERENT */}
        <section id="utah-water" className="mkt-section">
          <h2>
            Why Utah Water Is Harder on Ice Machines Than Almost Anywhere Else
          </h2>
          <p>
            Utah water carries enough dissolved calcium and magnesium to scale a
            machine faster than the manufacturer’s cleaning interval assumes.
            Water above 180 mg/L of hardness is classified as very hard by the
            U.S. Geological Survey. Most of the Wasatch Front sits well above that
            line.
          </p>
          <p>
            Mountain Regional Water, the Summit County district that supplies much
            of the Park City area, publishes its hardness at roughly 300 mg/L as
            calcium carbonate, about 17.5 grains per gallon. On the Salt Lake
            side, Herriman City reports that water from the Jordan Valley Water
            Conservancy District generally runs 12 to 15 grains per gallon, and
            South Jordan lists its Jordan Valley supply at 7 to 10 grains per
            gallon. Anything above 10.5 grains per gallon is very hard.
          </p>
          <p>
            It also moves through the year. Salt Lake City’s Department of Public
            Utilities gets most of its water from Wasatch canyon streams, then
            supplements with deep valley wells during high-demand summer months,
            and says plainly that the well water is harder. Your machine’s summer
            is not the same as its winter.
          </p>
          <p>
            Manufacturers typically call for descaling every three to six months.
            That range assumes average water. Utah is at the hard end of it, which
            is why we service most homes here every six months rather than
            annually.
          </p>
        </section>

        {/* SECTION 5 — THE COST OF WAITING */}
        <section id="cost-of-waiting" className="mkt-section">
          <h2>What It Costs to Leave It</h2>
          <p>
            A built-in undercounter ice machine is a four-figure appliance.
            Replacing one means the unit, the install, and a cabinet opening that
            was built around that specific model, which narrows what you can put
            back in it.
          </p>
          <p>
            Scale doesn’t announce itself. The machine keeps running while the
            evaporator works harder and the pump pushes against a narrowing path,
            and by the time production drops enough to notice, the buildup has
            been there a long time. The failures that follow are mechanical and
            expensive.
          </p>
          <p>
            Then there’s the warranty. Manufacturer warranties on residential ice
            machines commonly exclude damage caused by lack of maintenance or by
            mineral buildup. If a pump fails on a machine that’s never been
            descaled, that’s a conversation you don’t want to have with a warranty
            department.
          </p>
          <p>
            The machine is already yours. Keeping it running is cheaper than
            replacing it, by a wide margin.
          </p>
        </section>

        {/* SECTION 6 — WHAT WE DO ON A VISIT */}
        <section id="what-we-do" className="mkt-section">
          <h2>What Happens When We Clean Your Machine</h2>
          <p>
            About an hour, start to finish. We bring everything. There is nothing
            for you to buy, move, or prepare.
          </p>
          <ol>
            <li>
              <strong>We arrive and open the machine.</strong> Power down, and a
              look at what condition it’s actually in before anything gets
              touched.
            </li>
            <li>
              <strong>We remove every removable component.</strong> Bin,
              reservoir, water distribution parts, pump components. The parts that
              hold buildup are the parts that don’t come out on their own.
            </li>
            <li>
              <strong>We run a nickel-safe descale cycle.</strong> This is the
              part most people get wrong. Many household descalers and
              general-purpose acids will strip the nickel plating off an
              evaporator plate, and that damage is permanent. We use a universal
              nickel-safe descaler, because the wrong chemical turns a maintenance
              visit into a replacement.
            </li>
            <li>
              <strong>We deep clean the reservoir and bin by hand.</strong>{" "}
              Biofilm doesn’t come off in a rinse cycle. It has to be broken down
              and physically removed.
            </li>
            <li>
              <strong>We sanitize every surface your ice touches.</strong>{" "}
              Food-contact sanitizer, applied to the evaporator, the tubes, the
              reservoir, and the bin.
            </li>
            <li>
              <strong>We reassemble and run it.</strong> We stay until it’s
              cycling and making ice correctly.
            </li>
            <li>
              <strong>We tell you what we found.</strong> Condition of the
              evaporator, how much buildup came out, and when your specific make
              and model should be serviced next. We track that date so you don’t
              have to.
            </li>
          </ol>
          <p>
            We work clean, we take our mess with us, and we’re out of your
            kitchen.
          </p>
        </section>

        {/* SECTION 8 — SOCIAL PROOF (Section 7 before/after is not rendered
            until real photos exist) */}
        <section id="reviews" className="mkt-section">
          <h2>Why Homeowners Call Us</h2>
          <p>
            We’ve been cleaning residential ice machines in Utah since 2022. We’re
            licensed and insured. And if you’re not satisfied with the cleaning,
            we come back and do it again at no charge.
          </p>
          <p>That’s the whole pitch. We’d rather earn the review than write one.</p>
        </section>

        {/* SECTION 9 — WHO THIS IS FOR */}
        <section id="who-its-for" className="mkt-section">
          <h2>Do We Service Your Machine?</h2>
          <p>
            <strong>Brands.</strong> Scotsman, Sub-Zero, U-Line, KitchenAid, GE
            Profile, and GE Monogram are what we see most often. We service most
            other residential makes as well, so call if yours isn’t listed.{" "}
            <Link href="/brands">
              Brand-specific cleaning notes for each machine
            </Link>
            .
          </p>
          <p>
            <strong>Machine types.</strong> Undercounter and built-in residential
            ice machines producing nugget, pebble, gourmet, clear, and crescent
            ice.
          </p>
          <p>
            <strong>Where we work.</strong> Based in Lehi, serving a 75-mile
            radius across Utah County and Salt Lake County, including Alpine,
            Highland, Salt Lake City, Holladay, Park City, Heber City, Draper, and
            Sandy. <Link href="/service-areas">The full list of cities we serve</Link>.
          </p>
          <p>
            <strong>Not sure what’s wrong yet?</strong>{" "}
            <Link href="/troubleshooting">
              What each symptom means, and what to check first
            </Link>
            .
          </p>
        </section>

        {/* SECTION 10 — OBJECTION HANDLING FAQ */}
        <section id="faq" className="mkt-section mkt-faq">
          <h2>Questions People Ask Before They Book</h2>
          {FAQ.map(({ q, a }) => (
            <div key={q}>
              <h3>{q}</h3>
              <p>{a}</p>
            </div>
          ))}
        </section>

        {/* SECTION 11 — PRICING */}
        <section id="pricing" className="mkt-section">
          <h2>What It Costs</h2>
          {price ? (
            <p className="mkt-price">
              {price} <span>per visit</span>
            </p>
          ) : (
            <p className="mkt-price">
              <span>
                Call or text{" "}
                <a href={NAP.phoneHref}>{NAP.phoneDisplay}</a> for current
                pricing.
              </span>
            </p>
          )}
          <p>
            That’s the complete service. Full teardown of removable components,
            nickel-safe descale, reservoir and bin deep cleaned by hand,
            food-contact sanitize, reassembly and test, and a walkthrough of what
            we found. All supplies included. About an hour.
          </p>
          <p>
            Flat rate. Not a starting price, not an estimate, and not a quote that
            changes when we open the machine.
          </p>
          <p>
            Most Utah homes are on a six-month schedule, which comes to two visits
            a year on a machine that cost four figures to install. We track your
            service date and reach out when it’s due.
          </p>
          <div className="mkt-cta-row">
            <Link href="/book" className="mkt-btn mkt-btn--primary">
              Book a cleaning
            </Link>
          </div>
        </section>

        {/* SECTION 12 — RISK REVERSAL + FINAL CTA */}
        <section id="guarantee" className="mkt-section">
          <h2>Our Guarantee</h2>
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

        {/* ABOUT BLOCK */}
        <section id="about" className="mkt-section">
          <h2>About Uinta Ice Co.</h2>
          <p>
            Uinta Ice Co. is a residential ice machine cleaning service based in
            Lehi, Utah. We descale, deep clean, and sanitize undercounter and
            built-in residential ice machines in customers’ homes across Utah
            County and Salt Lake County, within a 75-mile service radius. We have
            served Utah homeowners since 2022 and we are licensed and insured.
          </p>
          <p>
            We service Scotsman, Sub-Zero, U-Line, KitchenAid, GE Profile, and GE
            Monogram machines producing nugget, pebble, gourmet, clear, and
            crescent ice, along with most other residential makes. Our standard
            service interval is every six months, which reflects the hardness of
            Utah water relative to the three-to-six-month range manufacturers
            typically recommend.
          </p>
          <p>
            A visit takes about one hour and includes all supplies. Call or text{" "}
            <a href={NAP.phoneHref}>{NAP.phoneDisplay}</a>. Email{" "}
            <a href={NAP.emailHref}>{NAP.email}</a>.
          </p>
          <SocialLinks />
        </section>
      </div>
    </>
  );
}
