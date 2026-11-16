import type { Config } from "@netlify/functions";
import { runDailyCityPosts } from "../../lib/jobs/runDailyCityPosts";

// Daily 15:30 UTC (8:30-9:30am Utah), 30 min before gbp-post-queue. Writes one
// Google Business Profile post per (day, city) of recent real completed
// cleanings and queues it for today's posting run. Does nothing until the
// GBP_* env vars are set. Logic: lib/jobs/runDailyCityPosts.ts.
async function handler() {
  const result = await runDailyCityPosts();
  console.log("gbp-daily-posts: result", result);
}

export default handler;

export const config: Config = {
  schedule: "30 15 * * *",
};
