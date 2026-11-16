// Daily per-cleaning GBP posts: for each (day, city) with real completed residential
// cleanings in the last LOOKBACK_DAYS (at least 1 day old), write ONE Google Business
// Profile post and queue it as 'scheduled' for today. lib/jobs/runGbpPosting.ts posts it.
// Called from netlify/functions/gbp-post-queue.mts right before the posting run.
//
// * Same job rules as the city pages: completed|charged, not a fee charge, residential,
//   customer not archived.
// * Idempotent: one row per (kind 'gbp_daily_post', week_start = the job date, city_slug);
//   a re-run or a job marked complete late never duplicates a post.
// * Jobs before FIRST_DAY are covered by the one-time per-city backfill (posted by hand
//   in the GBP UI on 2026-11-16), so they are never posted again here.
// * Does nothing until the GBP API is configured, so posts don't pile up and flood the
//   profile the day it's connected.
//
// Relative imports only (the function bundle doesn't resolve "@/" aliases).
import Anthropic from "@anthropic-ai/sdk";
import { businessDb, businessTz } from "../tenant/business";
import { todayISODate, addDaysToISODate } from "../time/zone";
import { citySlug, machineLabel, monthLabel } from "../cityFacts";
import { gbpConfigured } from "../gbp";

const MODEL = "claude-sonnet-5-5";
const FIRST_DAY = "2026-11-16";
const LOOKBACK_DAYS = 7;

type Row = {
  scheduled_date: string | null;
  property: {
    city: string | null;
    service_type: string;
    ice_maker_brand: string | null;
    customers: { archived_at: string | null } | null;
  } | null;
};

export type DayCityFacts = { date: string; slug: string; name: string; count: number; machines: string[] };

export function groupByDayCity(rows: Row[]): DayCityFacts[] {
  const by = new Map<string, DayCityFacts & { set: Set<string> }>();
  for (const r of rows) {
    const p = r.property;
    if (!r.scheduled_date || !p?.city || p.service_type !== "residential" || p.customers?.archived_at) continue;
    const slug = citySlug(p.city);
    if (!slug) continue;
    const key = `${r.scheduled_date}|${slug}`;
    const e = by.get(key) ?? { date: r.scheduled_date, slug, name: p.city.trim(), count: 0, machines: [], set: new Set<string>() };
    e.count++;
    e.set.add(machineLabel(p.ice_maker_brand));
    by.set(key, e);
  }
  return [...by.values()]
    .map(({ set, ...e }) => ({ ...e, machines: [...set] }))
    .sort((a, b) => a.date.localeCompare(b.date) || a.name.localeCompare(b.name));
}

const RULES = `Write a Google Business Profile post for Uinta Ice Co., a residential ice machine cleaning service based in Lehi, Utah that travels to customers' homes.
Use ONLY the facts provided. Do not invent anything: no customer names or stories, no street addresses, no prices, no reviews or ratings, no quotes, no statistics, no claims about results or how machines performed, no promotions, no storefront or office outside Lehi, no benefits or process details that are not in the facts.
Tone: plain, understated, local. No emojis, no hashtags, no exclamation marks, no marketing hype.
Length: 40-80 words. Do not include a URL or phone number (a Book button is added automatically). Output only the post text.`;

async function postText(client: Anthropic, f: DayCityFacts): Promise<string> {
  const facts = `City: ${f.name}, Utah\nResidential cleanings completed there recently (${monthLabel(f.date)}): ${f.count}\nMachines: ${f.machines.join(", ")}`;
  const res = await client.messages.create({
    model: MODEL,
    max_tokens: 2000,
    messages: [{ role: "user", content: `${RULES}\n\nFacts:\n${facts}` }],
  });
  const text = res.content.map((b) => (b.type === "text" ? b.text : "")).join("").trim();
  if (!text) throw new Error(`empty model response for ${f.name} (stop_reason: ${res.stop_reason})`);
  return text.slice(0, 1500);
}

// opts are for testing against staging data only; production calls it with none.
export async function runDailyCityPosts(opts: { today?: string; firstDay?: string } = {}): Promise<{ status: string; queued: number }> {
  if (!gbpConfigured()) return { status: "not-configured", queued: 0 };
  const apiKey = process.env.ANTHROPIC_API_KEY;
  if (!apiKey) {
    console.error("daily-city-posts: ANTHROPIC_API_KEY is not set");
    return { status: "no-api-key", queued: 0 };
  }

  const db = businessDb();
  const today = opts.today ?? todayISODate(await businessTz());
  const firstDay = opts.firstDay ?? FIRST_DAY;
  const to = addDaysToISODate(today, -1);
  const lookback = addDaysToISODate(today, -LOOKBACK_DAYS);
  const from = lookback > firstDay ? lookback : firstDay;
  if (from > to) return { status: "nothing-due", queued: 0 };

  const { data, error } = await db
    .from("jobs")
    .select("scheduled_date, property:properties!inner(city, service_type, ice_maker_brand, customers(archived_at))")
    .in("status", ["completed", "charged"])
    .eq("is_fee_charge", false)
    .gte("scheduled_date", from)
    .lte("scheduled_date", to);
  if (error) throw new Error(`daily posts job query failed: ${error.message}`);

  const { data: existing, error: exErr } = await db
    .from("content_drafts")
    .select("week_start, city_slug")
    .eq("kind", "gbp_daily_post")
    .gte("week_start", from)
    .lte("week_start", to);
  if (exErr) throw new Error(`daily posts lookup failed: ${exErr.message}`);
  const done = new Set(((existing ?? []) as { week_start: string; city_slug: string }[]).map((r) => `${r.week_start}|${r.city_slug}`));

  const todo = groupByDayCity((data ?? []) as unknown as Row[]).filter((f) => !done.has(`${f.date}|${f.slug}`));
  const client = new Anthropic({ apiKey });
  let queued = 0;
  for (const f of todo) {
    const body = await postText(client, f);
    const { error: insErr } = await db.from("content_drafts").insert({
      week_start: f.date,
      kind: "gbp_daily_post",
      city_slug: f.slug,
      title: f.name,
      body,
      cities: [f.name],
      source_job_count: f.count,
      status: "scheduled",
      scheduled_for: today,
    });
    if (insErr && insErr.code !== "23505") throw new Error(`daily post insert failed for ${f.name}: ${insErr.message}`);
    if (!insErr) queued++;
  }
  console.log("daily-city-posts: complete", { from, to, queued });
  return { status: "ok", queued };
}
