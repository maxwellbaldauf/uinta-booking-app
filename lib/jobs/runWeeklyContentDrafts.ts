// Weekly content drafts — called from netlify/functions/weekly-content-drafts.mts.
// Reads LAST week's real completed jobs and PUBLISHES a short local blog post:
// the row is saved to content_drafts (migration 036, owned by uinta-field-app) as
// status 'posted' and appears at /blog within the hour (lib/blogPosts.ts). One per
// week, never overwritten. (Google Business Profile posts are made daily, per city,
// by lib/jobs/runDailyCityPosts.ts.)
//
// Relative imports only (the function bundle doesn't resolve "@/" aliases).
import Anthropic from "@anthropic-ai/sdk";
import { businessDb, businessTz } from "../tenant/business";
import { todayISODate, addDaysToISODate } from "../time/zone";
import { citySlug, machineLabel, monthLabel } from "../cityFacts";

const MODEL = "claude-sonnet-5-5";
const SITE = "https://uintaice.com";

type Row = {
  scheduled_date: string | null;
  property: {
    city: string | null;
    service_type: string;
    ice_maker_brand: string | null;
    customers: { archived_at: string | null } | null;
  } | null;
};

export type WeeklyFacts = {
  weekStart: string;
  weekEnd: string;
  jobCount: number;
  cities: { name: string; slug: string; count: number; machines: string[] }[];
};

// Monday..Sunday of the most recent fully finished week, in the business's tz.
export function lastWeekRange(today: string): { start: string; end: string } {
  const dow = new Date(`${today}T00:00:00Z`).getUTCDay(); // 0 = Sunday
  const thisMonday = addDaysToISODate(today, -((dow + 6) % 7));
  return { start: addDaysToISODate(thisMonday, -7), end: addDaysToISODate(thisMonday, -1) };
}

export async function loadWeeklyFacts(start: string, end: string): Promise<WeeklyFacts> {
  const { data, error } = await businessDb()
    .from("jobs")
    .select(
      "scheduled_date, property:properties!inner(city, service_type, ice_maker_brand, customers(archived_at))"
    )
    .in("status", ["completed", "charged"])
    .eq("is_fee_charge", false)
    .gte("scheduled_date", start)
    .lte("scheduled_date", end);
  if (error) throw new Error(`weekly drafts query failed: ${error.message}`);

  const byCity = new Map<string, { name: string; count: number; machines: Set<string> }>();
  let jobCount = 0;
  for (const r of (data ?? []) as unknown as Row[]) {
    const p = r.property;
    if (!p?.city || p.service_type !== "residential" || p.customers?.archived_at) continue;
    const slug = citySlug(p.city);
    if (!slug) continue;
    const e = byCity.get(slug) ?? { name: p.city.trim(), count: 0, machines: new Set<string>() };
    e.count++;
    e.machines.add(machineLabel(p.ice_maker_brand));
    byCity.set(slug, e);
    jobCount++;
  }
  return {
    weekStart: start,
    weekEnd: end,
    jobCount,
    cities: [...byCity.entries()]
      .map(([slug, e]) => ({ name: e.name, slug, count: e.count, machines: [...e.machines] }))
      .sort((a, b) => b.count - a.count || a.name.localeCompare(b.name)),
  };
}

const RULES = `Write for Uinta Ice Co., a residential ice machine cleaning service based in Lehi, Utah that travels to customers' homes.
Use ONLY the facts provided below. Do not invent anything: no customer names or stories, no street addresses, no prices, no reviews or ratings, no quotes, no statistics, no results or claims about how machines performed, no promotions, no claim of an office or storefront anywhere. Do not name individual customers or describe any specific home.
Tone: plain, understated, local. No emojis, no hashtags, no exclamation marks, no marketing hype.
Do not add benefits, process details, counties, or any statement that is not directly in the facts. Mention the cities and months/machines only as given. Say "based in Lehi" if you mention where we're based.`;

