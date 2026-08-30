import { NextResponse } from "next/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { newPaymentSetupToken, expiresInDays } from "@/lib/tokens";
import { sendPaymentSetupRequestEmail } from "@/lib/email/paymentSetupRequest";

export const runtime = "nodejs";

// Called by Project A's one-time import script (server-to-server). For each
// imported customer: mint a fresh payment_setup_token, store it, and email the
// customer a /pay/[token] link (spec §6 + §8.2).
//
// Auth: a dedicated IMPORT_API_SECRET as a bearer token. Scoped to this one
// endpoint so a leak of it can't do anything else — set the same value in
// Project A's env for the import script.
//
// POST { customerId }  ->  { ok, token } | { ok: true, skipped } | { error }
const TOKEN_TTL_DAYS = 21;

function timingSafeEqual(a: string, b: string): boolean {
  if (a.length !== b.length) return false;
  let diff = 0;
  for (let i = 0; i < a.length; i++) diff |= a.charCodeAt(i) ^ b.charCodeAt(i);
  return diff === 0;
}

export async function POST(req: Request) {
  const secret = process.env.IMPORT_API_SECRET;
  const presented = (req.headers.get("authorization") ?? "").replace(/^Bearer\s+/i, "");
  if (!secret || !timingSafeEqual(presented, secret)) {
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
