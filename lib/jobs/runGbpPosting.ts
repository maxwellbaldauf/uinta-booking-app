// Posts due content_drafts rows (status 'scheduled', scheduled_for <= today) to the
// Google Business Profile (via Make, lib/gbp.ts) — called daily from netlify/functions/gbp-post-queue.mts.
// Only rows explicitly queued as 'scheduled' are ever posted; 'draft' rows never are.
//
// * At most MAX_PER_RUN per run so a backlog can't flood the profile.
// * At-most-once: a row is claimed (marked 'posted') BEFORE the Google call, so a
//   failed database write after a successful post can never cause a repeat post.
// * A Google error puts the row back to 'scheduled' for tomorrow (temporary
//   429/503/token hiccups recover); after RETRY_DAYS of failures it is marked
//   'failed' for good. The run stops at the first error (no hammering a broken token).
import { businessDb, businessTz, getBusiness } from "../tenant/business";
import { todayISODate, addDaysToISODate } from "../time/zone";
import { createGbpPost, gbpConfigured } from "../gbp";

const MAX_PER_RUN = 5;
const RETRY_DAYS = 3;

type DueRow = { id: string; body: string; scheduled_for: string; created_at: string };

export async function runGbpPosting(): Promise<{ status: string; posted: number }> {
  if (!gbpConfigured()) {
    console.log("gbp-post-queue: MAKE_GBP_WEBHOOK_URL not set; nothing posted");
    return { status: "not-configured", posted: 0 };
  }
  const db = businessDb();
  const today = todayISODate(await businessTz());
  const bookUrl = `${(await getBusiness()).site_origin.replace(/\/+$/, "")}/book`;

  const { data, error } = await db
    .from("content_drafts")
    .select("id, body, scheduled_for, created_at")
    .eq("status", "scheduled")
    .in("kind", ["gbp_daily_post", "gbp_city_post", "gbp_post"])
    .lte("scheduled_for", today)
    .order("scheduled_for", { ascending: true })
    .order("created_at", { ascending: true })
    .limit(MAX_PER_RUN);
  if (error) throw new Error(`gbp queue lookup failed: ${error.message}`);

  let posted = 0;
  for (const row of (data ?? []) as DueRow[]) {
    // Claim first; skip the row if the claim didn't land (or another run took it).
    const { data: claimed, error: claimErr } = await db
      .from("content_drafts")
      .update({ status: "posted", posted_at: new Date().toISOString(), error: null })
      .eq("id", row.id)
      .eq("status", "scheduled")
      .select("id");
    if (claimErr || !claimed?.length) {
      console.error("gbp-post-queue: could not claim row; skipped", row.id, claimErr?.message);
      continue;
    }

    try {
      const name = await createGbpPost(row.body, bookUrl);
      posted++;
      const { error: nameErr } = await db.from("content_drafts").update({ gbp_post_name: name }).eq("id", row.id);
      if (nameErr) console.error("gbp-post-queue: posted, but saving the post name failed", row.id, nameErr.message);
    } catch (err) {
      const message = (err instanceof Error ? err.message : String(err)).slice(0, 500);
      const giveUp = today >= addDaysToISODate(row.created_at.slice(0, 10), RETRY_DAYS);
      console.error("gbp-post-queue: post failed", row.id, giveUp ? "(giving up)" : "(retry tomorrow)", message);
      const { error: undoErr } = await db
        .from("content_drafts")
        .update(
          giveUp
            ? { status: "failed", posted_at: null, error: message }
            : { status: "scheduled", posted_at: null, scheduled_for: addDaysToISODate(today, 1), error: message }
        )
        .eq("id", row.id);
      if (undoErr) console.error("gbp-post-queue: could not record the failure", row.id, undoErr.message);
      return { status: "failed", posted };
    }
  }
  console.log("gbp-post-queue: complete", { posted });
  return { status: "ok", posted };
}
