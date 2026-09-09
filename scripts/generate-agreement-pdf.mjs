// Regenerates the static Service Agreement PDF that the booking-confirmation
// email attaches on a customer's FIRST acceptance
// (see lib/email/bookingConfirmation.ts).
//
// The text lives in lib/agreement.ts — this script only renders it. Whenever the
// agreement wording changes:
//   1. edit SERVICE_AGREEMENT_BLOCKS in lib/agreement.ts
//   2. bump SERVICE_AGREEMENT_VERSION in lib/agreement.ts
//   3. run:  npm run agreement:pdf
//   4. commit the regenerated content/service-agreement-<version>.pdf
//
// Deliberately NOT part of `next build`: PDF generation is a manual step so a
// text edit can never silently ship an attachment that doesn't match.

import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";
import PDFDocument from "pdfkit";
import {
  SERVICE_AGREEMENT_BLOCKS,
  SERVICE_AGREEMENT_VERSION,
  SERVICE_AGREEMENT_PDF_FILENAME,
} from "../lib/agreement.ts";

const MARGIN = 72; // 1 inch
const contentDir = fileURLToPath(new URL("../content", import.meta.url));
const outPath = path.join(contentDir, SERVICE_AGREEMENT_PDF_FILENAME);

const doc = new PDFDocument({
  size: "LETTER",
  margins: { top: MARGIN, bottom: MARGIN, left: MARGIN, right: MARGIN },
  bufferPages: true,
  info: {
    Title: "Uinta Ice Co. — Residential Ice Machine Cleaning Service Agreement",
    Author: "Uinta Ice Co., LLC",
    Subject: `Service Agreement, version ${SERVICE_AGREEMENT_VERSION}`,
  },
});

const chunks = [];
doc.on("data", (c) => chunks.push(c));
const finished = new Promise((resolve) => doc.on("end", resolve));

for (const block of SERVICE_AGREEMENT_BLOCKS) {
  switch (block.kind) {
    case "title":
      doc.font("Helvetica-Bold").fontSize(16).fillColor("#12110f");
      doc.text(block.text, { align: "center", characterSpacing: 0.5 });
      break;
    case "subtitle":
      doc.moveDown(0.35);
      doc.font("Helvetica").fontSize(11).fillColor("#575047");
      doc.text(block.text, { align: "center" });
      doc.moveDown(1.1);
      break;
    case "intro":
      doc.font("Times-Roman").fontSize(10.5).fillColor("#12110f");
      doc.text(block.text, { align: "left", lineGap: 3 });
      doc.moveDown(0.8);
      break;
    case "heading":
      doc.moveDown(0.4);
      doc.font("Helvetica-Bold").fontSize(11).fillColor("#12110f");
      doc.text(block.text);
      doc.moveDown(0.35);
      break;
    case "paragraph":
      doc.font("Times-Roman").fontSize(10.5).fillColor("#12110f");
      doc.text(block.text, { align: "left", lineGap: 3 });
      doc.moveDown(0.55);
      break;
    default:
      throw new Error(`Unknown agreement block kind: ${JSON.stringify(block)}`);
  }
}

// Footer (version + page numbers) on every page. Drop the bottom margin while
// writing so pdfkit doesn't spill onto a fresh page.
const range = doc.bufferedPageRange();
for (let i = 0; i < range.count; i++) {
  doc.switchToPage(range.start + i);
  const savedBottom = doc.page.margins.bottom;
  doc.page.margins.bottom = 0;
  const y = doc.page.height - MARGIN + 24;
  doc.font("Helvetica").fontSize(8).fillColor("#8a8276");
  doc.text(
    `Uinta Ice Co. · Service Agreement · Version ${SERVICE_AGREEMENT_VERSION}`,
    MARGIN,
    y,
    { align: "left", lineBreak: false }
  );
  doc.text(`Page ${i + 1} of ${range.count}`, MARGIN, y, {
    align: "right",
    lineBreak: false,
    width: doc.page.width - MARGIN * 2,
  });
  doc.page.margins.bottom = savedBottom;
}

doc.end();
await finished;

fs.mkdirSync(contentDir, { recursive: true });
const buf = Buffer.concat(chunks);
fs.writeFileSync(outPath, buf);
console.log(`Wrote ${path.relative(process.cwd(), outPath)} (${buf.length} bytes)`);
