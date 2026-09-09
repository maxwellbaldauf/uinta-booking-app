"use client";

import { useCallback, useMemo, useState } from "react";
import { PaymentSetup, type PaymentSetupResult } from "@/components/payment/PaymentSetup";
import { createBooking, type CreateBookingResponse } from "@/app/book/actions";
import { ErrorBanner, secondaryButtonStyle } from "@/components/ui/form";
import { DetailsStep, type BookingDetails } from "./DetailsStep";
import { AgreementStep } from "./AgreementStep";
import { SlotStep, type OfferedSlotView } from "./SlotStep";
import { DeadEndNotice, type DeadEndKind } from "./DeadEndNotice";
import { BookedConfirmation } from "./BookedConfirmation";
import { SERVICE_AGREEMENT_VERSION } from "@/lib/agreement";

type Step =
  | "details"
  | "agreement"
  | "slots"
  | "payment"
  | "submitting"
  | "done"
  | "dead_end";

type Availability = {
  slots: OfferedSlotView[];
  matchedCustomer: { hasPaymentMethod: boolean; paymentDisplay: string | null } | null;
  agreementRequired: boolean;
  agreementStale: boolean;
};

export function BookingFlow() {
  const [step, setStep] = useState<Step>("details");
  const [details, setDetails] = useState<BookingDetails | null>(null);
  const [availability, setAvailability] = useState<Availability | null>(null);
  const [deadEnd, setDeadEnd] = useState<{ kind: DeadEndKind; saved: boolean } | null>(null);
  const [chosen, setChosen] = useState<{ slot: OfferedSlotView; useExistingCard: boolean } | null>(
    null
  );
  const [payment, setPayment] = useState<PaymentSetupResult | null>(null);
  // Set true when the customer accepts on the agreement step this session. The
  // server re-derives whether acceptance was required and enforces it.
  const [agreementAccepted, setAgreementAccepted] = useState(false);
  const [result, setResult] = useState<CreateBookingResponse | null>(null);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const fetchAvailability = useCallback(async (d: BookingDetails) => {
    const res = await fetch("/api/booking/availability", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(d),
    });
    return res.json();
  }, []);

  async function handleDetails(d: BookingDetails) {
    setDetails(d);
    setBusy(true);
    setError(null);
    try {
      const data = await fetchAvailability(d);
      if (data.error) {
        setError(data.error);
        return;
      }
      if (data.status === "ok") {
        setAvailability({
          slots: data.slots,
          matchedCustomer: data.matchedCustomer,
          agreementRequired: data.agreementRequired,
          agreementStale: data.agreementStale,
        });
        // Re-check on every details submit — never carry a stale acceptance
        // (e.g. the email was changed to a different, already-accepted customer).
        setAgreementAccepted(false);
        setStep(data.agreementRequired ? "agreement" : "slots");
      } else {
        setDeadEnd({ kind: data.status as DeadEndKind, saved: !!data.saved });
        setStep("dead_end");
      }
    } catch {
      setError("We couldn't check availability just now. Please try again.");
    } finally {
      setBusy(false);
    }
  }

  const runCreateBooking = useCallback(
    async (
      d: BookingDetails,
      choice: { slot: OfferedSlotView; useExistingCard: boolean },
      pay: PaymentSetupResult | null
    ) => {
      setStep("submitting");
      setError(null);
      const res = await createBooking({
        details: {
          fullName: d.fullName,
          email: d.email,
          phone: d.phone,
          address: d.address,
          iceMakerBrand: d.iceMakerBrand,
          iceMakerModel: d.iceMakerModel,
        },
        chosenSlot: { slotDate: choice.slot.slotDate, arrivalBlock: choice.slot.arrivalBlock },
        useExistingCard: choice.useExistingCard,
        payment: pay ? { setupIntentId: pay.setupIntentId, stripeCustomerId: pay.stripeCustomerId } : undefined,
        agreement: agreementAccepted
          ? { accepted: true, version: SERVICE_AGREEMENT_VERSION }
          : undefined,
        quotesOptIn: d.quotesOptIn,
      });
      setResult(res);

      if (res.ok) {
        setStep("done");
        return;
      }

      // Slot got taken mid-flow — refresh the list and send them back to pick again.
      if (res.slotTaken) {
        const fresh = await fetchAvailability(d);
        if (fresh.status === "ok") {
          setAvailability({
            slots: fresh.slots,
            matchedCustomer: fresh.matchedCustomer,
            agreementRequired: fresh.agreementRequired,
            agreementStale: fresh.agreementStale,
          });
        }
        setChosen(null);
        setError(res.error);
        setStep("slots");
        return;
      }

      setError(res.error);
      setStep("slots");
    },
    [fetchAvailability, agreementAccepted]
  );

  function handleSlotContinue(choice: { slot: OfferedSlotView; useExistingCard: boolean }) {
    if (!details) return;
    setChosen(choice);
    if (choice.useExistingCard) {
      void runCreateBooking(details, choice, null);
    } else {
      setStep("payment");
    }
  }

  const handlePaymentComplete = useCallback(
    async (pr: PaymentSetupResult) => {
      setPayment(pr);
      if (details && chosen) await runCreateBooking(details, chosen, pr);
    },
    [details, chosen, runCreateBooking]
  );

  const paymentRequest = useMemo(
    () =>
      details
        ? ({
            context: "booking" as const,
            email: details.email,
            name: details.fullName,
            phone: details.phone,
          })
        : null,
    [details]
  );

  // ---- render ----
  if (step === "details") {
    return (
      <DetailsStep
        initial={details ?? undefined}
        busy={busy}
        error={error}
        onSubmit={handleDetails}
      />
    );
  }

  if (step === "dead_end" && deadEnd && details) {
    return (
      <DeadEndNotice
        kind={deadEnd.kind}
        saved={deadEnd.saved}
        details={{
          name: details.fullName,
          email: details.email,
          phone: details.phone,
          address: details.address,
          brand: details.iceMakerBrand,
          model: details.iceMakerModel,
        }}
        onBack={() => {
          setDeadEnd(null);
          setError(null);
          setStep("details");
        }}
      />
    );
  }

  if (step === "agreement" && availability) {
    return (
      <AgreementStep
        staleAcceptance={availability.agreementStale}
        busy={busy}
        error={error}
        onBack={() => {
          setError(null);
          setStep("details");
        }}
        onContinue={() => {
          setAgreementAccepted(true);
          setError(null);
          setStep("slots");
        }}
      />
    );
  }

  if (step === "slots" && availability) {
    return (
      <SlotStep
        slots={availability.slots}
        matchedCustomer={availability.matchedCustomer}
        busy={busy}
        error={error}
        onBack={() => {
          setError(null);
          setStep("details");
        }}
        onContinue={handleSlotContinue}
      />
    );
  }

  if (step === "payment" && details && paymentRequest) {
    return (
      <div style={{ display: "flex", flexDirection: "column", gap: "var(--space-4)" }}>
        <h1 style={{ fontSize: 22, margin: 0 }}>Payment</h1>
        <p style={{ color: "var(--color-fg-muted)", margin: 0 }}>
          We charge your card after each visit — nothing now.
        </p>
        <PaymentSetup
          request={paymentRequest}
          onComplete={handlePaymentComplete}
          submitLabel="Confirm booking"
          completingLabel="Booking your visit…"
        />
        <button
          type="button"
          onClick={() => {
            setError(null);
            setStep("slots");
          }}
          style={{ ...secondaryButtonStyle, width: "auto" }}
        >
          Back
        </button>
      </div>
    );
  }

  if (step === "submitting") {
    return <p style={{ color: "var(--color-fg-muted)" }}>Booking your visit…</p>;
  }

  if (step === "done" && result?.ok && details) {
    return (
      <BookedConfirmation
        scheduledDate={result.booking.scheduledDate}
        blockLabel={result.booking.blockLabel}
        address={details.address}
        token={result.booking.token}
      />
    );
  }

  return <ErrorBanner>Something went wrong. Please refresh and start over.</ErrorBanner>;
}
