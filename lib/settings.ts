import { createAdminClient } from "@/lib/supabase/admin";

// The single settings row (id = true) shared with Project A. Everything the
// booking flow needs to stay in sync with the field app: pricing, the service
// area, the scheduling window, the same-day cutoff, business contact info.
export type Settings = {
  base_price_cents: number;
  commercial_price_cents: number;
  service_interval_months: number;
  service_center_lat: number;
  service_center_lng: number;
  service_area_max_miles: number;
  match_radius_miles: number;
  lookahead_days: number;
  max_jobs_per_tech_per_day: number;
  weekly_days_off: number[];
  same_day_cutoff: string; // "HH:MM:SS", America/Denver
  business_name: string;
  business_email: string | null;
  business_phone: string | null;
};

const SETTINGS_COLUMNS =
  "base_price_cents, commercial_price_cents, service_interval_months, service_center_lat, " +
  "service_center_lng, service_area_max_miles, match_radius_miles, " +
  "lookahead_days, max_jobs_per_tech_per_day, weekly_days_off, " +
  "same_day_cutoff, business_name, business_email, business_phone";

// Cache for the lifetime of a server request / a warm serverless instance.
// The settings row changes rarely and only from Project A's settings page.
let cached: { at: number; value: Settings } | null = null;
const TTL_MS = 60_000;

export async function getSettings(): Promise<Settings> {
  if (cached && Date.now() - cached.at < TTL_MS) return cached.value;

  const supabase = createAdminClient();
  const { data, error } = await supabase
    .from("settings")
    .select(SETTINGS_COLUMNS)
    .eq("id", true)
    .single();

  if (error || !data) {
    throw new Error(`Could not load settings: ${error?.message ?? "no row"}`);
  }

  cached = { at: Date.now(), value: data as unknown as Settings };
  return cached.value;
}

export function formatUsd(cents: number): string {
  return `$${(cents / 100).toFixed(2)}`;
}

// Whole-dollar form: "$150" when the price is an even number of dollars,
// "$149.99" otherwise. The marketing copy reads "<price> per visit", where a
// trailing ".00" would look wrong.
export function formatUsdWhole(cents: number): string {
  return cents % 100 === 0 ? `$${cents / 100}` : formatUsd(cents);
}
