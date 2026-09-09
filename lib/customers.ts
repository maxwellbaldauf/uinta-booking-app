import { createAdminClient } from "@/lib/supabase/admin";

export type ImportedCustomer = {
  id: string;
  full_name: string | null;
  email: string | null;
  phone: string | null;
  stripe_customer_id: string | null;
  payment_display: string | null;
};

// Resolve the customer behind a payment_setup_token (spec §6 — the imported-
// customer payment page). Returns null for an unknown or expired token; the
// caller shows a friendly "link expired" page, never a raw error.
export async function findCustomerByPaymentSetupToken(
  token: string
): Promise<ImportedCustomer | null> {
  if (!token || token.length < 16) return null;

  const supabase = createAdminClient();
  const { data, error } = await supabase
    .from("customers")
    .select(
      "id, full_name, email, phone, stripe_customer_id, payment_display, payment_setup_token_expires_at"
    )
    .eq("payment_setup_token", token)
    .maybeSingle();

  if (error || !data) return null;

  const expiresAt = data.payment_setup_token_expires_at as string | null;
  if (expiresAt && new Date(expiresAt).getTime() < Date.now()) return null;

  return {
    id: data.id,
    full_name: data.full_name,
    email: data.email,
    phone: data.phone,
    stripe_customer_id: data.stripe_customer_id,
    payment_display: data.payment_display,
  };
}

// Normalize a phone number to its digits for match-by-phone (spec: repeat
// customers matched by email OR phone). "+1 (801) 555-0100" -> "18015550100".
// Also drops a leading US country code so "18015550100" and "8015550100" match.
export function normalizePhone(phone: string | null | undefined): string | null {
  if (!phone) return null;
  let digits = phone.replace(/\D/g, "");
  if (digits.length === 11 && digits.startsWith("1")) digits = digits.slice(1);
  return digits.length >= 10 ? digits : null;
}

export type MatchedCustomer = {
  id: string;
  full_name: string | null;
  email: string | null;
  phone: string | null;
  stripe_customer_id: string | null;
  default_payment_method_id: string | null;
  default_payment_method_type: string | null;
  payment_display: string | null;
  service_agreement_accepted_at: string | null;
  service_agreement_version: string | null;
};

const MATCH_COLS =
  "id, full_name, email, phone, stripe_customer_id, default_payment_method_id, " +
  "default_payment_method_type, payment_display, service_agreement_accepted_at, " +
  "service_agreement_version";

// Repeat-customer match (spec §1.4): by email OR phone, no extra verification.
// Two targeted queries rather than a PostgREST .or() so an email with a "+" in
// it can't break the filter grammar. Email match wins if both hit.
export async function matchCustomerByEmailOrPhone(
  email: string,
  phone: string | null | undefined
): Promise<MatchedCustomer | null> {
  const supabase = createAdminClient();

  const trimmedEmail = email.trim();
  if (trimmedEmail) {
    const { data } = await supabase
      .from("customers")
      .select(MATCH_COLS)
      .ilike("email", trimmedEmail)
      .limit(1);
    if (data && data[0]) return data[0] as unknown as MatchedCustomer;
  }

  const digits = normalizePhone(phone);
  if (digits) {
    const { data } = await supabase
      .from("customers")
      .select(MATCH_COLS)
      .eq("phone", digits)
      .limit(1);
    if (data && data[0]) return data[0] as unknown as MatchedCustomer;
  }

  return null;
}

// Match a repeat customer, or create a fresh row. Shared by the booking flow,
// the lead paths, and the contact form so "match by email OR phone" is
// implemented once.
export async function matchOrCreateCustomer(
  input: { fullName?: string; email: string; phone?: string },
  source: "booking" | "contact_form",
  extra?: { stripeCustomerId?: string | null }
): Promise<{ id: string; matched: MatchedCustomer | null }> {
  const matched = await matchCustomerByEmailOrPhone(input.email, input.phone);
  if (matched) return { id: matched.id, matched };

  const supabase = createAdminClient();
  const { data, error } = await supabase
    .from("customers")
    .insert({
      full_name: (input.fullName ?? "").trim() || null,
      email: input.email.trim() || null,
      phone: normalizePhone(input.phone) ?? ((input.phone ?? "").trim() || null),
      source,
      ...(extra?.stripeCustomerId ? { stripe_customer_id: extra.stripeCustomerId } : {}),
    })
    .select("id")
    .single();
  if (error || !data) throw new Error(`create customer failed: ${error?.message}`);
  return { id: (data as { id: string }).id, matched: null };
}
