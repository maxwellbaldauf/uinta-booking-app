// Applies day_sequence moves once they become safe to apply.
//
// Unlike geo_cluster (whose movers only ever target a block that's
// genuinely free right now, by construction — see uinta-field-app's
// tryCrossDayMove/tryExtendGroup), a day_sequence rotation routinely
// proposes a mover's target block that's currently held by ANOTHER mover
// in the SAME group (a same-day swap/rotation of already-fully-booked
// blocks). acceptClusterSuggestion can't apply a move like that
// immediately without double-booking whoever hasn't vacated yet, so for a
// day_sequence row it just records consent_status='accepted' (applied_at
// stays null) and calls this resolver, which is the only thing that
// actually decides when it's safe to write jobs.scheduled_date/
// arrival_block for a day_sequence mover.
//
// Two kinds of dependency structure show up among a group's still-
// unapplied movers, both handled by the same loop below without needing
// to tell them apart up front:
//   - a CHAIN (A's target is free, B's target is A's current block, C's
//     target is B's current block, ...) resolves one link at a time: A
//     applies immediately (nothing blocks it), which frees A's old block
//     for B, and so on. If a link declines, the chain breaks there —
//     everyone up to that link still applies; everyone after it stays
//     stuck, waiting on a slot that will now never open up.
//   - a CYCLE (A's target is B's current block AND B's target is A's
//     current block, or a longer loop of the same shape) has no free end
//     to bootstrap from — the loop below detects it once the chain-style
//     pass makes no more progress, and applies every member together, but
//     ONLY once every member of that specific cycle has accepted. If even
//     one member of a cycle declines or expires, the whole cycle stays
//     inert forever (a real, valid, non-optimal state — not an error).
//
// Called from three places: right after acceptClusterSuggestion and
// declineClusterSuggestion each record their own response (best-effort,
// resolves the common case instantly, in-process), and from
// POST /api/internal/resolve-day-sequence (called by uinta-field-app's
// nightly sweep as a safety net, in case an accept/decline's own call
// above didn't run to completion — e.g. a crash mid-request).
import { businessDb } from "@/lib/tenant/business";
import { sendBookingConfirmationEmail } from "@/lib/email/bookingConfirmation";

type Row = {
  id: string;
  job_id: string;
  is_anchor: boolean;
  proposed_scheduled_date: string;
  proposed_arrival_block: number;
  consent_status: string;
  applied_at: string | null;
};

type LiveJob = {
  id: string;
  status: string;
  scheduled_date: string;
  arrival_block: number;
  blocks_needed: number;
};

function rangesOverlap(startA: number, lenA: number, startB: number, lenB: number): boolean {
  return startA <= startB + lenB - 1 && startA + lenA - 1 >= startB;
}

// isTargetFree only ever sees this suggestion's own frozen job set (jobById,
// loaded once at the top of resolvePendingDaySequenceMoves) — it's blind to
// anyone outside the group who has since taken the target block (a self-serve
// booking, a manual field-app entry, an unrelated suggestion). A group member
// currently sitting in the target is expected (that's the swap/rotation this
// function exists to apply); only an outsider should block the move. Checked
// live, immediately before each write, so the window between "this suggestion
// was generated" and "the customer actually consented" — which can be
// unbounded, since a day_sequence proposal's consent_deadline is only set
// when the target day is within 36 hours — can't leave a stale slot behind.
async function targetBlockedByThirdParty(
  supabase: ReturnType<typeof businessDb>,
  proposedDate: string,
  proposedBlock: number,
  blocksNeeded: number,
  groupJobIds: Set<string>
): Promise<boolean> {
  const { data: live } = await supabase
    .from("jobs")
    .select("id, arrival_block, blocks_needed")
    .eq("scheduled_date", proposedDate)
    .eq("status", "scheduled");
  return (live ?? []).some(
    (j) => !groupJobIds.has(j.id) && rangesOverlap(j.arrival_block, j.blocks_needed, proposedBlock, blocksNeeded)
  );
}

