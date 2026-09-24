// Plain lookup of scheduled jobs (with their property's coordinates) inside
// a date window — deliberately NOT geography-filtered, same reasoning as
// uinta-field-app's own copy of this file (separate repo, not shared code).
// Used by lib/scheduling.ts's driving-time reranking of the booking /
// reschedule slot picker.
import { createAdminClient } from "@/lib/supabase/admin";

export type NearbyJob = {
  jobId: string;
  propertyId: string;
  lat: number;
  lng: number;
  scheduledDate: string;
  arrivalBlock: number;
  blocksNeeded: number;
};

type Row = {
  id: string;
  property_id: string;
  scheduled_date: string;
  arrival_block: number;
  blocks_needed: number;
  property: { latitude: number | null; longitude: number | null } | { latitude: number | null; longitude: number | null }[] | null;
};

function flatten<T>(v: T | T[] | null | undefined): T | null {
  return Array.isArray(v) ? (v[0] ?? null) : (v ?? null);
}

export async function fetchNearbyScheduledJobs(opts: {
  fromDate: string; // inclusive, "YYYY-MM-DD"
  toDate: string; // inclusive, "YYYY-MM-DD"
  excludeJobId?: string;
  signal?: AbortSignal;
}): Promise<NearbyJob[]> {
  const supabase = createAdminClient();
  let query = supabase
    .from("jobs")
    .select(
      "id, property_id, scheduled_date, arrival_block, blocks_needed, property:properties(latitude, longitude)"
    )
    .eq("status", "scheduled")
    .gte("scheduled_date", opts.fromDate)
    .lte("scheduled_date", opts.toDate);

  if (opts.excludeJobId) {
    query = query.neq("id", opts.excludeJobId);
  }
  if (opts.signal) {
    query = query.abortSignal(opts.signal);
  }

  const { data, error } = await query;
  if (error) {
    console.error("fetchNearbyScheduledJobs: query failed", error);
    return [];
  }

  const jobs: NearbyJob[] = [];
  for (const row of (data ?? []) as Row[]) {
    const property = flatten(row.property);
    if (!property || property.latitude == null || property.longitude == null) continue;
    jobs.push({
      jobId: row.id,
      propertyId: row.property_id,
      lat: property.latitude,
      lng: property.longitude,
      scheduledDate: row.scheduled_date,
      arrivalBlock: row.arrival_block,
      blocksNeeded: row.blocks_needed,
    });
  }
  return jobs;
}
