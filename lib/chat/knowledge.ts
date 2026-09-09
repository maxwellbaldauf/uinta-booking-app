// The chat assistant's entire business knowledge. Two sources, both already the
// canonical site content:
//
//   1. lib/faq.ts        — the five Q&A arrays the marketing pages render, each
//                          "transcribed from content/*.md". Reused verbatim, so
//                          this half can't drift from the site.
//   2. CURATED_SUPPLEMENT — the connective facts the FAQ arrays don't fully
//                          carry (scope boundary, recurring plan, logistics,
//                          service area, brands). Distilled from the same
//                          content/*.md sources.
//
// The price is NOT here — it is read live from settings.base_price_cents and
// injected by lib/chat/systemPrompt.ts, same rule as everywhere else on the site.
//
// MAINTENANCE: when the marketing copy for scope / plan / logistics / area /
// brands changes, update CURATED_SUPPLEMENT to match. The FAQ portion updates
// itself (it is lib/faq.ts).

import {
  HOME_FAQ,
  SERVICE_FAQ,
  TROUBLESHOOTING_FAQ,
  BRANDS_FAQ,
  AREAS_FAQ,
  type FaqItem,
} from "@/lib/faq";
import { NAP, SERVICE_CITIES, SINCE_LINE } from "@/lib/site";

const CURATED_SUPPLEMENT = `
### What the service is

Uinta Ice Co. descales the water path, hand-cleans the reservoir and bin,
applies a food-contact sanitizer to every surface the ice touches, then
reassembles and test-runs the machine. About an hour, start to finish. All
supplies included. There is nothing for the homeowner to buy, move, or prepare.

### What it is NOT — never imply otherwise

No appliance repair, no refrigeration or sealed-system work, no electrical work,
no installation. A failed compressor, a refrigerant issue, a bad fan motor, or
an electrical fault is not something a cleaning fixes. Never give a repair
instruction, never diagnose a specific mechanical fix, never quote a price for a
repair. If a machine still will not make ice after a proper cleaning, that means
a mechanical or electrical fault and Uinta says so plainly — they do not do
repairs, so they have no reason to sell one. This boundary is the point: a
company that also repairs has a reason to find something expensive.

### Products used

A universal nickel-safe descaler for the mineral scale, and a food-contact
sanitizer for every ice-contact surface. The evaporator plate in most
residential machines is nickel-plated, and a descaler that is not nickel-safe
strips that plating permanently — this is the main reason doing the full job
yourself is risky.

### The recurring plan

Every six months is the standard interval for Utah. Manufacturers typically call
for descaling every three to six months assuming average water; Utah water sits
at the hard end of that range. It runs as a recurring service: the customer
signs a short service agreement, Uinta comes back every six months at the same
flat rate and handles the scheduling. Stop any time by telling them. Heavy use
or unusually hard water can mean a shorter interval, and Uinta says which
category a machine is in after seeing inside it.

### Logistics

You do not need to be home, but Uinta needs a way into the house — how you
arrange that is up to you. Reminders go out in the week before the visit. If
Uinta arrives and cannot get in, there is a $50 rescheduling fee. Usually the
machine does not have to come out of the cabinet; if yours does, they say so
before starting. After the visit you get an email with before-and-after photos,
notes on the machine's condition, what came out of it, whether anything looked
mechanical, and the receipt — plus the next visit already scheduled.

### Guarantee

If you are not satisfied with the cleaning, Uinta comes back and cleans it again
at no charge.

### Warranty

Professional descaling and sanitizing is maintenance the manufacturer
recommends. It is the absence of it that causes warranty problems, not the
service itself.

### Service area

Based in ${NAP.locality}, ${NAP.region}. A 75-mile radius covering Utah County,
Salt Lake County, and the Park City and Heber corridor. The cities named on the
site: ${SERVICE_CITIES.join(", ")}. If a city is not on that list it may still
be inside the radius — do NOT promise service there; say it is likely and offer
to have someone confirm.

### Brands and machines

Seen most often: Scotsman, Sub-Zero, U-Line, KitchenAid, GE Profile, GE
Monogram. Machine types: undercounter and built-in residential ice machines
producing nugget, pebble, gourmet, clear, and crescent ice. Most other
residential makes are serviced too — for a make that is not listed, ask the
visitor to call or text with the make and model. Never invent a brand-specific
reset sequence or clean-cycle procedure.

### Company

${NAP.legalName}. ${SINCE_LINE}. Licensed and insured. Locally owned in
${NAP.locality}. Phone and text: ${NAP.phoneDisplay}. Email: ${NAP.email}.
Booking is at /book.
`.trim();

function faqBlock(title: string, items: FaqItem[]): string {
  const body = items.map((it) => `Q: ${it.q}\nA: ${it.a}`).join("\n\n");
  return `### ${title}\n\n${body}`;
}

export const KNOWLEDGE_BASE = [
  CURATED_SUPPLEMENT,
  faqBlock("General questions people ask before booking", HOME_FAQ),
  faqBlock("About the service in detail", SERVICE_FAQ),
  faqBlock("Symptoms and troubleshooting", TROUBLESHOOTING_FAQ),
  faqBlock("By brand", BRANDS_FAQ),
  faqBlock("By service area", AREAS_FAQ),
].join("\n\n");
