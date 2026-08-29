import { NextResponse } from "next/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { isDev } from "@/lib/dev";

export const runtime = "nodejs";

// DEV ONLY. Reads back the payment-related fields on a customer so a test can
// confirm /api/payment/finalize wrote what it should have.
export async function GET(req: Request) {
  if (!isDev()) return NextResponse.json({ error: "Not found" }, { status: 404 });

  const customerId = new URL(req.url).searchParams.get("customerId");
  if (!customerId) {
    return NextResponse.json({ error: "customerId required" }, { status: 400 });
  }

  const supabase = createAdminClient();
  const { data, error } = await supabase
    .from("customers")
    .select(
      "id, full_name, email, stripe_customer_id, default_payment_method_id, default_payment_method_type, payment_display, payment_authorized_at, payment_setup_token, payment_setup_token_expires_at"
    )
    .eq("id", customerId)
    .single();

  if (error || !data) {
    return NextResponse.json({ error: error?.message ?? "not found" }, { status: 404 });
  }

  return NextResponse.json(data);
}
