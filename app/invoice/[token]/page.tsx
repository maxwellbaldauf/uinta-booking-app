import Link from "next/link";
import { findJobByInvoiceToken } from "@/lib/invoicePayment";
import { InvoiceApproval } from "@/components/payment/InvoiceApproval";

export const dynamic = "force-dynamic";

export const metadata = {
  title: "Review & Pay — Uinta Ice Co",
};

// The customer-approved-invoicing flow's payment page — token-authorized,
// mirroring /pay/[token]'s pattern (public, the token is the only
// authorization, an expired/unknown/already-settled token gets a friendly
// page rather than a raw error). Reached from the "Review & pay" button in
// uinta-field-app's invoice email, sent the moment a job is marked completed
// — completing a job no longer charges the card automatically.
export default async function InvoicePage({ params }: { params: Promise<{ token: string }> }) {
  const { token } = await params;
  const job = await findJobByInvoiceToken(token);

  if (!job) {
    return (
      <main className="page">
        <h1 style={{ fontSize: 22 }}>This link isn&apos;t valid</h1>
        <p style={{ color: "var(--color-fg-muted)" }}>
          It may have already been paid, or the link may be incorrect. If you still owe
          for a visit, get in touch and we&apos;ll send a fresh link.
        </p>
        <Link href="/contact" style={{ color: "var(--color-primary)" }}>
          Contact us
        </Link>
      </main>
    );
  }

  return (
    <main className="page">
      <InvoiceApproval token={token} job={job} />
    </main>
  );
}
