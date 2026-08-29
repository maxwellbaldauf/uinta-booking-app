import { createClient as createSupabaseClient } from "@supabase/supabase-js";

// Service-role client — bypasses RLS entirely. Server-only, never import from a
// Client Component. This app has no logged-in user, so this is the only Supabase
// client it uses; every route that touches it is responsible for validating its
// own token first (see the security model in the build spec §9).
//
// Copied from Project A's lib/supabase/admin.ts — kept identical on purpose.
export function createAdminClient() {
  return createSupabaseClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!,
    { auth: { autoRefreshToken: false, persistSession: false } }
  );
}
