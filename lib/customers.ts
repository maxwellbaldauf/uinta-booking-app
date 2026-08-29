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
export function normalizePhone(phone: string | null | undefined): string | null {
  if (!phone) return null;
  const digits = phone.replace(/\D/g, "");
  return digits.length >= 10 ? digits : null;
}
