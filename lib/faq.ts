// FAQ content, transcribed from content/*.md.
//
// HOME_FAQ and SERVICE_FAQ are rendered as a visible Q&A block on the home and
// /ice-machine-cleaning pages, and each emits a matching FAQPage JSON-LD
// (lib/schema.ts).
//
// TROUBLESHOOTING_FAQ / BRANDS_FAQ / AREAS_FAQ are the dedicated "FAQ schema
// pair" text from the .md files for the consolidated pages. They currently
// have no consumer: those pages render their own (longer) accordion prose,
// which doesn't match this condensed text verbatim, so there's no FAQPage
// JSON-LD there — Google wants the markup answer to be present on the page.
// Kept as a content reference; wiring a schema back would mean making the
// visible text and this array agree.

export type FaqItem = {
  q: string;
  a: string;
  // Optional trailing link, rendered after the answer on-page; ignored by JSON-LD.
  link?: { href: string; text: string };
};

// home.md § "Questions People Ask Before They Book"
export const HOME_FAQ: FaqItem[] = [
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
    a: "No, but we have to be able to get into the house to do the work — how you arrange that is up to you. We remind you several times in the week leading up to the visit, so it won't sneak up on you. If we still show up and can't get in, there's a $50 rescheduling fee. When the visit is done, you get an email with before-and-after photos, our notes, and the receipt.",
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
    q: "What do you use? Is it safe around food?",
    a: "A universal nickel-safe descaler for the mineral buildup, and a food-contact sanitizer for every surface the ice touches. Nickel-safe matters more than most homeowners realize, because the wrong descaler permanently damages an evaporator plate.",
  },
  {
    q: "How often does it actually need this?",
    a: "Every six months for most Utah homes, so it’s a recurring service. You sign a short agreement, we come back on that schedule at the same flat rate, and we handle the scheduling. Heavy use or unusually hard water can mean sooner, and we’ll tell you which category yours is in after we’ve seen inside it.",
  },
  {
    q: "Do you come out to Park City and Heber?",
    a: "Yes. We’re based in Lehi and serve a 75-mile radius.",
    link: {
      href: "/service-areas",
      text: "See whether you’re in our service area",
    },
  },
  {
    q: "What if I’m not happy with the job?",
    a: "We come back and clean it again at no charge.",
  },
];

// ice-machine-cleaning.md § "Common Questions About the Service"
export const SERVICE_FAQ: FaqItem[] = [
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
    a: "This page covers residential service. For anything commercial, call or text (801) 796-2675 and we’ll talk it through directly.",
  },
];

// troubleshooting.md — the "FAQ schema pair" from each section
export const TROUBLESHOOTING_FAQ: FaqItem[] = [
  {
    q: "Why is there black slime in my ice maker?",
    a: "It’s biofilm, a layer bacteria and mold form on wet surfaces. It grows in the reservoir and bin because those areas stay dark and damp. Rinsing won’t remove it; it has to be physically cleaned off and the surfaces sanitized.",
  },
  {
    q: "Why is my ice machine not making ice?",
    a: "The most common cause in hard-water areas is mineral scale on the evaporator, which insulates the surface where ice forms. Blocked airflow, a closed water valve, a clogged filter, and high ambient temperature are the other common causes.",
  },
  {
    q: "Why does my ice taste bad?",
    a: "Musty or sour ice usually means biofilm in the reservoir. Ice that tastes like nearby food has absorbed odors, since ice is porous. A metallic taste can mean a damaged evaporator surface or an aging water line.",
  },
  {
    q: "Why is my ice hollow or misshapen?",
    a: "Usually scale in the water distribution tubes, which stops water from spreading evenly across the evaporator plate. Areas receiving less water produce thin, hollow, or partial cubes. Note that nugget and pebble ice is opaque by design.",
  },
  {
    q: "Why won’t the clean light on my ice machine turn off?",
    a: "On most machines the clean light is an interval timer that must be reset manually after cleaning, and the reset procedure varies by brand. On machines that use a scale sensor instead, a light that stays on means buildup is still present.",
  },
  {
    q: "How often should an ice machine be cleaned in Utah?",
    a: "Every six months. Manufacturers recommend descaling every three to six months for average water, and Utah water is at the hard end of that range, so machines here scale faster.",
  },
  {
    q: "What happens if you never clean an ice machine?",
    a: "Production drops within the first year as scale coats the evaporator. Ice quality degrades next as biofilm establishes in the reservoir. Pump and evaporator failure follow, and manufacturer warranties commonly exclude damage from lack of maintenance.",
  },
  {
    q: "What’s the difference between descaling and sanitizing an ice machine?",
    a: "Descaling removes mineral scale using an acid-based, nickel-safe solution. Sanitizing kills bacteria and mold using a food-contact agent. Both are required, and descaling has to come first because scale shelters microorganisms from the sanitizer.",
  },
  {
    q: "Can I clean my own ice machine?",
    a: "You can safely empty and wash the bin, keep the vent and condenser clear, and change the water filter. Full descaling risks permanent damage if the solution isn’t nickel-safe, and the reservoir and pump can’t be cleaned without disassembly.",
  },
];