// This can be invoked concurrently for the same clusterSuggestionId — once
// from acceptClusterSuggestion/declineClusterSuggestion's own best-effort
// cascade, and possibly again moments later from the nightly-sweep backstop
// before the first call finishes. Rather than a separate "claim" flag (which
// could desync from whether the move actually landed if the write after it
// failed), the jobs UPDATE itself is the atomic claim: it's conditioned on
// the block this row was last observed at, so only whichever concurrent
// call's write actually lands first affects a row — a losing concurrent
// call's identical update matches zero rows and comes back empty, so it
// skips stamping applied_at and skips sending a second confirmation email,
// rather than double-applying.
async function applyMove(
  supabase: ReturnType<typeof businessDb>,
  row: Row,
  expectedCurrentBlock: number
): Promise<boolean> {
  const { data: updated, error } = await supabase
    .from("jobs")
    .update({ arrival_block: row.proposed_arrival_block })
    .eq("id", row.job_id)
    .eq("arrival_block", expectedCurrentBlock)
    .select("id")
    .maybeSingle();
  if (error) {
    console.error("resolvePendingDaySequenceMoves: jobs update failed", error, { jobId: row.job_id });
    return false; // leave applied_at null — retried on a later call
  }
  if (!updated) return false; // lost the race to a concurrent call, or the job moved for some other reason since jobById was loaded

  await supabase
    .from("cluster_suggestion_jobs")
    .update({ applied_at: new Date().toISOString() })
    .eq("id", row.id);
  await sendBookingConfirmationEmail(row.job_id, { variant: "cluster_matched" });
  return true;
}

// TRUE cycles only, among rows already known to all belong to the same
// cluster_suggestion_id — a chain that dead-ends (its target is free, or
// its target's occupant already resolved to "not a cycle") is deliberately
// NOT returned here; pass 1 above already drains every resolvable chain, so
// anything left over that ISN'T a true cycle should stay untouched, not get
// swept up as a false "cycle of one."
//
// `rows` is every still-unapplied MOVER regardless of consent_status (not
// just the currently-accepted ones) — a not-yet-responded or declined
// sibling still has to be walkable as an edge, or a mover blocked by exactly
// that sibling looks like a dead end with nothing to wait on.
//
// This is a standard functional-graph cycle search (each node has AT MOST
// one outgoing edge — whoever occupies its own proposed target): walk
// forward from an unresolved node, tracking ONLY the current path's own
// node->index map. Looping back to a node already in THIS path means
// everything from that node onward is a genuine cycle (anything walked
// before it is a tail feeding INTO the cycle, not part of it). Landing on
// undefined (no occupant) or on a node some EARLIER, unrelated traversal
// already resolved means the whole path is a chain, not a new cycle —
// crucially, that "already resolved" check has to be a per-node classification
// (chain vs. cycle-member), not a plain "have we visited this node at all"
// set: an earlier traversal starting at a dead-end node (like a decliner
// whose own target happens to be free) must not make that node artificially
// unreachable to a LATER traversal that depends on walking through it — that
// was exactly the bug in this function's first draft, caught by
// scripts/test-day-sequencing-finish.ts's far-job assertion actually failing
// against a live run (it looked like the far mover was an isolated cycle of
// one and got applied straight into the declining near mover's still-occupied
// block).
function findCycles(rows: Row[], jobById: Map<string, LiveJob>): Row[][] {
  // Range-overlap, not an exact single-block key match — a commercial
  // (blocks_needed > 1) job occupies MULTIPLE blocks, and another mover's
  // target could land on its second block without matching its start
  // block. isTargetFree (pass 1, above) already checks this correctly via
  // rangesOverlap; this has to match it, or a mover blocked by exactly a
  // multi-block job's non-start block would look like a dead end here
  // (never resolves, even once everyone's actually agreed) instead of the
  // cycle it actually is. n is at most ~7 (one business day's worth of
  // blocks), so the plain O(n^2) scan costs nothing.
  const successorOf = (row: Row): Row | undefined => {
    const selfBlocksNeeded = jobById.get(row.job_id)?.blocks_needed ?? 1;
    for (const other of rows) {
      if (other.id === row.id) continue;
      const job = jobById.get(other.job_id);
      if (!job) continue;
      if (job.scheduled_date !== row.proposed_scheduled_date) continue;
      if (rangesOverlap(job.arrival_block, job.blocks_needed, row.proposed_arrival_block, selfBlocksNeeded)) {
        return other;
      }
    }
    return undefined;
  };

  const resolved = new Set<string>(); // every node classified so far, cycle or chain
  const cycles: Row[][] = [];

  for (const start of rows) {
    if (resolved.has(start.id)) continue;

    const path: Row[] = [];
    const indexInPath = new Map<string, number>();
    let current: Row | undefined = start;
    while (current && !resolved.has(current.id) && !indexInPath.has(current.id)) {
      indexInPath.set(current.id, path.length);
      path.push(current);
      current = successorOf(current);
    }

    if (current && indexInPath.has(current.id)) {
      const cycleStart = indexInPath.get(current.id)!;
      const cycleMembers = path.slice(cycleStart);
      for (const m of cycleMembers) resolved.add(m.id);
      for (const m of path.slice(0, cycleStart)) resolved.add(m.id); // tail feeding in, not itself a cycle
      cycles.push(cycleMembers);
    } else {
      for (const m of path) resolved.add(m.id); // dead end, or ran into an already-classified node — chain either way
    }
  }

  return cycles;
}

