// Data layer for /service-areas/[city]. A city page exists ONLY if it is
// backed by real data:
//   - at least MIN_JOBS_TO_PUBLISH real completed jobs in that city, or
//   - a hand-written `intro` in content/city-pages.ts for a city we serve.
// Anything else returns null and the route 404s — no thin pages.
//
// "Real completed job" = status completed|charged, not a fee-only charge,
// residential, customer not archived, with a scheduled date at least
// HOLD_BACK_DAYS old (the job has to be done before it is listed).
// Both live and backlog jobs count. Public output is city + month + machine
// label only — never names, addresses, prices or ids.
import { unstable_cache } from "next/cache";
import { businessDb } from "@/lib/tenant/business";
import { SERVICE_CITIES } from "@/lib/site";
import { CITY_CONTENT, type CityContent } from "@/content/city-pages";
import { citySlug, machineLabel, monthLabel } from "./cityFacts";

export const MIN_JOBS_TO_PUBLISH = 1;
const RECENT_JOBS_SHOWN = 8;
const HOLD_BACK_DAYS = 1;

export type CityJob = { month: string; machine: string };

export type CityPage = {
  slug: string;
  name: string;
  jobCount: number;
  firstMonth: string | null;
  recentJobs: CityJob[];
  content: CityContent | null;
  // ISO date of the newest real job or content edit, for dateModified/sitemap.
  lastModified: string | null;
};

type Row = {
  scheduled_date: string | null;
  property: {
    city: string | null;
    service_type: string;
    ice_maker_brand: string | null;
    customers: { archived_at: string | null } | null;
  } | null;
};

async function loadRows(): Promise<Row[]> {
  const db = businessDb();
  const out: Row[] = [];
  for (let from = 0; ; from += 1000) {
    const { data, error } = await db
      .from("jobs")
      .select(
        "scheduled_date, property:properties!inner(city, service_type, ice_maker_brand, customers(archived_at))"
      )
      .in("status", ["completed", "charged"])
      .eq("is_fee_charge", false)
      .order("id", { ascending: true }) // stable paging across range() calls
      .range(from, from + 999);
    if (error) throw new Error(`city pages query failed: ${error.message}`);
    const page = (data ?? []) as unknown as Row[];
    out.push(...page);
    if (page.length < 1000) break;
  }
  return out;
}

async function buildPages(): Promise<CityPage[]> {
  const cutoff = new Date(Date.now() - HOLD_BACK_DAYS * 86_400_000)
    .toISOString()
    .slice(0, 10);
  const rows = await loadRows();

  const canonical = new Map(SERVICE_CITIES.map((c) => [citySlug(c), c]));
  const byCity = new Map<string, { name: string; jobs: { date: string; machine: string }[] }>();

  for (const r of rows) {
    const p = r.property;
    if (!p || !p.city || p.service_type !== "residential") continue;
    if (p.customers?.archived_at) continue;
    if (!r.scheduled_date || r.scheduled_date > cutoff) continue;
    const slug = citySlug(p.city);
    if (!slug) continue;
    const entry = byCity.get(slug) ?? { name: canonical.get(slug) ?? p.city.trim(), jobs: [] };
    entry.jobs.push({ date: r.scheduled_date, machine: machineLabel(p.ice_maker_brand) });
    byCity.set(slug, entry);
  }

  const pages: CityPage[] = [];
  const slugs = new Set<string>(byCity.keys());
  for (const [slug, c] of Object.entries(CITY_CONTENT)) {
    if (c.intro?.trim() && canonical.has(slug)) slugs.add(slug);
  }

  for (const slug of slugs) {
    const entry = byCity.get(slug);
    const content = CITY_CONTENT[slug] ?? null;
    const jobs = (entry?.jobs ?? []).sort((a, b) => (a.date < b.date ? 1 : -1));
    const hasContent = Boolean(content?.intro?.trim()) && canonical.has(slug);
    if (jobs.length < MIN_JOBS_TO_PUBLISH && !hasContent) continue;
    const dates = [jobs[0]?.date, content?.updated].filter(Boolean) as string[];
    pages.push({
      slug,
      name: entry?.name ?? canonical.get(slug)!,
      jobCount: jobs.length,
      firstMonth: jobs.length ? monthLabel(jobs[jobs.length - 1].date) : null,
      recentJobs: jobs.slice(0, RECENT_JOBS_SHOWN).map((j) => ({
        month: monthLabel(j.date),
        machine: j.machine,
      })),
      content,
      lastModified: dates.sort().pop() ?? null,
    });
  }
  return pages.sort((a, b) => a.name.localeCompare(b.name));
}

export const getPublishedCityPages = unstable_cache(buildPages, ["city-pages-v1"], {
  revalidate: 3600,
  tags: ["city-pages"],
});

export async function getCityPage(slug: string): Promise<CityPage | null> {
  if (!/^[a-z0-9-]{1,60}$/.test(slug)) return null;
  return (await getPublishedCityPages()).find((p) => p.slug === slug) ?? null;
}