function factsBlock(f: WeeklyFacts): string {
  const lines = f.cities.map(
    (c) =>
      `- ${c.name}: ${c.count} ${c.count === 1 ? "cleaning" : "cleanings"} (${c.machines.join(", ")})`
  );
  return `Week of ${longDate(f.weekStart)} (${f.weekStart} to ${f.weekEnd}). ${f.jobCount} completed residential cleanings:\n${lines.join("\n")}\nBooking page: ${SITE}/book`;
}

function longDate(iso: string): string {
  const [y, , d] = iso.split("-").map(Number);
  return `${monthLabel(iso).split(" ")[0]} ${d}, ${y}`;
}

async function generate(client: Anthropic, prompt: string, maxTokens: number): Promise<string> {
  const res = await client.messages.create({
    model: MODEL,
    max_tokens: maxTokens,
    messages: [{ role: "user", content: prompt }],
  });
  const text = res.content
    .map((b) => (b.type === "text" ? b.text : ""))
    .join("")
    .trim();
  // Published unreviewed, so never publish a cut-off post.
  if (res.stop_reason !== "end_turn") throw new Error(`model stopped early (stop_reason: ${res.stop_reason})`);
  if (!text) throw new Error("empty model response");
  return text;
}

export async function runWeeklyContentDrafts(): Promise<{ status: string; weekStart?: string }> {
  const apiKey = process.env.ANTHROPIC_API_KEY;
  if (!apiKey) {
    console.error("weekly-content-drafts: ANTHROPIC_API_KEY is not set");
    return { status: "no-api-key" };
  }

  const { start, end } = lastWeekRange(todayISODate(await businessTz()));
  const db = businessDb();

  // Idempotent per (week_start, kind): never overwrite or duplicate a week.
  const { data: existing, error: exErr } = await db
    .from("content_drafts")
    .select("kind")
    .eq("week_start", start);
  if (exErr) throw new Error(`weekly drafts lookup failed: ${exErr.message}`);
  const have = new Set((existing ?? []).map((r: { kind: string }) => r.kind));
  if (have.has("blog_post")) return { status: "already-published", weekStart: start };

  const facts = await loadWeeklyFacts(start, end);
  if (facts.jobCount === 0) {
    console.log("weekly-content-drafts: no completed jobs last week; nothing drafted", { start, end });
    return { status: "no-jobs", weekStart: start };
  }

  const rows = await buildDraftRows(new Anthropic({ apiKey }), facts, have);
  const { error } = await db.from("content_drafts").insert(rows);
  if (error) throw new Error(`weekly drafts insert failed: ${error.message}`);
  console.log("weekly-content-drafts: published", { start, kinds: rows.map((r) => r.kind) });
  return { status: "published", weekStart: start };
}

// Generates the missing rows (no DB access), so the text can be previewed
// without writing anything.
export async function buildDraftRows(
  client: Anthropic,
  facts: WeeklyFacts,
  have: Set<string> = new Set()
): Promise<Record<string, unknown>[]> {
  const start = facts.weekStart;
  const cityNames = facts.cities.map((c) => c.name);
  const rows: Record<string, unknown>[] = [];

  if (!have.has("blog_post")) {
    const raw = await generate(
      client,
      `${RULES}\n\nTask: a short local blog post, 150-250 words, about the ice machine cleanings in the week given below, written for homeowners in those areas. It is published permanently, so refer to the week by its date ("the week of ..."), never "last week" or "this week". Do not mention these instructions or comment on what the post does or does not include. End with one sentence noting that homeowners in these areas can book a cleaning online. First line: the title only (no "Title:" prefix, no quotes), and it must include the week's date. Then a blank line, then the body in plain paragraphs. Output nothing else.\n\nFacts:\n${factsBlock(facts)}`,
      4000
    );
    const [title, ...rest] = raw.split("\n");
    rows.push({
      week_start: start,
      kind: "blog_post",
      title: title.replace(/^#+\s*/, "").slice(0, 200),
      body: rest.join("\n").trim() || raw,
      cities: cityNames,
      source_job_count: facts.jobCount,
      status: "posted",
      posted_at: new Date().toISOString(),
    });
  }

  return rows;
}
