import { createAdminClient } from "@/lib/supabase/admin";
import { geocodeAddress } from "@/lib/geocode";
import { getSettings } from "@/lib/settings";
import { isInServiceArea } from "@/lib/serviceArea";
import { getOfferedSlots, slotStillAvailable, type OfferedSlot } from "@/lib/scheduling";
import { matchCustomerByEmailOrPhone, normalizePhone } from "@/lib/customers";
import { saveFlaggedLead, type LeadDetails } from "@/lib/leads";
import {
  resolveConfirmedSetupIntent,
  setStripeDefaultPaymentMethod,
} from "@/lib/stripe/payments";
import { addDaysToISODate, denverMidnightUtcISO, todayDenverISODate } from "@/lib/time/denver";
import { sendBookingConfirmationEmail } from "@/lib/email/bookingConfirmation";
import { sendSameDayBookingAlert } from "@/lib/email/sameDayAlert";

export class SlotUnavailableError extends Error {}

// ---- availability check (spec §1 steps 2–5, §2) --------------------------

export type AvailabilityResult =
  | { status: "geocode_failed" }
  | { status: "out_of_area" }
  | { status: "no_availability" }
  | {
      status: "ok";
      slots: { slotDate: string; arrivalBlock: number; blockLabel: string }[];
      matchedCustomer: { hasPaymentMethod: boolean; paymentDisplay: string | null } | null;
    };

export async function checkAvailability(details: LeadDetails): Promise<AvailabilityResult> {
  const geo = await geocodeAddress(details.address);

  // Geocode failure: keep it a dead end but DON'T auto-persist (decision — a
  // non-geocoding address is usually a typo; it's captured only if the person
  // submits the contact form).
  if (!geo) return { status: "geocode_failed" };

  if (!(await isInServiceArea(geo.lat, geo.lng))) {
    await saveFlaggedLead(details, geo, { out_of_service_area: true });
    return { status: "out_of_area" };
  }

  const slots = await getOfferedSlots(geo.lat, geo.lng);
  if (slots.length === 0) {
    await saveFlaggedLead(details, geo, { needs_followup: true });
    return { status: "no_availability" };
  }

  const matched = await matchCustomerByEmailOrPhone(details.email, details.phone);

  return {
    status: "ok",
    // is_fallback is deliberately dropped here — the customer must see no
    // difference between a route-matched and a fallback date. createBooking
    // re-derives it server-side.
    slots: slots.map((s) => ({
      slotDate: s.slotDate,
      arrivalBlock: s.arrivalBlock,
      blockLabel: s.blockLabel,
    })),
    matchedCustomer: matched
      ? {
          hasPaymentMethod: !!matched.default_payment_method_id,
          paymentDisplay: matched.payment_display,
        }
      : null,
  };
}

// ---- booking creation (spec §1 steps 6–7) -------------------------------

export type CreateBookingInput = {
  details: LeadDetails;
  chosenSlot: { slotDate: string; arrivalBlock: number };
  // true = a matched customer chose to reuse the card already on file.
  useExistingCard: boolean;
  // present unless useExistingCard: a just-confirmed SetupIntent from PaymentSetup.
  payment?: { setupIntentId: string; stripeCustomerId: string };
};

export type CreateBookingResult = {
  token: string;
  scheduledDate: string;
  arrivalBlock: number;
  blockLabel: string;
};

