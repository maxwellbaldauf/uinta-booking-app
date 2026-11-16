import type { Config } from "@netlify/functions";
import { runDailyCityPosts } from "../../lib/jobs/runDailyCityPosts";
import { runGbpPosting } from "../../lib/jobs/runGbpPosting";

// Daily 16:00 UTC (9-10am Utah). First queues one Google Business Profile post per
// city for recent real completed cleanings (lib/jobs/runDailyCityPosts.ts), then posts
// due 'scheduled' rows from content_drafts (lib/jobs/runGbpPosting.ts). Both do
// nothing until the GBP_* env vars are set. A failure queuing posts does not stop
// already-queued posts from going out.
async function handler() {
  try {
    console.log("gbp-post-queue: daily posts", await runDailyCityPosts());
  } catch (err) {
    console.error("gbp-post-queue: daily posts failed", err instanceof Error ? err.message : err);
  }
  const result = await runGbpPosting();
  console.log("gbp-post-queue: result", result);
}

export default handler;

export const config: Config = {
  schedule: "0 16 * * *",
};
