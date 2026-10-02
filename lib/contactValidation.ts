// Pure contact-field validation shared by DetailsStep (client) and the
// availability route / createBookingRecord (server). Deliberately dependency-
// free: lib/customers.ts pulls in the Supabase client and must not reach the
// browser bundle.

export type ContactFields = {
  fullName: string;
  email: string;
  phone: string;
  address: string;
};

export type ContactErrors = Partial<Record<keyof ContactFields, string>>;

export const CONTACT_MESSAGES = {
  fullName: "Please enter your full name",
  email: "Please enter a valid email address",
  phone: "Please enter a valid phone number",
  address: "Please enter your street address",
} as const;

const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

export function isValidEmail(email: unknown): boolean {
  return typeof email === "string" && EMAIL_RE.test(email.trim());
}

// Digits-only form of a phone number for matching ("+1 (801) 555-0100" ->
// "8015550100"); null when there are fewer than 10 digits. Lives here (and is
// re-exported by lib/customers.ts) so the form, the server checks and the
// customer matcher share one rule.
export function normalizePhone(phone: string | null | undefined): string | null {
  if (!phone) return null;
  let digits = phone.replace(/\D/g, "");
  if (digits.length === 11 && digits.startsWith("1")) digits = digits.slice(1);
  return digits.length >= 10 ? digits : null;
}

export function isValidPhone(phone: unknown): boolean {
  return typeof phone === "string" && normalizePhone(phone) !== null;
}

function nonEmpty(v: unknown): boolean {
  return typeof v === "string" && v.trim().length > 0;
}

export function validateContact(f: Partial<Record<keyof ContactFields, unknown>>): ContactErrors {
  const errors: ContactErrors = {};
  if (!nonEmpty(f.fullName)) errors.fullName = CONTACT_MESSAGES.fullName;
  if (!isValidEmail(f.email)) errors.email = CONTACT_MESSAGES.email;
  if (!isValidPhone(f.phone)) errors.phone = CONTACT_MESSAGES.phone;
  if (!nonEmpty(f.address)) errors.address = CONTACT_MESSAGES.address;
  return errors;
}

// First problem in form order, for server responses that return one message.
export function firstContactError(f: Partial<Record<keyof ContactFields, unknown>>): string | null {
  const e = validateContact(f);
  return e.fullName ?? e.email ?? e.phone ?? e.address ?? null;
}
