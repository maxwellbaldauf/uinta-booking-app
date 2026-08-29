import { createAdminClient } from "@/lib/supabase/admin";
import { getSettings } from "@/lib/settings";

// Explicit distance check against the service-center, the same gate
// get_available_slots enforces internally. This is what disambiguates the
// two reasons the slots RPC can come back empty (spec §2): a genuinely
// out-of-area address vs. an in-area address with no open blocks in the
// window. Mirrors Project A's scheduleNextRecurringJob.
export async function distanceFromServiceCenterMiles(
  lat: number,
  lng: number
): Promise<number> {
  const settings = await getSettings();
  const supabase = createAdminClient();

  const { data, error } = await supabase.rpc("haversine_miles", {
    lat1: lat,
    lon1: lng,
    lat2: settings.service_center_lat,
    lon2: settings.service_center_lng,
  });

  if (error || typeof data !== "number") {
    throw new Error(`haversine_miles failed: ${error?.message ?? "non-numeric result"}`);
  }
  return data;
}

export async function isInServiceArea(lat: number, lng: number): Promise<boolean> {
  const settings = await getSettings();
  const miles = await distanceFromServiceCenterMiles(lat, lng);
  return miles <= settings.service_area_max_miles;
}
