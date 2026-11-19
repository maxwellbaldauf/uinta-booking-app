// ---------------------------------------------------------------------------
// Uinta Ice Co. Residential Ice Machine Cleaning Service Agreement.
//
// SINGLE SOURCE OF TRUTH is lib/agreement.data.json. It is rendered two ways,
// both from the blocks there:
//   1. the scroll-gated consent step in the booking flow
//      (components/booking/AgreementStep.tsx via AgreementText.tsx)
//   2. the static PDF attached to a customer's first confirmation email
//      (scripts/generate-agreement-pdf.mjs -> content/service-agreement-<v>.pdf)
//
// The data lives in JSON (not this .ts file) so the plain-Node PDF generator can
// read it without a TypeScript loader.
//
// WHEN THE TEXT CHANGES:
//   1. edit lib/agreement.data.json (`blocks`)
//   2. bump `version` in lib/agreement.data.json — every prior acceptance goes
//      stale and the customer is re-prompted on their next booking (see
//      agreementIsCurrent)
//   3. run `npm run agreement:pdf` and commit the regenerated PDF in /content
//      (PDF generation is a deliberate manual step, never wired into a build,
//      so a text edit can't silently ship a mismatched attachment)
// ---------------------------------------------------------------------------

import agreementData from "./agreement.data.json";
import oneTimeData from "./agreement.one-time.data.json";

export type AgreementBlock =
  | { kind: "title"; text: string }
  | { kind: "subtitle"; text: string }
  | { kind: "intro"; text: string }
  | { kind: "heading"; text: string }
  | { kind: "paragraph"; text: string };

// Date the current wording was finalized. Stored on the customer row as
// service_agreement_version so we always know which text a customer agreed to.
export const SERVICE_AGREEMENT_VERSION: string = agreementData.version;

// The committed PDF that carries this exact version of the text.
export const SERVICE_AGREEMENT_PDF_FILENAME = `service-agreement-${SERVICE_AGREEMENT_VERSION}.pdf`;

// Verbatim agreement text as ordered blocks. Structure preserved (title,
// numbered sections, paragraph breaks); the Word document's signature block is
// dropped — consent here is the checkbox, not a physical signature.
export const SERVICE_AGREEMENT_BLOCKS: readonly AgreementBlock[] =
  agreementData.blocks as readonly AgreementBlock[];

// The agreement a customer accepted is "current" only when the version string
// stored on their row matches the version compiled into the app right now.
// A wording change bumps the version, which makes every prior acceptance stale —
// so a returning customer is re-prompted rather than being treated as having
// agreed to text they never saw.
export function agreementIsCurrent(
  storedVersion: string | null | undefined
): boolean {
  return storedVersion === SERVICE_AGREEMENT_VERSION;
}

// ---------------------------------------------------------------------------
// One-time payment link variant: the SAME agreement except Sections 5 and 6, which
// drop the card-on-file authorization. Shown only to customers whose
// customers.payment_mode is 'one_time_link' (decided on the server). Its own
// version string (ending "-link") is what gets stored on the customer, so the
// record shows which text they accepted. Edit lib/agreement.one-time.data.json,
// bump its version, and run `npm run agreement:pdf`.
// ---------------------------------------------------------------------------
export type AgreementMode = "card_on_file" | "one_time_link";

export const ONE_TIME_AGREEMENT_VERSION: string = oneTimeData.version;
export const ONE_TIME_AGREEMENT_BLOCKS: readonly AgreementBlock[] =
  oneTimeData.blocks as readonly AgreementBlock[];
export const ONE_TIME_AGREEMENT_PDF_FILENAME = `service-agreement-${ONE_TIME_AGREEMENT_VERSION}.pdf`;

function modeOf(mode: string | null | undefined): AgreementMode {
  return mode === "one_time_link" ? "one_time_link" : "card_on_file";
}

// ---------------------------------------------------------------------------
// Annual service: the agreement states the customer's visit frequency.
//
// The ONLY wording that varies is the "approximately every six (6) months"
// phrase in the Recurring Service section (see applyFrequency below):
//   semi_annual -> text unchanged, version unchanged (so every existing
//                  acceptance stays current and nobody is re-prompted)
//   annual      -> "approximately once a year"
//   mixed       -> "approximately as listed for each property below" plus one
//                  extra paragraph listing each property's frequency
// Every property of a customer counts; a property on any other interval
// (e.g. every 4 months) does not trigger a variant: a customer with NO annual
// property keeps the semi-annual text exactly as it was.
// ---------------------------------------------------------------------------
export type AgreementFrequency = "semi_annual" | "annual" | "mixed" | "one_time";
export type FrequencyLine = { address: string; months: number };

const ANNUAL_VERSION_DATE = "2026-11-19";
const SEMI_PHRASE = "approximately every six (6) months,";
const ANNUAL_PHRASE = "approximately once a year,";
const MIXED_PHRASE = "approximately as listed for each property below,";

