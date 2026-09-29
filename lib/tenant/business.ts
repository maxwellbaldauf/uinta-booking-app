// Which business THIS deployment of the booking site serves. Each business
// has its own booking-site deployment (uinta-booking-app for Uinta,
// camelback-ice-co for Camelback), all sharing one Supabase project; the
// deployment's BUSINESS_ID env var pins every query, token lookup, email and
// Stripe call to that one business.
//
// Required, with no fallback: a deployment that forgot BUSINESS_ID must fail
// loudly, never silently act as some other business.
//
// Relative imports: reachable from netlify/functions/pre-visit-reminders.mts.
import { createAdminClient } from "../supabase/admin";
import { scopedAdmin, type ScopedAdmin } from "./scoped";

export type Business = {
  id: string;
  slug: string;
  name: string;
  legal_name: string;
  timezone: string;
  accent_color: string;
  logo_url: string | null;
  site_origin: string;
  from_name: string;
  from_email: string | null;
  reply_to: string | null;
  ics_domain: string;
};

export function currentBusinessId(): string {
  const id = process.env.BUSINESS_ID?.trim();
  if (!id) {
    throw new Error("BUSINESS_ID is not set — this booking site doesn't know which business it serves.");
  }
  return id;
}

// The service-role client for this deployment's business (see scoped.ts).
export function businessDb(): ScopedAdmin {
  return scopedAdmin(currentBusinessId());
}

const COLUMNS =
  "id, slug, name, legal_name, timezone, accent_color, logo_url, site_origin, " +
  "from_name, from_email, reply_to, ics_domain";

const TTL_MS = 60_000;
// The in-flight PROMISE is cached (not just the value), so concurrent callers
// on a cold instance share one query; a failed lookup isn't cached.
let cached: { at: number; value: Promise<Business> } | null = null;

export function getBusiness(): Promise<Business> {
  if (cached && Date.now() - cached.at < TTL_MS) return cached.value;
  const id = currentBusinessId();
  const value = (async () => {
    const { data, error } = await createAdminClient()
      .from("businesses")
      .select(COLUMNS)
      .eq("id", id)
      .single();
    if (error || !data) {
      throw new Error(`BUSINESS_ID ${id} has no businesses row: ${error?.message ?? "not found"}`);
    }
    return data as unknown as Business;
  })();
  cached = { at: Date.now(), value };
  value.catch(() => {
    if (cached?.value === value) cached = null;
  });
  return value;
}

// This deployment's business timezone — for "today", same-day cutoffs,
// magic-link expiry and .ics times (lib/time/zone.ts).
export async function businessTz(): Promise<string> {
  return (await getBusiness()).timezone;
}
