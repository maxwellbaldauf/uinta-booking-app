// A business can turn arrival windows off (arrival_blocks.enabled, toggled in
// the field app's Settings). The row and its label stay — ARRIVAL_BLOCKS /
// arrivalBlockLabel keep resolving for old jobs — but nothing NEW may be
// placed in a disabled block. get_available_slots applies the rule in SQL for
// every slot the public booking, portal and consent flows OFFER; this helper is
// for the one place that applies a pre-computed proposal without re-asking it
// (a stored day-sequence move).

type BlocksReader = {
  from(table: "arrival_blocks"): {
    select(cols: string): PromiseLike<{ data: { block_index: number; enabled: boolean }[] | null; error: { message: string } | null }>;
  };
};

export async function fetchEnabledBlockIndexes(db: BlocksReader): Promise<number[]> {
  const { data, error } = await db.from("arrival_blocks").select("block_index, enabled");
  if (error || !data) throw new Error(`Couldn't load arrival windows: ${error?.message ?? "no data"}`);
  return data.filter((r) => r.enabled).map((r) => r.block_index).sort((a, b) => a - b);
}

// True when every block in [start, start + span - 1] is enabled.
export function spanIsEnabled(enabled: readonly number[], start: number, span = 1): boolean {
  for (let b = start; b < start + span; b++) if (!enabled.includes(b)) return false;
  return true;
}
