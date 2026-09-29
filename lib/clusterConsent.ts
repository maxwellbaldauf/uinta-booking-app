import { businessDb } from "@/lib/tenant/business";

export type ClusterConsentStatus =
  | "not_required"
  | "pending"
  | "accepted"
  | "declined"
  | "expired"
  | "unavailable";

export type ClusterConsent = {
  id: string;
  clusterSuggestionId: string;
  // day_sequence's proposed target routinely belongs to ANOTHER mover in
  // the same group (a same-day swap/rotation) rather than a genuinely-free
  // block, unlike geo_cluster — actions.ts branches on this to hand off to
  // resolvePendingDaySequenceMoves instead of the plain
  // slotStillAvailable-then-apply path. See that function's header comment
  // for the full design.
  kind: "geo_cluster" | "day_sequence";
  jobId: string;
  jobStatus: string;
  jobCurrentScheduledDate: string;
  jobCurrentArrivalBlock: number;
  latitude: number | null;
  longitude: number | null;
  address: string;
  customerName: string | null;
  originalDate: string;
  originalArrivalBlock: number;
  proposedDate: string;
  proposedArrivalBlock: number;
  blocksNeeded: number;
  deadline: string | null;
  status: ClusterConsentStatus;
};

type PropRow = {
  address: string;
  latitude: number | null;
  longitude: number | null;
  customer: { full_name: string | null } | { full_name: string | null }[] | null;
};
type JobRow = {
  status: string;
  scheduled_date: string;
  arrival_block: number;
  blocks_needed: number;
  property: PropRow | PropRow[] | null;
};
type SuggestionRow = { kind: "geo_cluster" | "day_sequence" };
type Row = {
  id: string;
  cluster_suggestion_id: string;
  job_id: string;
  consent_status: ClusterConsentStatus;
  consent_deadline: string | null;
  original_scheduled_date: string;
  original_arrival_block: number;
  proposed_scheduled_date: string;
  proposed_arrival_block: number;
  job: JobRow | JobRow[] | null;
  cluster_suggestion: SuggestionRow | SuggestionRow[] | null;
};

function flatten<T>(v: T | T[] | null | undefined): T | null {
  return Array.isArray(v) ? (v[0] ?? null) : (v ?? null);
}

// Look up a clustering consent request by its dedicated token — deliberately
// separate from jobs.access_token (see supabase/cluster-suggestion-jobs.sql's
// header comment: expiry semantics differ per proposal). A deadline that has
// already passed is treated as not-found here, the same way lib/visit.ts
// treats an expired job token — the actual DB transition to 'expired' is
// owned by uinta-field-app's nightly sweep (Phase 0), not this lookup, so
// this just stops the portal from rendering as still-actionable in the
// brief window before the next sweep run catches up.
export async function getClusterConsentByToken(token: string): Promise<ClusterConsent | null> {
  if (!token) return null;

  const supabase = businessDb();
  const { data, error } = await supabase
    .from("cluster_suggestion_jobs")
    .select(
      "id, cluster_suggestion_id, job_id, consent_status, consent_deadline, original_scheduled_date, original_arrival_block, " +
        "proposed_scheduled_date, proposed_arrival_block, " +
        "job:jobs(status, scheduled_date, arrival_block, blocks_needed, property:properties(address, latitude, longitude, customer:customers(full_name))), " +
        "cluster_suggestion:cluster_suggestions(kind)"
    )
    .eq("consent_token", token)
    .maybeSingle();

  if (error || !data) return null;
  const row = data as unknown as Row;

  if (row.consent_deadline && new Date(row.consent_deadline).getTime() < Date.now()) return null;

  const job = flatten(row.job);
  const property = flatten(job?.property);
  const customer = flatten(property?.customer);
  const suggestion = flatten(row.cluster_suggestion);

  return {
    id: row.id,
    clusterSuggestionId: row.cluster_suggestion_id,
    kind: suggestion?.kind ?? "geo_cluster",
    jobId: row.job_id,
    jobStatus: job?.status ?? "",
    jobCurrentScheduledDate: job?.scheduled_date ?? "",
    jobCurrentArrivalBlock: job?.arrival_block ?? 0,
    latitude: property?.latitude ?? null,
    longitude: property?.longitude ?? null,
    address: property?.address ?? "",
    customerName: customer?.full_name ?? null,
    originalDate: row.original_scheduled_date,
    originalArrivalBlock: row.original_arrival_block,
    proposedDate: row.proposed_scheduled_date,
    proposedArrivalBlock: row.proposed_arrival_block,
    blocksNeeded: job?.blocks_needed ?? 1,
    deadline: row.consent_deadline,
    status: row.consent_status,
  };
}
