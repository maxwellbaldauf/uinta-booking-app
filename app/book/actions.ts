"use server";

import {
  createBookingRecord,
  SlotUnavailableError,
  type CreateBookingInput,
  type CreateBookingResult,
} from "@/lib/booking";

export type CreateBookingResponse =
  | { ok: true; booking: CreateBookingResult }
  | { ok: false; error: string; slotTaken?: boolean };

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
