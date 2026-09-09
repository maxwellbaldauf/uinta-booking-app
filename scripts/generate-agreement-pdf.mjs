// Regenerates the static Service Agreement PDF that the booking-confirmation
// email attaches on a customer's FIRST acceptance
// (see lib/email/bookingConfirmation.ts).
//
// The text lives in lib/agreement.data.json — this script only renders it.
// Whenever the agreement wording changes:
//   1. edit `blocks` in lib/agreement.data.json
//   2. bump `version` in lib/agreement.data.json
//   3. run:  npm run agreement:pdf
//   4. commit the regenerated content/service-agreement-<version>.pdf
//
// Deliberately NOT part of `next build`: PDF generation is a manual step so a
// text edit can never silently ship an attachment that doesn't match.
//
// Plain Node + JSON on purpose — no TypeScript loader, so it runs on any Node.

import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";
import PDFDocument from "pdfkit";

const root = fileURLToPath(new URL("..", import.meta.url));
const { version, blocks } = JSON.parse(
  fs.readFileSync(path.join(root, "lib", "agreement.data.json"), "utf8")
);
const pdfFilename = `service-agreement-${version}.pdf`;
const outPath = path.join(root, "content", pdfFilename);

const MARGIN = 72; // 1 inch

const doc = new PDFDocument({
  size: "LETTER",
  margins: { top: MARGIN, bottom: MARGIN, left: MARGIN, right: MARGIN },
  bufferPages: true,
  info: {
    Title: "Uinta Ice Co. — Residential Ice Machine Cleaning Service Agreement",
    Author: "Uinta Ice Co., LLC",
    Subject: `Service Agreement, version ${version}`,
    // Pin to the version date so re-running the generator on unchanged text
    // produces a byte-identical PDF (no spurious git diffs).
    CreationDate: new Date(`${version}T00:00:00Z`),
  },
});

const chunks = [];
doc.on("data", (c) => chunks.push(c));
const finished = new Promise((resolve) => doc.on("end", resolve));

for (const block of blocks) {
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
    `Uinta Ice Co. · Service Agreement · Version ${version}`,
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

fs.mkdirSync(path.dirname(outPath), { recursive: true });
const buf = Buffer.concat(chunks);
fs.writeFileSync(outPath, buf);
console.log(`Wrote ${path.relative(process.cwd(), outPath)} (${buf.length} bytes)`);
