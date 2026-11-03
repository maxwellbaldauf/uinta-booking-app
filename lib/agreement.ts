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
export function agreementVersionFor(mode: string | null | undefined): string {
  return modeOf(mode) === "one_time_link" ? ONE_TIME_AGREEMENT_VERSION : SERVICE_AGREEMENT_VERSION;
}
export function agreementBlocksFor(mode: string | null | undefined): readonly AgreementBlock[] {
  return modeOf(mode) === "one_time_link" ? ONE_TIME_AGREEMENT_BLOCKS : SERVICE_AGREEMENT_BLOCKS;
}
export function agreementPdfFilenameFor(mode: string | null | undefined): string {
  return modeOf(mode) === "one_time_link" ? ONE_TIME_AGREEMENT_PDF_FILENAME : SERVICE_AGREEMENT_PDF_FILENAME;
}
// A customer's acceptance is current only for the text THEIR mode shows. Someone who
// accepted the card-on-file text and is later switched to one-time link (or back) is
// asked to accept the other text; their earlier record is kept as is.
export function agreementIsCurrentFor(
  storedVersion: string | null | undefined,
  mode: string | null | undefined
): boolean {
  return storedVersion === agreementVersionFor(mode);
}
