// The ONLY sanctioned way to touch a tenant table with the service-role
// client. The service role bypasses RLS, so on these paths the business
// filter is the code's job — this wrapper makes it impossible to forget:
//   db.from(t).select(...)  -> ... .eq("business_id", businessId)
//   db.from(t).update(...)  -> ... .eq("business_id", businessId)
//   db.from(t).delete()     -> ... .eq("business_id", businessId)
//   db.from(t).insert(rows) -> rows stamped with business_id
// upsert is deliberately NOT offered: ON CONFLICT DO UPDATE would match a row
// by its globally unique id regardless of business and could re-tag another
// business's row. Use insert, or update (which is business-filtered).
//   db.rpc(fn, args)        -> args + p_business_id
// Call sites read exactly like plain supabase-js (db.from("jobs").select(...)),
// and each method keeps supabase-js's own generic signature, so row types are
// still inferred from the column string at the call site.
//
// scripts/check-tenant-scoping.mjs (mirrors uinta-field-app's .ts guard) fails the push if a file reaches a tenant
// table through a raw createAdminClient() instead (unless the line carries an
// explicit `tenant-scope:` justification, e.g. looking a job up by its unique
// id to discover which business it belongs to).
//
// Embedded relations (select("..., property:properties(...)")) are safe:
// migration 005's composite FKs guarantee every related row shares the
// parent's business_id.
//
// Relative import: bundled into the Netlify scheduled functions.
import { createAdminClient } from "../supabase/admin";

export const TENANT_TABLES = [
  "app_users",
  "arrival_blocks",
  "blackout_dates",
  "cluster_suggestion_jobs",
  "cluster_suggestions",
  "contact_submissions",
  "customers",
  "expenses",
  "job_notes",
  "job_photos",
  "jobs",
  "payments",
  "properties",
  "referral_partners",
  "settings",
] as const;
export type TenantTable = (typeof TENANT_TABLES)[number];

type Row = Record<string, unknown>;
type AdminClient = ReturnType<typeof createAdminClient>;
type QueryBuilder = ReturnType<AdminClient["from"]>;

function stamp<T>(rows: T, businessId: string): T {
  const one = (r: Row) => {
    if (r.business_id !== undefined && r.business_id !== businessId) {
      throw new Error(`scopedAdmin: row carries business_id ${String(r.business_id)}, expected ${businessId}`);
    }
    return { ...r, business_id: businessId };
  };
  return (Array.isArray(rows) ? rows.map((r) => one(r as Row)) : one(rows as Row)) as T;
}

// A table handle whose methods carry supabase-js's exact types but always
// apply the business scope. The casts are type-preserving: each wrapper
// forwards to the real method and only ever adds a filter/stamp.
type ScopedTable = Pick<QueryBuilder, "select" | "insert" | "update" | "delete">;

function scopedTable(db: AdminClient, table: TenantTable, businessId: string): ScopedTable {
  const qb = db.from(table);
  const select = ((...args: any[]) =>
    (qb.select as any)(...args).eq("business_id", businessId)) as QueryBuilder["select"];
  const insert = ((values: any, options?: any) =>
    (qb.insert as any)(stamp(values, businessId), options)) as QueryBuilder["insert"];
  const update = ((values: any, options?: any) => {
    if (values && typeof values === "object" && "business_id" in values) {
      throw new Error("scopedAdmin: business_id is immutable");
    }
    return (qb.update as any)(values, options).eq("business_id", businessId);
  }) as QueryBuilder["update"];
  const del = ((options?: any) =>
    (qb.delete as any)(options).eq("business_id", businessId)) as QueryBuilder["delete"];
  return { select, insert, update, delete: del };
}

export function scopedAdmin(businessId: string) {
  if (!businessId) throw new Error("scopedAdmin: businessId is required");
  const db = createAdminClient();
  return {
    businessId,
    from(table: TenantTable): ScopedTable {
      return scopedTable(db, table, businessId);
    },
    rpc(fn: "get_available_slots" | "next_receipt_number", args: Row = {}) {
      // The scope always wins: a p_business_id in the caller's args is a bug
      // (it would silently run the RPC as another business), so refuse it.
      if ("p_business_id" in args) throw new Error("scopedAdmin: p_business_id is set by the scope, not the caller");
      return db.rpc(fn, { ...args, p_business_id: businessId });
    },
    // Stateless helpers that read no tenant rows.
    rpcGlobal(fn: "haversine_miles", args: Row) {
      return db.rpc(fn, args);
    },
    // Storage isn't business-partitioned by the client; callers only ever
    // pass object paths read from this business's own (scoped) job_photos
    // rows. The storage RLS policies enforce the business for session users.
    storage: db.storage,
  };
}

export type ScopedAdmin = ReturnType<typeof scopedAdmin>;

// Discover which business a job belongs to from its unique id — the entry
// point for job-keyed service-role paths (charge, webhook, emails) that
// arrive with only a job id. Everything after this goes through scopedAdmin.
export async function businessIdForJob(jobId: string): Promise<string | null> {
  const { data } = await createAdminClient()
    .from("jobs") // tenant-scope: lookup by unique id to learn the business
    .select("business_id")
    .eq("id", jobId)
    .maybeSingle();
  return (data?.business_id as string | undefined) ?? null;
}
