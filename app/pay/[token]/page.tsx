import Link from "next/link";
import { findCustomerByPaymentSetupToken } from "@/lib/customers";
import { ImportPaymentSetup } from "@/components/payment/ImportPaymentSetup";

export const dynamic = "force-dynamic";

export const metadata = {
  title: "Set Up Payment — Uinta Ice Co",
};

// Imported-customer payment page (spec §6). Public — the payment_setup_token is
// the only authorization. Expired / unknown / already-used token gets a
// friendly page, never a raw error. /api/payment/finalize consumes the token on
// success, so a second visit lands here.
export default async function PayPage({ params }: { params: { token: string } }) {
  const customer = await findCustomerByPaymentSetupToken(params.token);

  if (!customer) {
    return (
      <main className="page">
        <h1 style={{ fontSize: 22 }}>This link isn&apos;t valid</h1>
        <p style={{ color: "var(--color-fg-muted)" }}>
          It may have expired or already been used. If you still need to set up a
          card on file, get in touch and we&apos;ll send a fresh link.
        </p>
        <Link href="/contact" style={{ color: "var(--color-primary)" }}>
          Contact us
        </Link>
      </main>
    );
  }

  return (
    <main className="page">
      <ImportPaymentSetup
        token={params.token}
        customerName={customer.full_name}
        existingCard={customer.payment_display}
      />
    </main>
  );
}
