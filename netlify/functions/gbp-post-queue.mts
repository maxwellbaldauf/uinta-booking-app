import type { Config } from "@netlify/functions";
import { runGbpPosting } from "../../lib/jobs/runGbpPosting";

// Daily 16:00 UTC (9-10am Utah). Posts due, explicitly 'scheduled' rows from
// content_drafts to the Google Business Profile (max 5 per run; rows are
// queued by gbp-daily-posts 30 min earlier). Does nothing until MAKE_GBP_WEBHOOK_URL
// is set. Logic: lib/jobs/runGbpPosting.ts.
async function handler() {
  const result = await runGbpPosting();
  console.log("gbp-post-queue: result", result);
}

export default handler;

export const config: Config = {
  schedule: "0 16 * * *",
};
