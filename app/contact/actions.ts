"use server";

import { submitContact, type ContactInput } from "@/lib/contact";

export type SubmitContactResponse = { ok: true } | { ok: false; error: string };

export async function submitContactForm(
  input: ContactInput
): Promise<SubmitContactResponse> {
  if (!input.email?.trim() && !input.phone?.trim()) {
    return { ok: false, error: "Please give us an email or a phone number." };
  }
  try {
    await submitContact(input);
    return { ok: true };
  } catch (err) {
    console.error("submitContactForm failed", err);
    return {
      ok: false,
      error: "We couldn't send your message just now. Please try again.",
    };
  }
}
