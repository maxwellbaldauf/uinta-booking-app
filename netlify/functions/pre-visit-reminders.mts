import type { Config } from "@netlify/functions";
import { runPrevisitReminderSweep } from "../../lib/jobs/runPrevisitReminderSweep";

// A real Netlify Scheduled Function — the first one in this repo. The
// Service Agreement has promised pre-visit contact since day one ("we'll
// contact you multiple times in the week leading up to your visit"), but no
// version of it ever existed — confirmed by grep and by checking the linked
// Supabase project for pg_cron jobs before building this.
//
// Netlify Runtime v5 (this repo's @netlify/plugin-nextjs version) deprecated
// scheduled functions implemented as Next.js API routes — they must be real
// Netlify Functions under netlify/functions/, which is why this isn't
// app/api/scheduled/pre-visit-reminders/route.ts. All the actual logic lives
// in lib/jobs/runPrevisitReminderSweep.ts (relative-imports only — this
// function's bundler doesn't resolve this project's "@/" tsconfig alias),
// making this file just the scheduled entry point.
//
// Cron is fixed UTC with no DST awareness, so the Denver wall-clock hour
// this fires at drifts by an hour across the DST boundary (7am MST / 8am
// MDT for 14:00 UTC). That's fine: every date comparison inside the sweep
// is computed fresh via todayDenverISODate() at run time, so "which day is
// it" is always correct regardless of what UTC hour happened to trigger the
// run. Offset by 15 minutes from uinta-field-app's unpaid-invoice reminder
// function purely to keep the two functions' logs from interleaving — they
// share no code or state otherwise.
//
// Local testing: `netlify dev` + `netlify functions:invoke pre-visit-reminders`
// runs the handler once immediately — it does not exercise the schedule
// itself. Whether this actually fires daily in production can only be
// confirmed after a real deploy (scheduled functions only run for published
// deploys, never previews or branch deploys).
async function handler() {
  const result = await runPrevisitReminderSweep();
  console.log("pre-visit-reminders: sweep complete", result);
}

export default handler;

export const config: Config = {
  schedule: "0 14 * * *",
};
