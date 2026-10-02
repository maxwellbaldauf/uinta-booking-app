import { businessDb } from "@/lib/tenant/business";
import { geocodeAddress } from "@/lib/geocode";
import { matchOrCreateCustomer } from "@/lib/customers";

export type ContactInput = {
  fullName: string;
  email: string;
  phone: string;
  address: string;
  iceMakerBrand: string;
  iceMakerModel: string;
  message: string;
};

// The "not ready to book" / out-of-area / no-availability path (spec §5).
// Match-or-create the customer, create/reuse a property flagged
// needs_followup with NO job, and record the submission. Geocoding is
// best-effort — a submission is never dropped for it.
export async function submitContact(
  input: ContactInput
): Promise<{ customerId: string; propertyId: string | null }> {
  const supabase = businessDb();

  const { id: customerId } = await matchOrCreateCustomer(
    { fullName: input.fullName, email: input.email, phone: input.phone },
    "contact_form"
  );

  let propertyId: string | null = null;
  if (input.address.trim()) {
    const geo = await geocodeAddress(input.address).catch(() => null);
    const patch = {
      ice_maker_brand: input.iceMakerBrand || null,
      ice_maker_model: input.iceMakerModel || null,
      latitude: geo?.lat ?? null,
      longitude: geo?.lng ?? null,
      geocoded_at: geo ? new Date().toISOString() : null,
      geocode_failed: !geo,
      needs_followup: true,
    };

    const { data: existing } = await supabase
      .from("properties")
      .select("id")
      .eq("customer_id", customerId)
      .eq("address", input.address.trim())
      .limit(1);

    if (existing && existing[0]) {
      propertyId = (existing[0] as { id: string }).id;
      await supabase.from("properties").update(patch).eq("id", propertyId);
    } else {
      const { data: prop } = await supabase
        .from("properties")
        // 'pending', not the 'active' default: a lead is not a paying plan, so it
        // must stay out of the field app's MRR / active-client counts.
        .insert({
          customer_id: customerId,
          address: input.address.trim(),
          source: "contact_form",
          plan_status: "pending",
          ...patch,
        })
        .select("id")
        .single();
      propertyId = (prop as { id: string } | null)?.id ?? null;
    }
  }

  const { error: submissionError } = await supabase.from("contact_submissions").insert({
    customer_id: customerId,
    property_id: propertyId,
    message: input.message.trim() || null,
    handled: false,
  });
  if (submissionError) {
    throw new Error(`contact: submission insert failed: ${submissionError.message}`);
  }

  return { customerId, propertyId };
}
