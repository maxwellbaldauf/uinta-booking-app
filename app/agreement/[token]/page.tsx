import Link from "next/link";
import { findCustomerByAgreementToken } from "@/lib/customers";
import { agreementIsCurrentFor } from "@/lib/agreement";
import { AgreementOnly } from "@/components/payment/AgreementOnly";

export const dynamic = "force-dynamic";

export const metadata = {
  title: "Service Agreement - Uinta Ice Co",
};

// Agreement-only page for one-time-payment-link customers: the same scroll-gated
// consent as everywhere else, but no card step. Token-authorized, like /pay and
// /invoice; an unknown or expired token gets a calm page, never a raw error.
export default async function AgreementPage({ params }: { params: Promise<{ token: string }> }) {
  const { token } = await params;
  const customer = await findCustomerByAgreementToken(token);

  if (!customer) {
    return (
      <main className="page">
        <h1 style={{ fontSize: 22 }}>This link isn&apos;t valid</h1>
        <p style={{ color: "var(--color-fg-muted)" }}>
          It may have expired. Get in touch and we&apos;ll send a fresh link.
        </p>
        <Link href="/contact" style={{ color: "var(--color-primary)" }}>
          Contact us
        </Link>
      </main>
    );
  }

  return (
    <main className="page">
      <AgreementOnly
        token={token}
        customerName={customer.full_name}
        alreadyAccepted={agreementIsCurrentFor(customer.service_agreement_version, "one_time_link")}
        hadOlderVersion={customer.service_agreement_version != null}
      />
    </main>
  );
}
