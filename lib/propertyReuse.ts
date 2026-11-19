import { businessDb } from "@/lib/tenant/business";
import { findMatchingProperty } from "@/lib/addressMatch";

// "Does this customer already have this property?" — the one place the booking
// site answers it, so a returning customer is never given a duplicate property.
// Normalized address match (St/Street, case, punctuation; a different unit is a
// different property), geocode fallback only for unit-less addresses (see
// lib/addressMatch.ts). Scoped to ONE customer and, through businessDb(), to this
// deployment's business: another customer at the same address — or the same person
// at the other business — never matches.

export type CustomerPropertyRow = {
  id: string;
  address: string | null;
  latitude: number | null;
  longitude: number | null;
  plan_status: string;
  source: string;
  notes: string | null;
};

export async function findCustomerProperty(
  customerId: string,
  address: string,
  coords?: { lat: number; lng: number } | null
): Promise<CustomerPropertyRow | null> {
  const { data, error } = await businessDb()
    .from("properties")
    .select("id, address, latitude, longitude, plan_status, source, notes")
    .eq("customer_id", customerId);
  if (error) throw new Error(`property match lookup failed: ${error.message}`);
  return findMatchingProperty((data ?? []) as CustomerPropertyRow[], address, coords);
}

// A booking at an address the customer already has (ANY plan status — active, or
// cancelled and now coming back) goes on THAT property: reactivated, geocode and
// machine details refreshed (typed values only), while its price override,
// interval, referral and notes are left alone. Returns the property id, or null
// when there is no match (the caller inserts a new property as before).
export async function reuseCustomerProperty(input: {
  customerId: string;
  address: string;
  coords: { lat: number; lng: number };
  // The booking's property fields (see createBookingRecord); custom_price_cents and
  // address are deliberately NOT applied to an existing property.
  fields: Record<string, unknown> & {
    custom_price_cents?: unknown;
    address?: unknown;
    ice_maker_brand?: string | null;
    ice_maker_model?: string | null;
  };
}): Promise<{ id: string } | null> {
  const hit = await findCustomerProperty(input.customerId, input.address, input.coords);
  if (!hit) return null;
  const { custom_price_cents, address, ice_maker_brand, ice_maker_model, ...refresh } = input.fields;
  void custom_price_cents;
  void address;
  const { data, error } = await businessDb()
    .from("properties")
    .update({
      ...refresh,
      plan_cancelled_at: null,
      needs_followup: false,
      ...(ice_maker_brand ? { ice_maker_brand } : {}),
      ...(ice_maker_model ? { ice_maker_model } : {}),
    })
    .eq("id", hit.id)
    .eq("customer_id", input.customerId)
    .select("id")
    .maybeSingle();
  if (error) throw new Error(`property reuse update failed: ${error.message}`);
  return (data as { id: string } | null) ?? null;
}
