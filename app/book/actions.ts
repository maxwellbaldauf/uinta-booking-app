"use server";

import {
  createBookingRecord,
  SlotUnavailableError,
  AgreementRequiredError,
  ContactValidationError,
  type CreateBookingInput,
  type CreateBookingResult,
} from "@/lib/booking";

export type CreateBookingResponse =
  | { ok: true; booking: CreateBookingResult }
  | { ok: false; error: string; slotTaken?: boolean; agreementRequired?: boolean; contactInvalid?: boolean };

// Terminal step of the booking flow (spec §1 step 7). Re-validates geocode,
// service area, and slot availability server-side, then creates the
// customer / property / job + access token. The confirmation email + .ics +
// same-day alert are step 3.
export async function createBooking(
  input: CreateBookingInput
): Promise<CreateBookingResponse> {
  try {
    const booking = await createBookingRecord(input);
    return { ok: true, booking };
  } catch (err) {
    if (err instanceof SlotUnavailableError) {
      return { ok: false, error: err.message, slotTaken: true };
    }
    if (err instanceof AgreementRequiredError) {
      // Send the client back to the agreement step rather than leaving them
      // stuck on slots / payment with an error they can't act on there.
      return { ok: false, error: err.message, agreementRequired: true };
    }
    if (err instanceof ContactValidationError) {
      // Bad input, not a server fault — no error log; send them back to fix it.
      return { ok: false, error: err.message, contactInvalid: true };
    }
    console.error("createBooking failed", err);
    return {
      ok: false,
      error:
        err instanceof Error
          ? err.message
          : "Something went wrong finishing your booking.",
    };
  }
}
