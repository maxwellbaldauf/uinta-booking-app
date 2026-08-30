import { NextResponse } from "next/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { newPaymentSetupToken, expiresInDays } from "@/lib/tokens";
import { sendPaymentSetupRequestEmail } from "@/lib/email/paymentSetupRequest";

export const runtime = "nodejs";

// Called by Project A's one-time import script (server-to-server). For each
// imported customer: mint a fresh payment_setup_token, store it, and email the
// customer a /pay/[token] link (spec §6 + §8.2).
//
// Auth: the import script runs with the shared service-role key; require it as
// a bearer token here. Both apps use the same Supabase project, so the value is
// already synced — no extra secret to manage.
//
// POST { customerId }  ->  { ok, token } | { ok: true, skipped } | { error }
const TOKEN_TTL_DAYS = 21;

export async function POST(req: Request) {
  const auth = req.headers.get("authorization") ?? "";
  const expected = `Bearer ${process.env.SUPABASE_SERVICE_ROLE_KEY}`;
  if (!process.env.SUPABASE_SERVICE_ROLE_KEY || auth !== expected) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  let body: { customerId?: string };
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: "Invalid body" }, { status: 400 });
  }
  if (!body.customerId) {
    return NextResponse.json({ error: "customerId required" }, { status: 400 });
  }

  const supabase = createAdminClient();
  const { data: customer, error } = await supabase
    .from("customers")
    .select("id, email, default_payment_method_id")
    .eq("id", body.customerId)
    .single();

  if (error || !customer) {
    return NextResponse.json({ error: "Customer not found" }, { status: 404 });
  }
  if (!customer.email) {
    return NextResponse.json({ error: "Customer has no email" }, { status: 422 });
  }
  if (customer.default_payment_method_id) {
    return NextResponse.json({ ok: true, skipped: "customer already has a card on file" });
  }

  const token = newPaymentSetupToken();
  const { error: updateError } = await supabase
    .from("customers")
    .update({
      payment_setup_token: token,
      payment_setup_token_expires_at: expiresInDays(TOKEN_TTL_DAYS),
    })
    .eq("id", customer.id);
  if (updateError) {
    return NextResponse.json({ error: `Could not store token: ${updateError.message}` }, { status: 500 });
  }

  const sent = await sendPaymentSetupRequestEmail(token);
  if (!sent) {
    // Token is stored — the link works even though the email didn't send.
    return NextResponse.json(
      { ok: false, token, error: "Token stored but the email failed to send" },
      { status: 502 }
    );
  }

  return NextResponse.json({ ok: true, token });
}
