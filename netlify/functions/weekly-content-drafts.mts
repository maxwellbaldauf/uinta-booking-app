import type { Config } from "@netlify/functions";
import { runWeeklyContentDrafts } from "../../lib/jobs/runWeeklyContentDrafts";
import { sendContentAlert } from "../../lib/email/contentAlert";

// Mondays 15:00 UTC (8-9am Utah). Reads last week's real completed jobs and
// publishes a short blog post to /blog (content_drafts, status 'posted').
// GBP posts come from the daily gbp-post-queue function.
// Logic lives in lib/jobs/runWeeklyContentDrafts.ts (relative imports only).
// Scheduled functions only run for published production deploys; to test,
// `netlify functions:invoke weekly-content-drafts` runs it once.
// A crash or missing API key emails the owner (lib/email/contentAlert.ts).
async function handler() {
  try {
    const result = await runWeeklyContentDrafts();
    console.log("weekly-content-drafts: complete", result);
    if (result.status === "no-api-key") {
      await sendContentAlert({
        subject: "Weekly blog post didn't run",
        what: "This week's /blog post wasn't written because the AI writing key is missing.",
        rows: [{ label: "Status", value: result.status }],
        fix: "In Netlify (uintaice site) → Environment variables, make sure ANTHROPIC_API_KEY is set.",
      });
    }
  } catch (err) {
    const message = err instanceof Error ? err.message : String(err);
    console.error("weekly-content-drafts: crashed", message);
    await sendContentAlert({
      subject: "Weekly blog post failed",
      what: "This week's /blog post wasn't published. That week is skipped; next Monday's post runs normally.",
      rows: [{ label: "Error", value: message }],
      fix: "Usually temporary. If it repeats, forward this email to whoever maintains the website.",
    });
  }
}

export default handler;

export const config: Config = {
  schedule: "0 15 * * 1",
};
