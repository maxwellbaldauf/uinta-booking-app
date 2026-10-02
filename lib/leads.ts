import { businessDb } from "@/lib/tenant/business";
import { matchOrCreateCustomer, normalizePhone, type MatchedCustomer } from "@/lib/customers";

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
    .select("id, notes")
    .eq("customer_id", customerId)
    .eq("address", details.address)
    .limit(1);

  if (existing && existing[0]) {
    const { id: propertyId, notes } = existing[0] as { id: string; notes: string | null };
    // A dead end now describes this property, so drop a stale "saw open times"
    // marker (keeping any text the owner added after it).
    const { error } = await supabase
      .from("properties")
      .update({ ...propertyPatch, notes: stripSawTimesNote(notes) })
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
// never auto-scheduled — scheduleNextRecurring requires 'active'; a lead has no
// job, and handleJobCharged's pending -> active flip is job-driven, so the
// field app's backlog meaning of 'pending' never touches it),
// needs_followup true (the field app's follow-up list) and a human-readable
// marker in notes. There is no automatic outreach: nothing here emails, texts,
// or charges anyone, and every reminder / invoice / clustering automation keys
// on jobs.
//
// SAW_TIMES_NOTE doubles as the conversion key: createBookingRecord turns a
// property whose notes START WITH it (so an owner appending a follow-up note
// doesn't break it), still pending, with no jobs, into the normal booked
// property instead of inserting a duplicate. A dedicated column would be the
// sturdier key, but the shared schema is owned by the field app.
export const SAW_TIMES_NOTE = "Saw open times online but didn't book.";

// What an owner's own text becomes once the marker is stripped off the front.
export function stripSawTimesNote(notes: string | null | undefined): string | null {
  if (!notes || !notes.startsWith(SAW_TIMES_NOTE)) return notes ?? null;
  return notes.slice(SAW_TIMES_NOTE.length).trim() || null;
}

const LEAD_CAPTURE_TIMEOUT_MS = 1500;
// One bare lead record can't be fed an unbounded pile of addresses.
const MAX_LEAD_PROPERTIES_PER_CUSTOMER = 3;

type LeadProperty = {
  address: string;
  notes: string | null;
  needs_followup: boolean;
  out_of_service_area: boolean;
  jobs: { id: string }[] | null;
};

// One round trip: is this matched customer a real one, and if it is a bare lead,
// what lead properties does it already hold? Leads must never touch real
// customers' records.
async function readLeadState(
  matched: MatchedCustomer
): Promise<{ real: true } | { real: false; addresses: string[] }> {
  if (matched.archived_at) return { real: true }; // the owner archived them on purpose
  if (
    matched.default_payment_method_id ||
    matched.stripe_customer_id ||
    matched.service_agreement_accepted_at
  ) {
    return { real: true };
  }
  const { data, error } = await businessDb()
    .from("customers")
    .select("source, properties(address, notes, needs_followup, out_of_service_area, jobs(id))")
    .eq("id", matched.id)
    .maybeSingle();
  if (error) throw new Error(`lead: read customer failed: ${error.message}`);
  const row = data as unknown as { source: string; properties: LeadProperty[] | null } | null;
  if (!row) return { real: true };
  // Only customers that came in through the booking or contact form can be bare
  // leads; anything the owner created or imported is a real record.
  if (row.source !== "booking" && row.source !== "contact_form") return { real: true };
  const props = row.properties ?? [];
  // A property that is neither flagged nor carrying our marker (the owner may
  // have cleared the follow-up flag on a lead) is a real one, and so is any job.
  const isLead = (p: LeadProperty) =>
    p.needs_followup || p.out_of_service_area || (p.notes ?? "").startsWith(SAW_TIMES_NOTE);
  if (props.some((p) => !isLead(p))) return { real: true };
  if (props.some((p) => (p.jobs ?? []).length > 0)) return { real: true };
  return { real: false, addresses: props.map((p) => p.address) };
}

// Returns true only when THIS call saved a new lead row, false when nothing was
// saved (already there, real customer, capped, or over budget).
async function captureInAreaLead(
  details: LeadDetails,
  coords: { lat: number; lng: number },
  serviceType: "residential" | "commercial",
  matched: MatchedCustomer | null,
  allowWrite: () => boolean
): Promise<boolean> {
  let customerId = "";
  let createdCustomer = false;

  if (matched) {
    const state = await readLeadState(matched);
    // Existing real customers are never touched. A returning customer
    // re-entering their own address must not get a flag or a second property.
    if (state.real) return false;
    // Insert-only: a second submit (or any property already at this address)
    // leaves the record exactly as it is.
    if (state.addresses.includes(details.address)) return false;
    if (state.addresses.length >= MAX_LEAD_PROPERTIES_PER_CUSTOMER) return false;
    customerId = matched.id;
  }

  // Spend the per-IP budget only when a write is really about to happen.
  if (!allowWrite()) return false;

  const supabase = businessDb();
  if (!matched) {
    const { data, error } = await supabase
      .from("customers")
      .insert({
        full_name: details.fullName.trim() || null,
        email: details.email.trim() || null,
        phone: normalizePhone(details.phone) ?? (details.phone.trim() || null),
        source: "booking",
      })
      .select("id")
      .single();
    if (error || !data) throw new Error(`lead: create customer failed: ${error?.message}`);
    customerId = (data as { id: string }).id;
    createdCustomer = true;
  }

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
  if (error) {
    // Don't leave a bare customer behind that we just created for this lead.
    if (createdCustomer) {
      await supabase.from("customers").delete().eq("id", customerId);
    }
    throw new Error(`lead: create property failed: ${error.message}`);
  }
  return true;
}

// Same-instance guard: a double-submit (or a request that overlaps the
// abandoned-but-still-running write after the time cap) joins the capture
// already in flight for the same visitor + address instead of racing it.
// Cross-instance races can't be closed without a DB unique constraint.
const inflight = new Map<string, Promise<boolean>>();

// Best effort, capped: a failed or slow save must never block or slow the
// visitor's booking. Errors are logged and swallowed; after the cap we stop
// waiting (the write may still finish on a warm instance). Resolves to whether
// this call saved a new lead.
export async function captureInAreaLeadBestEffort(
  details: LeadDetails,
  coords: { lat: number; lng: number },
  serviceType: "residential" | "commercial",
  matched: MatchedCustomer | null,
  allowWrite: () => boolean
): Promise<boolean> {
  const key = `${details.email.trim().toLowerCase()}|${details.address}`;
  let work = inflight.get(key);
  if (!work) {
    work = captureInAreaLead(details, coords, serviceType, matched, allowWrite)
      .catch((err) => {
        console.error("in-area lead capture failed", err);
        return false;
      })
      .finally(() => inflight.delete(key));
    inflight.set(key, work);
  }
  let timer: ReturnType<typeof setTimeout> | undefined;
  try {
    return await Promise.race([
      work,
      new Promise<boolean>((resolve) => {
        timer = setTimeout(() => resolve(false), LEAD_CAPTURE_TIMEOUT_MS);
      }),
    ]);
  } finally {
    if (timer) clearTimeout(timer);
  }
}

// This customer's still-unconverted "saw times, didn't book" lead at this exact
// address (id + its notes, so the owner's own text can be kept), or null.
// Strict on purpose: notes starting with the marker, still pending, and not one
// job on it (the follow-up flag may have been cleared by the owner). Anything else is left alone and the caller inserts a
// fresh property as before.
export async function findConvertibleLeadProperty(
  customerId: string,
  address: string
): Promise<{ id: string; notes: string | null } | null> {
  const supabase = businessDb();
  const { data, error } = await supabase
    .from("properties")
    .select("id, notes, jobs(id)")
    .eq("customer_id", customerId)
    .eq("address", address)
    .eq("plan_status", "pending")
    .like("notes", `${SAW_TIMES_NOTE}%`)
    .limit(1);
  if (error) throw new Error(`lead: find convertible property failed: ${error.message}`);
  const row = data?.[0] as { id: string; notes: string | null; jobs: { id: string }[] | null } | undefined;
  if (!row || (row.jobs ?? []).length > 0) return null;
  return { id: row.id, notes: row.notes };
}
