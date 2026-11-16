import type { Config } from "@netlify/functions";
import { runWeeklyContentDrafts } from "../../lib/jobs/runWeeklyContentDrafts";

// Mondays 15:00 UTC (8-9am Utah). Reads last week's real completed jobs and
// publishes a short blog post to /blog (content_drafts, status 'posted').
// GBP posts come from the daily gbp-post-queue function.
// Logic lives in lib/jobs/runWeeklyContentDrafts.ts (relative imports only).
// Scheduled functions only run for published production deploys; to test,
// `netlify functions:invoke weekly-content-drafts` runs it once.
async function handler() {
  const result = await runWeeklyContentDrafts();
  console.log("weekly-content-drafts: complete", result);
}

export default handler;

export const config: Config = {
  schedule: "0 15 * * 1",
};