export async function resolvePendingDaySequenceMoves(clusterSuggestionId: string): Promise<void> {
  const supabase = businessDb();

  const { data: rows } = await supabase
    .from("cluster_suggestion_jobs")
    .select("id, job_id, is_anchor, proposed_scheduled_date, proposed_arrival_block, consent_status, applied_at")
    .eq("cluster_suggestion_id", clusterSuggestionId);
  if (!rows) return;

  // Two different sets, and the distinction is load-bearing: `movers` is
  // every not-yet-applied mover REGARDLESS of consent_status, needed so
  // groupByCycle's occupancy graph can see a sibling who hasn't responded
  // yet or who declined — leaving one out of the graph is what makes a
  // mover blocked by that exact sibling look like a false "cycle of one"
  // with nothing to wait on. `accepted` is the much smaller set we're
  // actually allowed to write moves for.
  const movers = (rows as Row[]).filter((r) => !r.is_anchor && !r.applied_at);
  const accepted = new Set(movers.filter((r) => r.consent_status === "accepted").map((r) => r.id));
  if (accepted.size === 0) return;
  const pending = movers.filter((r) => accepted.has(r.id));

  const jobIds = (rows as Row[]).map((r) => r.job_id);
  const groupJobIds = new Set(jobIds);
  const { data: jobsNow } = await supabase
    .from("jobs")
    .select("id, status, scheduled_date, arrival_block, blocks_needed")
    .in("id", jobIds);
  const jobById = new Map<string, LiveJob>((jobsNow ?? []).map((j) => [j.id, j as LiveJob]));

  function isTargetFree(row: Row): boolean {
    const selfBlocksNeeded = jobById.get(row.job_id)?.blocks_needed ?? 1;
    for (const other of jobById.values()) {
      if (other.id === row.job_id) continue;
      if (other.status !== "scheduled") continue;
      if (other.scheduled_date !== row.proposed_scheduled_date) continue;
      if (rangesOverlap(other.arrival_block, other.blocks_needed, row.proposed_arrival_block, selfBlocksNeeded)) {
        return false;
      }
    }
    return true;
  }

  let progress = true;
  while (progress) {
    progress = false;

    for (const row of pending) {
      if (row.applied_at) continue;
      if (!isTargetFree(row)) continue;
      const selfBlocksNeeded = jobById.get(row.job_id)?.blocks_needed ?? 1;
      if (
        await targetBlockedByThirdParty(
          supabase,
          row.proposed_scheduled_date,
          row.proposed_arrival_block,
          selfBlocksNeeded,
          groupJobIds
        )
      )
        continue;
      const expectedBlock = jobById.get(row.job_id)?.arrival_block;
      if (expectedBlock == null || !(await applyMove(supabase, row, expectedBlock))) continue;
      row.applied_at = new Date().toISOString();
      const job = jobById.get(row.job_id);
      if (job) {
        job.scheduled_date = row.proposed_scheduled_date;
        job.arrival_block = row.proposed_arrival_block;
      }
      progress = true;
    }

    // findCycles needs every still-unapplied MOVER, not just the ones we're
    // currently allowed to apply — a still-'pending' or 'declined' sibling
    // has to be walkable in the occupancy graph, or a mover blocked by
    // exactly that sibling looks like a dead end with nothing to wait on
    // and gets misapplied into a slot it still physically occupies (see
    // findCycles' header comment).
    const stillUnapplied = movers.filter((r) => !r.applied_at);
    if (stillUnapplied.length === 0) break;

    for (const group of findCycles(stillUnapplied, jobById)) {
      if (group.some((r) => r.consent_status !== "accepted")) continue; // waiting on a pending response, or permanently blocked by a decline/expiry
      let allApplied = true;
      for (const row of group) {
        const selfBlocksNeeded = jobById.get(row.job_id)?.blocks_needed ?? 1;
        if (
          await targetBlockedByThirdParty(
            supabase,
            row.proposed_scheduled_date,
            row.proposed_arrival_block,
            selfBlocksNeeded,
            groupJobIds
          )
        ) {
          allApplied = false;
          continue;
        }
        const expectedBlock = jobById.get(row.job_id)?.arrival_block;
        if (expectedBlock == null || !(await applyMove(supabase, row, expectedBlock))) {
          allApplied = false;
          continue;
        }
        row.applied_at = new Date().toISOString();
        const job = jobById.get(row.job_id);
        if (job) {
          job.scheduled_date = row.proposed_scheduled_date;
          job.arrival_block = row.proposed_arrival_block;
        }
      }
      if (allApplied) progress = true;
    }
  }
}