// annual = every property is on 12 months; mixed = some are and some aren't;
// anything else (no annual property at all) = the unchanged semi-annual text.
// 0 months means One-time service (a single visit, no recurring plan).
export function frequencyOf(months: number[]): AgreementFrequency {
  if (months.length > 0 && months.every((m) => m === 0)) return "one_time";
  const special = months.filter((m) => m === 12 || m === 0).length;
  if (special === 0) return "semi_annual";
  return months.every((m) => m === 12) ? "annual" : "mixed";
}

export function frequencyWords(months: number): string {
  if (months === 0) return "one visit only";
  if (months === 12) return "once a year";
  if (months === 6) return "every six (6) months";
  return months === 1 ? "every month" : `every ${months} months`;
}

// A short fingerprint of the per-property listing, so the "mixed" version changes whenever the
// list the customer is shown changes (a property added or switched): they accept the new list.
export function linesFingerprint(lines: readonly FrequencyLine[]): string {
  const s = lines.map((l) => `${l.address}|${l.months}`).sort().join(String.fromCharCode(10));
  let h = 0x811c9dc5;
  for (let i = 0; i < s.length; i++) {
    h ^= s.charCodeAt(i);
    h = Math.imul(h, 0x01000193) >>> 0;
  }
  return h.toString(36);
}

export function agreementVersionFor(
  mode: string | null | undefined,
  frequency: AgreementFrequency,
  lines: readonly FrequencyLine[]
): string {
  if (frequency === "semi_annual") return modeOf(mode) === "one_time_link" ? ONE_TIME_AGREEMENT_VERSION : SERVICE_AGREEMENT_VERSION;
  const kind = frequency === "annual" ? "annual" : frequency === "one_time" ? "once" : `mixed-${linesFingerprint(lines)}`;
  return `${ANNUAL_VERSION_DATE}-${kind}${modeOf(mode) === "one_time_link" ? "-link" : ""}`;
}

export function agreementBlocksFor(
  mode: string | null | undefined,
  frequency: AgreementFrequency = "semi_annual",
  lines: readonly FrequencyLine[] = []
): readonly AgreementBlock[] {
  const base = modeOf(mode) === "one_time_link" ? ONE_TIME_AGREEMENT_BLOCKS : SERVICE_AGREEMENT_BLOCKS;
  return applyFrequency(base, frequency, lines);
}

export function applyFrequency(
  base: readonly AgreementBlock[],
  frequency: AgreementFrequency,
  lines: readonly FrequencyLine[] = []
): readonly AgreementBlock[] {
  if (frequency === "semi_annual") return base;
  if (frequency === "one_time") return applyOneTime(base);
  const out: AgreementBlock[] = [];
  for (const block of base) {
    if (block.kind === "paragraph" && block.text.includes(SEMI_PHRASE)) {
      out.push({
        ...block,
        text: block.text.replace(SEMI_PHRASE, frequency === "annual" ? ANNUAL_PHRASE : MIXED_PHRASE),
      });
      if (frequency === "mixed") {
        out.push({
          kind: "paragraph",
          text: `Frequency by property: ${lines.map((l) => `${l.address} — ${frequencyWords(l.months)}`).join("; ")}.`,
        });
      }
    } else {
      out.push(block);
    }
  }
  return out;
}

// One-time service: a single visit. Only Section 2 changes (and, in the pay-by-link text, one
// sentence in Section 6 about the next visit); keep in sync with scripts/generate-agreement-pdf.mjs.
const ONE_TIME_REPLACEMENTS: readonly [string, string][] = [
  ["2. Recurring Service & Term", "2. Service & Term"],
  [
    "Service is provided on a recurring basis, approximately every six (6) months, for as long as this Agreement remains in effect.",
    "Service is provided as a single visit, with no recurring visits.",
  ],
  [
    "This Agreement continues automatically from visit to visit until cancelled by either party as described in Section 4.",
    "This Agreement ends once the visit is completed and paid.",
  ],
  [" Your next visit is scheduled after you pay an invoice, so an unpaid invoice may delay it, and Section 4 applies to continued non-payment.", ""],
];
function applyOneTime(base: readonly AgreementBlock[]): readonly AgreementBlock[] {
  return base.map((block) => {
    let text = block.text;
    for (const [from, to] of ONE_TIME_REPLACEMENTS) text = text.split(from).join(to);
    return text === block.text ? block : { ...block, text };
  });
}

// The committed static PDF for a variant, or null when none can exist (the
// mixed text lists the customer's own properties, so it has no static PDF).
export function agreementPdfFilenameFor(
  mode: string | null | undefined,
  frequency: AgreementFrequency = "semi_annual"
): string | null {
  return frequency === "mixed" ? null : `service-agreement-${agreementVersionFor(mode, frequency, [])}.pdf`; // never mixed here
}

export function agreementIsCurrentFor(
  storedVersion: string | null | undefined,
  mode: string | null | undefined,
  frequency: AgreementFrequency,
  lines: readonly FrequencyLine[]
): boolean {
  return storedVersion === agreementVersionFor(mode, frequency, lines);
}
