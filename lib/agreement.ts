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