// brands.md — the "FAQ schema pair" from each brand section
export const BRANDS_FAQ: FaqItem[] = [
  {
    q: "How often does a Scotsman ice machine need cleaning?",
    a: "Scotsman recommends descaling every three to six months depending on water hardness. In Utah’s hard water, six months is the practical interval. On nugget models, scale on the evaporator strains the gearbox and auger motor, so skipping service causes mechanical failure rather than just lower production.",
  },
  {
    q: "Do Sub-Zero ice makers need professional cleaning?",
    a: "Yes. Sub-Zero undercounter units make clear ice, which requires even water flow across the evaporator, so scale affects ice quality early. The plated evaporator also requires a nickel-safe descaler.",
  },
  {
    q: "What does the CL alert mean on a U-Line ice machine?",
    a: "It’s an interval timer telling you the machine is due for cleaning after a set number of operating hours. It doesn’t measure scale, and it can be reset without the machine being cleaned.",
  },
  {
    q: "Why is my KitchenAid ice maker producing cloudy ice?",
    a: "Clear ice requires water to freeze evenly across the evaporator plate. Scale in the water distribution path disrupts that flow, producing cloudy, hollow, or malformed cubes before overall production drops noticeably.",
  },
  {
    q: "What cleaner should be used on a GE Monogram ice maker?",
    a: "A nickel-safe ice machine cleaner. GE’s parts catalog specifies one for its undercounter Monogram ice machines because the evaporators are plated, and non-approved descalers strip that plating.",
  },
  {
    q: "Do you service ice machine brands other than the ones listed?",
    a: "Yes. Uinta Ice Co. services most residential ice machine makes. The listed brands are the ones most commonly found in Utah homes.",
  },
];

// service-areas.md — the "FAQ schema pair" from each cluster section
export const AREAS_FAQ: FaqItem[] = [
  {
    q: "Do you clean ice machines in Alpine and Highland, Utah?",
    a: "Yes. Alpine and Highland are our densest service area, roughly fifteen minutes from our base in Lehi. We service undercounter and built-in residential ice machines in homes throughout both cities.",
  },
  {
    q: "Do you clean ice machines in Salt Lake City and Holladay?",
    a: "Yes. We service Salt Lake City, Holladay, Cottonwood Heights, and the surrounding east bench from our base in Lehi, within our 75-mile radius.",
  },
  {
    q: "Do you service ice machines in Park City?",
    a: "Yes. Park City is within our service radius. Water in the area is very hard, with Mountain Regional Water publishing roughly 300 mg/L of hardness, about 17.5 grains per gallon, so machines there scale faster than valley units.",
  },
  {
    q: "What cities in Utah County do you serve?",
    a: "Uinta Ice Co. is based in Lehi and serves Draper, American Fork, Pleasant Grove, Lindon, Orem, Provo, Mapleton, Saratoga Springs, Eagle Mountain, Riverton, South Jordan, Sandy, Genola, and Woodland Hills, among others within a 75-mile radius.",
  },
  {
    q: "How far does Uinta Ice Co. travel?",
    a: "We’re based in Lehi, Utah and serve a 75-mile radius, covering Utah County, Salt Lake County, and the Park City and Heber corridor.",
  },
];
