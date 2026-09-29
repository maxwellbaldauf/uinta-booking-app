// Static guard for the multi-tenant boundary (mirrors uinta-field-app's
// scripts/check-tenant-scoping.ts). Every route here runs with the
// service-role key, which bypasses RLS — so tenant tables must be reached
// through businessDb() (lib/tenant/business.ts), never a raw
// createAdminClient(). Fails if a file imports createAdminClient and touches
// a tenant table / business-scoped RPC on a line without a `tenant-scope:`
// justification.
//
//   node scripts/check-tenant-scoping.mjs      (run by .githooks/pre-push)
import { readdirSync, readFileSync, statSync } from "node:fs";
import path from "node:path";

const TENANT_TABLES = [
  "app_users", "arrival_blocks", "blackout_dates", "cluster_suggestion_jobs",
  "cluster_suggestions", "contact_submissions", "customers", "expenses",
  "job_notes", "job_photos", "jobs", "payments", "properties",
  "referral_partners", "settings",
];
const ROOTS = ["app", "lib", "netlify", "components"];
const EXEMPT = new Set([path.join("lib", "tenant", "scoped.ts"), path.join("lib", "supabase", "admin.ts")]);

function walk(dir, out) {
  for (const name of readdirSync(dir)) {
    const p = path.join(dir, name);
    if (name === "node_modules" || name.startsWith(".")) continue;
    if (statSync(p).isDirectory()) walk(p, out);
    else if (/\.(ts|tsx|mts)$/.test(name)) out.push(p);
  }
}
const files = [];
for (const r of ROOTS) walk(r, files);

const tableRe = new RegExp(`\.from\(\s*"(${TENANT_TABLES.join("|")})"\s*\)`);
const rpcRe = /\.rpc\(\s*"(get_available_slots|next_receipt_number)"/;
const violations = [];
for (const f of files) {
  if (EXEMPT.has(f)) continue;
  const src = readFileSync(f, "utf8");
  if (!/import\s*\{[^}]*\bcreateAdminClient\b[^}]*\}\s*from/.test(src)) continue;
  src.split(/\r?\n/).forEach((line, i) => {
    if (line.includes("tenant-scope:")) return;
    if (tableRe.test(line) || rpcRe.test(line)) violations.push(`${f}:${i + 1}: ${line.trim()}`);
  });
}
if (violations.length) {
  console.error("check-tenant-scoping: tenant table reached through a raw service-role client.\nUse businessDb() from lib/tenant/business.ts, or add a `tenant-scope:` comment explaining why it's safe.\n");
  for (const v of violations) console.error("  " + v);
  process.exit(1);
}
console.log(`check-tenant-scoping: ok (${files.length} files checked)`);
