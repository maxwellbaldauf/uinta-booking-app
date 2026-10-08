"use client";

import { useCallback, useMemo, useState } from "react";
import { PaymentSetup, type PaymentSetupResult } from "@/components/payment/PaymentSetup";
import { createBooking, type CreateBookingResponse } from "@/app/book/actions";
import { ErrorBanner, secondaryButtonStyle } from "@/components/ui/form";
import { DetailsStep, type BookingDetails } from "./DetailsStep";
import { AgreementStep } from "./AgreementStep";
import { HeardAboutStep } from "./HeardAboutStep";
import type { HeardAboutAnswer } from "@/lib/heardAbout";
import { SlotStep, type OfferedSlotView } from "./SlotStep";
import { DeadEndNotice, type DeadEndKind } from "./DeadEndNotice";
import { BookedConfirmation } from "./BookedConfirmation";
import { SERVICE_AGREEMENT_VERSION } from "@/lib/agreement";

// New public bookings are residential, one block - the server enforces the same.
const SERVICE_TYPE = "residential" as const;

type Step =
  | "details"
  | "source"
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
  sourceRequired: boolean;
};

export function BookingFlow({ basePriceCents }: { basePriceCents: number | null }) {
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
  // "How did you hear about us?" - only asked of first-time bookers; the server
  // decides (sourceRequired) and re-validates on submit.
  const [heardAbout, setHeardAbout] = useState<HeardAboutAnswer | null>(null);
  // True when the server bounced a finished booking back to the source step: on
  // continue, re-submit it (slot and payment are still held) instead of walking
  // the slot / payment steps again.
  const [resumeBooking, setResumeBooking] = useState(false);
  const [result, setResult] = useState<CreateBookingResponse | null>(null);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const fetchAvailability = useCallback(async (d: BookingDetails) => {
    const res = await fetch("/api/booking/availability", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ ...d, serviceType: SERVICE_TYPE }),
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
          sourceRequired: !!data.sourceRequired,
        });
        // Never submit an answer the server isn't asking for (e.g. the email was
        // changed to an existing customer's).
        if (!data.sourceRequired) setHeardAbout(null);
        // Re-check on every details submit — never carry a stale acceptance
        // (e.g. the email was changed to a different, already-accepted customer).
        setAgreementAccepted(false);
        setStep(
          data.sourceRequired ? "source" : data.agreementRequired ? "agreement" : "slots"
        );
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
      pay: PaymentSetupResult | null,
      // Used when resuming right after the source step, before state has settled.
      answerOverride?: HeardAboutAnswer
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
        serviceType: SERVICE_TYPE,
        chosenSlot: { slotDate: choice.slot.slotDate, arrivalBlock: choice.slot.arrivalBlock },
        useExistingCard: choice.useExistingCard,
        payment: pay ? { setupIntentId: pay.setupIntentId, stripeCustomerId: pay.stripeCustomerId } : undefined,
        agreement: agreementAccepted
          ? { accepted: true, version: SERVICE_AGREEMENT_VERSION }
          : undefined,
        quotesOptIn: d.quotesOptIn,
        heardAbout: answerOverride ?? heardAbout ?? undefined,
      });
      setResult(res);

      if (res.ok) {
        setStep("done");
        return;
      }

      // The server says the "how did you hear about us" answer is missing or
      // invalid - back to that step; details, slot and payment are all kept.
      if (res.sourceRequired) {
        setError(res.error);
        setResumeBooking(true);
        setStep("source");
        return;
      }

      // Agreement wasn't accepted / was a stale version — back to the agreement
      // step, where the error message (incl. the "refresh" hint) is shown.
      if (res.agreementRequired) {
        setAgreementAccepted(false);
        setError(res.error);
        setStep("agreement");
        return;
      }

      // A contact field failed server validation — only the details step can fix it.
      if (res.contactInvalid) {
        setError(res.error);
        setStep("details");
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
            sourceRequired: !!fresh.sourceRequired,
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
    [fetchAvailability, agreementAccepted, heardAbout]
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
      if (details && chosen) {
        await runCreateBooking(details, chosen, pr);
      }
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

  if (step === "source" && availability) {
    return (
      <HeardAboutStep
        initial={heardAbout}
        error={error}
        onBack={() => {
          setError(null);
          setStep("details");
        }}
        onContinue={(answer) => {
          setHeardAbout(answer);
          setError(null);
          if (resumeBooking && details && chosen) {
            setResumeBooking(false);
            void runCreateBooking(details, chosen, payment, answer);
            return;
          }
          setStep(availability.agreementRequired ? "agreement" : "slots");
        }}
      />
    );
  }

  if (step === "agreement" && availability) {
    return (
      <AgreementStep
        staleAcceptance={availability.agreementStale}
        error={error}
        onBack={() => {
          setError(null);
          setStep(availability.sourceRequired ? "source" : "details");
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
        basePriceCents={basePriceCents}
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
