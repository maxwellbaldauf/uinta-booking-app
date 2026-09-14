import Link from "next/link";
import { findPendingBacklogJobsForToken } from "@/lib/backlogPayment";
import { ImportPaymentSetup } from "@/components/payment/ImportPaymentSetup";
import { BacklogPaymentSetup } from "@/components/payment/BacklogPaymentSetup";

export const dynamic = "force-dynamic";

export const metadata = {
  title: "Set Up Payment — Uinta Ice Co",
};

// Imported-customer payment page (spec §6), extended for the backlog-visit
// flow. Public — the payment_setup_token is the only authorization. Expired
// / unknown / already-used token gets a friendly page, never a raw error.
//
// findPendingBacklogJobsForToken wraps the plain token lookup and also
// checks for unpaid backlog jobs (uinta-field-app's jobs.source:"backlog").
// A customer with none renders the original plain-import flow completely
// unchanged — this branch point is the regression-risk spot, so nothing
// about that path (ImportPaymentSetup, /api/payment/finalize) changes here.
export default async function PayPage({ params }: { params: Promise<{ token: string }> }) {
  const { token } = await params;
  const pending = await findPendingBacklogJobsForToken(token);

  if (!pending) {
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

  const { customer, jobs } = pending;

  if (jobs.length === 0) {
    return (
      <main className="page">
        <ImportPaymentSetup
          token={token}
          customerName={customer.full_name}
          existingCard={customer.payment_display}
        />
      </main>
    );
  }

  return (
    <main className="page">
      <BacklogPaymentSetup
        token={token}
        customerName={customer.full_name}
        jobs={jobs}
        serviceAgreementVersion={customer.service_agreement_version}
      />
    </main>
  );
}
