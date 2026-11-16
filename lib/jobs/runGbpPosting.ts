// Posts due content_drafts rows (status 'scheduled', scheduled_for <= today) to the
// Google Business Profile — called daily from netlify/functions/gbp-post-queue.mts.
// Only rows explicitly queued as 'scheduled' are ever posted; 'draft' rows never are.
// At most MAX_PER_RUN per run so a backlog can't flood the profile. A failure marks
// that row 'failed' with the error and stops the run (no hammering a broken token).
import { businessDb, businessTz } from "../tenant/business";
import { todayISODate } from "../time/zone";
import { createGbpPost, gbpConfigured } from "../gbp";

const MAX_PER_RUN = 5;
const BOOK_URL = "https://uintaice.com/book";

export async function runGbpPosting(): Promise<{ status: string; posted: number }> {
  if (!gbpConfigured()) {
    console.log("gbp-post-queue: GBP_* env vars not set; nothing posted");
    return { status: "not-configured", posted: 0 };
  }
  const db = businessDb();
  const today = todayISODate(await businessTz());

  const { data, error } = await db
    .from("content_drafts")
    .select("id, body, kind")
    .eq("status", "scheduled")
    .in("kind", ["gbp_daily_post", "gbp_city_post", "gbp_post"])
    .lte("scheduled_for", today)
    .order("scheduled_for", { ascending: true })
    .order("created_at", { ascending: true })
    .limit(MAX_PER_RUN);
  if (error) throw new Error(`gbp queue lookup failed: ${error.message}`);

  let posted = 0;
  for (const row of (data ?? []) as { id: string; body: string }[]) {
    try {
      const name = await createGbpPost(row.body, BOOK_URL);
      await db
        .from("content_drafts")
        .update({ status: "posted", posted_at: new Date().toISOString(), gbp_post_name: name, error: null })
        .eq("id", row.id);
      posted++;
    } catch (err) {
      const message = err instanceof Error ? err.message : String(err);
      console.error("gbp-post-queue: post failed", row.id, message);
      await db.from("content_drafts").update({ status: "failed", error: message.slice(0, 500) }).eq("id", row.id);
      return { status: "failed", posted };
    }
  }
  console.log("gbp-post-queue: complete", { posted });
  return { status: "ok", posted };
}
