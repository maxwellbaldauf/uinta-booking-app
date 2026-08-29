import { NextResponse } from "next/server";
import { randomBytes } from "crypto";
import { createAdminClient } from "@/lib/supabase/admin";
import { isDev } from "@/lib/dev";

export const runtime = "nodejs";

// DEV ONLY. Creates a customer row with a fresh payment_setup_token so the
// imported-customer payment flow (spec §6) can be exercised end to end.
export async function POST() {
  if (!isDev()) return NextResponse.json({ error: "Not found" }, { status: 404 });

  const supabase = createAdminClient();
  const token = randomBytes(24).toString("base64url");
  const expiresAt = new Date(Date.now() + 7 * 24 * 60 * 60 * 1000).toISOString();

  const { data, error } = await supabase
    .from("customers")
    .insert({
      full_name: "DEV import test",
      email: `dev-import+${Date.now()}@example.test`,
      phone: "8015550142",
      source: "import",
      payment_setup_token: token,
      payment_setup_token_expires_at: expiresAt,
    })
    .select("id")
    .single();

  if (error || !data) {
    return NextResponse.json(
      { error: error?.message ?? "insert failed" },
      { status: 500 }
    );
  }

  return NextResponse.json({ customerId: data.id, token });
}
