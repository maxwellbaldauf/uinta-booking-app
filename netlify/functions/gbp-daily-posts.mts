import type { Config } from "@netlify/functions";
import { runDailyCityPosts } from "../../lib/jobs/runDailyCityPosts";
import { sendContentAlert } from "../../lib/email/contentAlert";

// Daily 15:30 UTC (8:30-9:30am Utah), 30 min before gbp-post-queue. Writes one
// Google Business Profile post per (day, city) of recent real completed
// cleanings and queues it for today's posting run. Does nothing until
// MAKE_GBP_WEBHOOK_URL is set. Logic: lib/jobs/runDailyCityPosts.ts.
// Any crash or missing setup emails the owner (lib/email/contentAlert.ts).
async function handler() {
  try {
    const result = await runDailyCityPosts();
    console.log("gbp-daily-posts: result", result);
    if (result.status === "no-api-key" || result.status === "not-configured") {
      await sendContentAlert({
        subject: "Google posts are switched off",
        what: "The daily Google Business Profile posts didn't run because a setting is missing.",
        rows: [{ label: "Status", value: result.status }],
        fix: "In Netlify (uintaice site) → Environment variables, make sure ANTHROPIC_API_KEY and MAKE_GBP_WEBHOOK_URL are both set.",
      });
    }
  } catch (err) {
    const message = err instanceof Error ? err.message : String(err);
    console.error("gbp-daily-posts: crashed", message);
    await sendContentAlert({
      subject: "Google post writing crashed",
      what: "The daily job that writes Google Business Profile posts stopped with an error. It runs again tomorrow and catches up the last 7 days.",
      rows: [{ label: "Error", value: message }],
      fix: "If this repeats, forward this email to whoever maintains the website.",
    });
  }
}

export default handler;

export const config: Config = {
  schedule: "30 15 * * *",
};
