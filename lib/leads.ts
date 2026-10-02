import { businessDb } from "@/lib/tenant/business";
import { matchOrCreateCustomer, type MatchedCustomer } from "@/lib/customers";

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
  const supabase = businessDb();

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

// ---- in-area "saw times, didn't book" leads ------------------------------
//
// Saved when availability returns open times. NO schema change: the lead is a
// property with plan_status 'pending' (excluded from MRR / active counts and
// never auto-scheduled — scheduleNextRecurring requires 'active'),
// needs_followup true (the field app's follow-up list) and a human-readable
// marker in notes. There is no automatic outreach: nothing here emails, texts,
// or charges anyone, and a lead has no job, which every reminder / invoice /
// clustering automation keys on.
//
// SAW_TIMES_NOTE doubles as the conversion key: createBookingRecord turns a
// property carrying exactly this note (and still pending, with no jobs) into
// the normal booked property instead of inserting a duplicate.
export const SAW_TIMES_NOTE = "Saw open times online but didn't book.";

const LEAD_CAPTURE_TIMEOUT_MS = 1500;

// A matched customer is "real" if anything beyond a bare lead exists on the
// record. Leads must never touch real customers' records.
async function isRealCustomer(matched: MatchedCustomer): Promise<boolean> {
  if (matched.archived_at) return true; // the owner archived them on purpose
  if (
    matched.default_payment_method_id ||
    matched.stripe_customer_id ||
    matched.service_agreement_accepted_at
  ) {
    return true;
  }
  const supabase = businessDb();
  const { data: props, error } = await supabase
    .from("properties")
    .select("id, needs_followup, out_of_service_area")
    .eq("customer_id", matched.id);
  if (error) throw new Error(`lead: read properties failed: ${error.message}`);
  const rows = (props ?? []) as { id: string; needs_followup: boolean; out_of_service_area: boolean }[];
  // A property that isn't flagged as a lead is a real one.
  if (rows.some((p) => !p.needs_followup && !p.out_of_service_area)) return true;
  if (rows.length === 0) return false;
  const { count, error: jobsError } = await supabase
    .from("jobs")
    .select("id", { count: "exact", head: true })
    .in("property_id", rows.map((p) => p.id));
  if (jobsError) throw new Error(`lead: read jobs failed: ${jobsError.message}`);
  return (count ?? 0) > 0;
}

async function captureInAreaLead(
  details: LeadDetails,
  coords: { lat: number; lng: number },
  serviceType: "residential" | "commercial",
  matched: MatchedCustomer | null
): Promise<void> {
  // Existing real customers are never touched. A returning customer re-entering
  // their own address must not get a flag or a second property.
  if (matched && (await isRealCustomer(matched))) return;

  const { id: customerId } = matched
    ? { id: matched.id }
    : await matchOrCreateCustomer(
        { fullName: details.fullName, email: details.email, phone: details.phone },
        "booking"
      );

  const supabase = businessDb();
  const { data: existing, error: existingError } = await supabase
    .from("properties")
    .select("id")
    .eq("customer_id", customerId)
    .eq("address", details.address)
    .limit(1);
  if (existingError) throw new Error(`lead: read property failed: ${existingError.message}`);
  // Insert-only: a second submit (or any existing property at this address)
  // leaves the record exactly as it is.
  if (existing && existing[0]) return;

  const { error } = await supabase.from("properties").insert({
    customer_id: customerId,
    address: details.address,
    source: "booking",
    latitude: coords.lat,
    longitude: coords.lng,
    geocoded_at: new Date().toISOString(),
    geocode_failed: false,
    ice_maker_brand: details.iceMakerBrand || null,
    ice_maker_model: details.iceMakerModel || null,
    service_type: serviceType,
    plan_status: "pending",
    needs_followup: true,
    notes: SAW_TIMES_NOTE,
  });
  if (error) throw new Error(`lead: create property failed: ${error.message}`);
}

// Best effort, capped: a failed or slow save must never block or slow the
// visitor's booking. Errors are logged and swallowed; after the cap we stop
// waiting (the write may still finish on a warm instance).
export async function captureInAreaLeadBestEffort(
  details: LeadDetails,
  coords: { lat: number; lng: number },
  serviceType: "residential" | "commercial",
  matched: MatchedCustomer | null
): Promise<void> {
  let timer: ReturnType<typeof setTimeout> | undefined;
  try {
    await Promise.race([
      captureInAreaLead(details, coords, serviceType, matched).catch((err) => {
        console.error("in-area lead capture failed", err);
      }),
      new Promise<void>((resolve) => {
        timer = setTimeout(resolve, LEAD_CAPTURE_TIMEOUT_MS);
      }),
    ]);
  } finally {
    if (timer) clearTimeout(timer);
  }
}

// The id of this customer's still-unconverted "saw times, didn't book" lead at
// this exact address, or null. Strict on purpose: the exact marker note, still
// pending and flagged, and not one job on it. Anything else is left alone and
// the caller inserts a fresh property as before.
export async function findConvertibleLeadProperty(
  customerId: string,
  address: string
): Promise<string | null> {
  const supabase = businessDb();
  const { data, error } = await supabase
    .from("properties")
    .select("id")
    .eq("customer_id", customerId)
    .eq("address", address)
    .eq("plan_status", "pending")
    .eq("needs_followup", true)
    .eq("notes", SAW_TIMES_NOTE)
    .limit(1);
  if (error) throw new Error(`lead: find convertible property failed: ${error.message}`);
  const id = (data?.[0] as { id: string } | undefined)?.id;
  if (!id) return null;

  const { count, error: jobsError } = await supabase
    .from("jobs")
    .select("id", { count: "exact", head: true })
    .eq("property_id", id);
  if (jobsError) throw new Error(`lead: read jobs failed: ${jobsError.message}`);
  return (count ?? 0) === 0 ? id : null;
}
