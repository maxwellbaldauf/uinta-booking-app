import { createAdminClient } from "@/lib/supabase/admin";
import { matchOrCreateCustomer } from "@/lib/customers";

export type LeadDetails = {
  fullName: string;
  email: string;
  phone: string;
  address: string;
  iceMakerBrand: string;
  iceMakerModel: string;
};

export type LeadFlags = {
  out_of_service_area?: boolean;
  needs_followup?: boolean;
};

// Save a booking that couldn't be completed as a lead on Project A's dashboard
// (spec §1.3). Used for the out-of-area and no-availability dead ends — NOT
// geocode_failed (that falls through to the contact form only if the person
// actually submits it). Best-effort dedupe on (customer, exact address).
export async function saveFlaggedLead(
  details: LeadDetails,
  coords: { lat: number; lng: number } | null,
  flags: LeadFlags
): Promise<{ customerId: string; propertyId: string }> {
  const supabase = createAdminClient();

  const { id: customerId } = await matchOrCreateCustomer(
    { fullName: details.fullName, email: details.email, phone: details.phone },
    "booking"
  );

  const propertyPatch = {
    ice_maker_brand: details.iceMakerBrand || null,
    ice_maker_model: details.iceMakerModel || null,
    latitude: coords?.lat ?? null,
    longitude: coords?.lng ?? null,
    geocoded_at: coords ? new Date().toISOString() : null,
    geocode_failed: !coords,
    out_of_service_area: flags.out_of_service_area ?? false,
    needs_followup: flags.needs_followup ?? false,
  };

  const { data: existing } = await supabase
    .from("properties")
    .select("id")
    .eq("customer_id", customerId)
    .eq("address", details.address)
    .limit(1);

  if (existing && existing[0]) {
    const propertyId = (existing[0] as { id: string }).id;
    const { error } = await supabase
      .from("properties")
      .update(propertyPatch)
      .eq("id", propertyId);
    if (error) throw new Error(`lead: update property failed: ${error.message}`);
    return { customerId, propertyId };
  }

  const { data: property, error } = await supabase
    .from("properties")
    .insert({
      customer_id: customerId,
      address: details.address,
      source: "booking",
      ...propertyPatch,
    })
    .select("id")
    .single();
  if (error || !property) throw new Error(`lead: create property failed: ${error?.message}`);

  return { customerId, propertyId: (property as { id: string }).id };
}