export async function createBookingRecord(
  input: CreateBookingInput
): Promise<CreateBookingResult> {
  const { details, chosenSlot } = input;
  const supabase = createAdminClient();

  // Re-validate everything server-side — never trust what the client carried.
  const geo = await geocodeAddress(details.address);
  if (!geo) throw new Error("Could not verify that address. Please check it and try again.");
  if (!(await isInServiceArea(geo.lat, geo.lng))) {
    throw new Error("That address is outside our service area.");
  }

  const fresh = await slotStillAvailable(
    geo.lat,
    geo.lng,
    chosenSlot.slotDate,
    chosenSlot.arrivalBlock
  );
  if (!fresh) {
    throw new SlotUnavailableError("That time was just taken. Please choose another.");
  }

  const settings = await getSettings();
  const matched = await matchCustomerByEmailOrPhone(details.email, details.phone);

  // Resolve the card up front (before any DB writes) so a bad SetupIntent
  // fails with nothing created.
  let resolvedCard: { paymentMethodId: string; displayLabel: string } | null = null;
  let stripeCustomerId: string | null = null;

  if (input.useExistingCard) {
    if (!matched?.default_payment_method_id || !matched.stripe_customer_id) {
      throw new Error("No card on file for that account.");
    }
    stripeCustomerId = matched.stripe_customer_id;
  } else {
    if (!input.payment) throw new Error("Payment details are missing.");
    stripeCustomerId = input.payment.stripeCustomerId;
    resolvedCard = await resolveConfirmedSetupIntent(
      input.payment.setupIntentId,
      stripeCustomerId
    );
  }

  // --- customer ---
  let customerId: string;
  if (matched) {
    customerId = matched.id;
    // A matched customer's Stripe id may have just been created by PaymentSetup
    // (context: existing_customer). Backfill the row if it's still null.
    if (!matched.stripe_customer_id && stripeCustomerId) {
      await supabase
        .from("customers")
        .update({ stripe_customer_id: stripeCustomerId })
        .eq("id", customerId)
        .is("stripe_customer_id", null);
    }
  } else {
    const { data, error } = await supabase
      .from("customers")
      .insert({
        full_name: details.fullName || null,
        email: details.email.trim() || null,
        phone: normalizePhone(details.phone) ?? (details.phone.trim() || null),
        source: "booking",
        stripe_customer_id: stripeCustomerId,
      })
      .select("id")
      .single();
    if (error || !data) throw new Error(`Could not create your account: ${error?.message}`);
    customerId = data.id;
  }

  // Where does the new card live? A different card chosen by a customer who
  // already has a default → per-property override. Otherwise → customer default.
  const asPropertyOverride =
    !!resolvedCard && !!matched && !!matched.default_payment_method_id;

  // --- property ---
  const { data: property, error: propertyError } = await supabase
    .from("properties")
    .insert({
      customer_id: customerId,
      address: details.address,
      latitude: geo.lat,
      longitude: geo.lng,
      geocoded_at: new Date().toISOString(),
      geocode_failed: false,
      ice_maker_brand: details.iceMakerBrand || null,
      ice_maker_model: details.iceMakerModel || null,
      plan_status: "active",
      source: "booking",
      ...(asPropertyOverride && resolvedCard
        ? {
            payment_method_id: resolvedCard.paymentMethodId,
            payment_method_type: "card",
            payment_display: resolvedCard.displayLabel,
          }
        : {}),
    })
    .select("id")
    .single();
  if (propertyError || !property) {
    throw new Error(`Could not save the property: ${propertyError?.message}`);
  }

  // --- payment persistence ---
  if (resolvedCard) {
    await setStripeDefaultPaymentMethod(stripeCustomerId!, resolvedCard.paymentMethodId);
    const authorizedAt = new Date().toISOString();
    if (asPropertyOverride) {
      // payment_authorized_at only exists on customers — stamp it there too
      // (latest authorization wins; Stripe keeps the per-mandate record).
      await supabase
        .from("customers")
        .update({ payment_authorized_at: authorizedAt })
        .eq("id", customerId);
    } else {
      await supabase
        .from("customers")
        .update({
          default_payment_method_id: resolvedCard.paymentMethodId,
          default_payment_method_type: "card",
          payment_display: resolvedCard.displayLabel,
          payment_authorized_at: authorizedAt,
        })
        .eq("id", customerId);
    }
  }

  // --- job ---
  const token = crypto.randomUUID();
  const { data: job, error: jobError } = await supabase
    .from("jobs")
    .insert({
      property_id: property.id,
      status: "scheduled",
      scheduled_date: chosenSlot.slotDate,
      arrival_block: chosenSlot.arrivalBlock,
      quoted_price_cents: settings.base_price_cents,
      booking_match_type: fresh.isFallback ? "fallback" : "route_matched",
      access_token: token,
      // "expires the day after the appointment" — valid through all of the
      // following day, dead at the start of the day after that.
      access_token_expires_at: denverMidnightUtcISO(
        addDaysToISODate(chosenSlot.slotDate, 2)
      ),
    })
    .select("id")
    .single();
  if (jobError || !job) {
    throw new Error(`Could not book the visit: ${jobError?.message}`);
  }
  const jobId = (job as { id: string }).id;

  // Confirmation email + .ics (spec §8.1). Non-blocking — the job exists
  // whether or not the email lands; only stamp confirmation_sent_at on success.
  const sent = await sendBookingConfirmationEmail(jobId);
  if (sent) {
    await supabase
      .from("jobs")
      .update({ confirmation_sent_at: new Date().toISOString() })
      .eq("id", jobId);
  }

  // Same-day owner alert — a booking for today can land with an hour's notice.
  if (chosenSlot.slotDate === todayDenverISODate()) {
    await sendSameDayBookingAlert(jobId);
  }

  return {
    token,
    scheduledDate: chosenSlot.slotDate,
    arrivalBlock: chosenSlot.arrivalBlock,
    blockLabel: fresh.blockLabel,
  };
}

// Re-export so callers only import from lib/booking.
export type { OfferedSlot };
