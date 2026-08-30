"use client";

import { useCallback, useState } from "react";
import { buttonStyle, secondaryButtonStyle, ErrorBanner } from "@/components/ui/form";
import { SlotGrid, formatSlotDate, type OfferedSlotView } from "@/components/booking/SlotGrid";
import { CancelDialog } from "./CancelDialog";
import {
  getRescheduleOptions,
  rescheduleVisit,
  cancelVisit,
  type CancelScope,
} from "@/app/visit/[token]/actions";

export type VisitView = {
  token: string;
  status: string;
  scheduledDate: string;
  arrivalWindowLabel: string;
  address: string;
  canModify: boolean;
};

type Mode = "view" | "reschedule" | "cancel" | "rescheduled" | "cancelled";

export function VisitPortal({ visit }: { visit: VisitView }) {
  const [mode, setMode] = useState<Mode>(visit.status === "cancelled" ? "cancelled" : "view");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const [slots, setSlots] = useState<OfferedSlotView[] | null>(null);
  const [selected, setSelected] = useState<OfferedSlotView | null>(null);
  const [current, setCurrent] = useState({
    date: visit.scheduledDate,
    window: visit.arrivalWindowLabel,
  });
  const [cancelScope, setCancelScope] = useState<CancelScope>("visit");

  const openReschedule = useCallback(async () => {
    setMode("reschedule");
    setError(null);
    setSelected(null);
    setSlots(null);
    const res = await getRescheduleOptions(visit.token);
    if (!res.ok) {
      setError(res.error);
      setSlots([]);
      return;
    }
    setSlots(res.slots);
  }, [visit.token]);

  async function confirmReschedule() {
    if (!selected) return;
    setBusy(true);
    setError(null);
    const res = await rescheduleVisit(visit.token, {
      slotDate: selected.slotDate,
      arrivalBlock: selected.arrivalBlock,
    });
    setBusy(false);
    if (res.ok) {
      setCurrent({ date: res.scheduledDate, window: res.blockLabel });
      setMode("rescheduled");
      return;
    }
    setError(res.error);
    if (res.slotTaken) {
      const fresh = await getRescheduleOptions(visit.token);
      if (fresh.ok) setSlots(fresh.slots);
      setSelected(null);
    }
  }

  async function confirmCancel(scope: CancelScope) {
    setBusy(true);
    setError(null);
    setCancelScope(scope);
    const res = await cancelVisit(visit.token, scope);
    setBusy(false);
    if (res.ok) {
      setMode("cancelled");
      return;
    }
    setError(res.error);
  }

  // ---- render ----
  if (mode === "cancelled") {
    return (
      <div style={{ display: "flex", flexDirection: "column", gap: "var(--space-3)" }}>
        <h1 style={{ fontSize: 22, margin: 0 }}>Visit cancelled</h1>
        <p style={{ color: "var(--color-fg-muted)", margin: 0 }}>
          {cancelScope === "property"
            ? "This visit is cancelled and we've stopped the plan for this property. Your card stays on file — no charge."
            : "This visit is cancelled. Your semi-annual plan is still active and your next visit will schedule as usual."}
        </p>
        <p style={{ color: "var(--color-fg-muted)", margin: 0, fontSize: 13 }}>
          A confirmation email is on its way.
        </p>
      </div>
    );
  }

  if (mode === "rescheduled") {
    return (
      <div style={{ display: "flex", flexDirection: "column", gap: "var(--space-3)" }}>
        <h1 style={{ fontSize: 22, margin: 0 }}>Visit rescheduled</h1>
        <div
          style={{
            border: "1px solid var(--color-border)",
            borderRadius: "var(--radius)",
            padding: "var(--space-4)",
          }}
        >
          <div style={{ fontSize: 18, fontWeight: 600 }}>{formatSlotDate(current.date)}</div>
          <div style={{ color: "var(--color-fg-muted)" }}>Arrival window: {current.window}</div>
        </div>
        <p style={{ color: "var(--color-fg-muted)", margin: 0, fontSize: 13 }}>
          An updated confirmation and calendar invite are on the way. This same link
          still works if you need another change.
        </p>
      </div>
    );
  }

  if (mode === "cancel") {
    return (
      <CancelDialog
        address={visit.address}
        busy={busy}
        error={error}
        onBack={() => {
          setMode("view");
          setError(null);
        }}
        onConfirm={confirmCancel}
      />
    );
  }

  if (mode === "reschedule") {
    return (
      <div style={{ display: "flex", flexDirection: "column", gap: "var(--space-4)" }}>
        <div>
          <h1 style={{ fontSize: 22, margin: 0 }}>Pick a new time</h1>
          <p style={{ color: "var(--color-fg-muted)", margin: "4px 0 0" }}>
            Currently {formatSlotDate(visit.scheduledDate)}, {visit.arrivalWindowLabel}.
          </p>
        </div>

        {slots === null ? (
          <p style={{ color: "var(--color-fg-muted)" }}>Loading open times…</p>
        ) : (
          <SlotGrid slots={slots} selected={selected} onSelect={setSelected} />
        )}

        {error && <ErrorBanner>{error}</ErrorBanner>}

        <div style={{ display: "flex", gap: "var(--space-2)" }}>
          <button
            type="button"
            onClick={() => {
              setMode("view");
              setError(null);
            }}
            style={{ ...secondaryButtonStyle, width: "auto", padding: "14px 16px" }}
          >
            Back
          </button>
          <button
            type="button"
            disabled={!selected || busy}
            onClick={confirmReschedule}
            style={{ ...buttonStyle, opacity: !selected || busy ? 0.6 : 1 }}
          >
            {busy ? "Moving your visit…" : "Confirm new time"}
          </button>
        </div>
      </div>
    );
  }

  // mode === "view"
  return (
    <div style={{ display: "flex", flexDirection: "column", gap: "var(--space-4)" }}>
      <h1 style={{ fontSize: 22, margin: 0 }}>Your visit</h1>

      <div
        style={{
          border: "1px solid var(--color-border)",
          borderRadius: "var(--radius)",
          padding: "var(--space-4)",
          display: "flex",
          flexDirection: "column",
          gap: "var(--space-2)",
        }}
      >
        <div style={{ fontSize: 18, fontWeight: 600 }}>{formatSlotDate(current.date)}</div>
        <div style={{ color: "var(--color-fg-muted)" }}>Arrival window: {current.window}</div>
        <div style={{ color: "var(--color-fg-muted)" }}>{visit.address}</div>
      </div>

      {visit.canModify ? (
        <div style={{ display: "flex", gap: "var(--space-2)" }}>
          <button type="button" onClick={openReschedule} style={{ ...buttonStyle }}>
            Reschedule
          </button>
          <button
            type="button"
            onClick={() => {
              setMode("cancel");
              setError(null);
            }}
            style={{ ...secondaryButtonStyle }}
          >
            Cancel
          </button>
        </div>
      ) : (
        <p style={{ color: "var(--color-fg-muted)", margin: 0 }}>
          This visit can&rsquo;t be changed online anymore. Contact us if you need
          to make a change.
        </p>
      )}
    </div>
  );
}
