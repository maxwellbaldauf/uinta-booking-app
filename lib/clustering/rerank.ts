// The TS refinement layer that upgrades get_available_slots' straight-line
// ranking to real driving time, for the LIVE customer-facing booking /
// reschedule slot picker (lib/scheduling.ts's getOfferedSlots, shared by
// both flows). get_available_slots itself (a Postgres function) can't call
// an external REST API, so it stays completely unchanged — this re-sorts
// its output afterward.
//
// Latency-critical: wrapped in a single ~2s AbortController budget covering
// the Route Matrix call(s) together. ANY failure — timeout, exhausted
// retries, missing config — returns the SQL's own order completely
// unchanged, so the customer is never blocked and never sees a degraded or
// erroring picker. No per-chunk haversine fallback here (unlike
// uinta-field-app's own copy of this file, used by paths with no live human
// watching a spinner): simplicity and speed matter more than trying harder
// when a fallback to today's exact behavior is already a perfectly fine
// outcome.
import { withRetry } from "@/lib/retry";
import { getDrivingDurations, isRetryableRouteMatrixError, type LatLng } from "@/lib/routeMatrix";
import type { NearbyJob } from "./nearbyJobs";

export type RawSlot = {
  slot_date: string;
  arrival_block: number;
  closest_miles: number | null;
  is_fallback: boolean;
};

const RERANK_TIMEOUT_MS = 2000;
const RETRY_ATTEMPTS = 2;
const RETRY_BACKOFF_MS = [150];

type DayBest = { seconds: number; arrivalBlock: number };

function locationKey(loc: LatLng): string {
  return `${loc.lat.toFixed(5)},${loc.lng.toFixed(5)}`;
}

function rejectOnAbort(signal: AbortSignal): Promise<never> {
  return new Promise((_, reject) => {
    signal.addEventListener("abort", () => reject(new Error("rerank timed out")));
  });
}

async function computeRerankedOrder(
  target: LatLng,
  sqlCandidates: RawSlot[],
  nearbyJobs: NearbyJob[],
  signal: AbortSignal
): Promise<RawSlot[]> {
  const byLocation = new Map<string, LatLng>();
  for (const job of nearbyJobs) {
    byLocation.set(locationKey(job), { lat: job.lat, lng: job.lng });
  }
  const locationKeys = Array.from(byLocation.keys());
  const locations = locationKeys.map((k) => byLocation.get(k)!);

  const driveSecondsByLocation = new Map<string, number>();
  for (let i = 0; i < locations.length; i += 25) {
    const chunkKeys = locationKeys.slice(i, i + 25);
    const chunk = locations.slice(i, i + 25);
    const durations = await withRetry(
      () => getDrivingDurations(target, chunk, { signal }),
      { attempts: RETRY_ATTEMPTS, backoffMs: RETRY_BACKOFF_MS, isRetryable: isRetryableRouteMatrixError }
    );
    for (let j = 0; j < chunk.length; j++) {
      const seconds = durations.get(j);
      if (seconds != null) driveSecondsByLocation.set(chunkKeys[j], seconds);
    }
  }

  const bestByDay = new Map<string, DayBest>();
  for (const job of nearbyJobs) {
    const seconds = driveSecondsByLocation.get(locationKey(job));
    if (seconds == null) continue;
    const current = bestByDay.get(job.scheduledDate);
    if (!current || seconds < current.seconds) {
      bestByDay.set(job.scheduledDate, { seconds, arrivalBlock: job.arrivalBlock });
    }
  }

  const withScores = sqlCandidates.map((c) => ({
    candidate: c,
    dayBest: bestByDay.get(c.slot_date) ?? null,
  }));

  withScores.sort((a, b) => {
    if (a.dayBest && b.dayBest) {
      if (a.dayBest.seconds !== b.dayBest.seconds) return a.dayBest.seconds - b.dayBest.seconds;
      const aDist = Math.abs(a.candidate.arrival_block - a.dayBest.arrivalBlock);
      const bDist = Math.abs(b.candidate.arrival_block - b.dayBest.arrivalBlock);
      if (aDist !== bDist) return aDist - bDist;
      return a.candidate.arrival_block - b.candidate.arrival_block;
    }
    if (a.dayBest) return -1;
    if (b.dayBest) return 1;
    return 0; // stable sort preserves the SQL's own order when neither day has a real-drive-time neighbor
  });

  return withScores.map((s) => s.candidate);
}

export async function rerankCandidatesByDrivingTime(
  target: LatLng,
  sqlCandidates: RawSlot[],
  nearbyJobs: NearbyJob[]
): Promise<RawSlot[]> {
  if (sqlCandidates.length === 0 || nearbyJobs.length === 0) return sqlCandidates;

  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), RERANK_TIMEOUT_MS);

  try {
    return await Promise.race([
      computeRerankedOrder(target, sqlCandidates, nearbyJobs, controller.signal),
      rejectOnAbort(controller.signal),
    ]);
  } catch (err) {
    console.error("rerankCandidatesByDrivingTime: falling back to the SQL's own order", err);
    return sqlCandidates;
  } finally {
    clearTimeout(timeout);
  }
}
