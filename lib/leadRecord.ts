import { businessDb } from "@/lib/tenant/business";

// Where a lead came in. Matches the leads.channel CHECK constraint
// (uinta-field-app migration 028) exactly.
export type LeadChannel =
  | "contact_form"
  | "ai_chat"
  | "booking_out_of_area"
  | "booking_no_availability"
  | "booking_saw_times";

const MAX_MESSAGE = 5000;

// Records one lead in the leads table and returns its id, or null if the write
// failed. Never throws: a failed leads write must not break lead capture (the
// customer / property / contact_submissions rows are already saved) or the
// owner alert (which just runs without a lead id, so it can't be deduped and
// can't stamp alert_sent_at).
export async function recordLead(input: {
  channel: LeadChannel;
  customerId: string;
  propertyId?: string | null;
  message?: string | null;
}): Promise<string | null> {
  try {
    const { data, error } = await businessDb()
      .from("leads")
      .insert({
        customer_id: input.customerId,
        property_id: input.propertyId ?? null,
        channel: input.channel,
        message: input.message?.trim().slice(0, MAX_MESSAGE) || null,
      })
      .select("id")
      .single();
    if (error || !data) {
      console.error("recordLead: insert failed", error?.message ?? "no row returned", {
        channel: input.channel,
        customerId: input.customerId,
      });
      return null;
    }
    return (data as { id: string }).id;
  } catch (err) {
    console.error("recordLead: unexpected error", err, { channel: input.channel });
    return null;
  }
}
