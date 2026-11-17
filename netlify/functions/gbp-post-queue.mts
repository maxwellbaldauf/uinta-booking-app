import type { Config } from "@netlify/functions";
import { runGbpPosting } from "../../lib/jobs/runGbpPosting";
import { sendContentAlert, GBP_FIX } from "../../lib/email/contentAlert";

// Daily 16:00 UTC (9-10am Utah). Posts due, explicitly 'scheduled' rows from
// content_drafts to the Google Business Profile via Make (max 5 per run; rows
// are queued by gbp-daily-posts 30 min earlier). Does nothing until
// MAKE_GBP_WEBHOOK_URL is set. Logic: lib/jobs/runGbpPosting.ts.
// Post failures and crashes email the owner (lib/email/contentAlert.ts).
async function handler() {
  try {
    const result = await runGbpPosting();
    console.log("gbp-post-queue: result", result);
  } catch (err) {
    const message = err instanceof Error ? err.message : String(err);
    console.error("gbp-post-queue: crashed", message);
    await sendContentAlert({
      subject: "Google posting crashed",
      what: "The daily job that publishes Google Business Profile posts stopped with an error. Queued posts are kept and retried tomorrow.",
      rows: [{ label: "Error", value: message }],
      fix: GBP_FIX,
    });
  }
}

export default handler;

export const config: Config = {
  schedule: "0 16 * * *",
};
