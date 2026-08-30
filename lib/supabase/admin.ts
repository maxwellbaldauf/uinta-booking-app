import { createClient as createSupabaseClient } from "@supabase/supabase-js";

// Service-role client — bypasses RLS entirely. Server-only, never import from a
// Client Component. This app has no logged-in user, so this is the only Supabase
// client it uses; every route that touches it is responsible for validating its
// own token first (see the security model in the build spec §9).
//
// `cache: "no-store"` on every request: Next 14 patches fetch and will happily
// cache a PostgREST GET across requests, which meant a page keyed by a token
// (/pay/[token], /visit/[token]) could keep rendering a stale row after the
// token was consumed. Reads here must always be fresh.
export function createAdminClient() {
  return createSupabaseClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!,
    {
      auth: { autoRefreshToken: false, persistSession: false },
      global: {
        fetch: (input: RequestInfo | URL, init?: RequestInit) =>
          fetch(input, { ...init, cache: "no-store" }),
      },
    }
  );
}
