import Link from "next/link";
import { getVisitByToken } from "@/lib/visit";

export const dynamic = "force-dynamic";

function formatDate(iso: string): string {
  const [y, m, d] = iso.split("-").map(Number);
  const dt = new Date(Date.UTC(y, m - 1, d));
  const wd = ["Sunday", "Monday", "Tuesday", "Wednesday", "Thursday", "Friday", "Saturday"][dt.getUTCDay()];
  const mo = ["January","February","March","April","May","June","July","August","September","October","November","December"][dt.getUTCMonth()];
  return `${wd}, ${mo} ${d}`;
}

// Minimal portal for step 2 — shows the appointment so the confirmation link
// isn't dead. Reschedule + cancel land in step 4.
export default async function VisitPage({ params }: { params: { token: string } }) {
  const visit = await getVisitByToken(params.token);

  if (!visit) {
    return (
      <main className="page">
        <h1 style={{ fontSize: 22 }}>This link has expired</h1>
        <p style={{ color: "var(--color-fg-muted)" }}>
          Reschedule and cancellation links expire after your visit. Please
          contact us if you need to make a change.
        </p>
        <Link href="/contact" style={{ color: "var(--color-primary)" }}>
          Contact us
        </Link>
      </main>
    );
  }

  const cancelled = visit.status === "cancelled";

  return (
    <main className="page">
      <h1 style={{ fontSize: 22, marginBottom: "var(--space-4)" }}>Your visit</h1>

      <div
        style={{
          border: "1px solid var(--color-border)",
          borderRadius: "var(--radius)",
          padding: "var(--space-4)",
          display: "flex",
          flexDirection: "column",
          gap: "var(--space-2)",
          opacity: cancelled ? 0.6 : 1,
        }}
      >
        <div style={{ fontSize: 18, fontWeight: 600 }}>{formatDate(visit.scheduledDate)}</div>
        <div style={{ color: "var(--color-fg-muted)" }}>
          Arrival window: {visit.arrivalWindowLabel}
        </div>
        <div style={{ color: "var(--color-fg-muted)" }}>{visit.address}</div>
        {cancelled && <div style={{ color: "var(--color-danger)", fontWeight: 600 }}>Cancelled</div>}
      </div>

      {!cancelled && (
        <p style={{ color: "var(--color-fg-muted)", marginTop: "var(--space-4)" }}>
          Need to reschedule or cancel? That&apos;s coming soon — for now, contact
          us and we&apos;ll take care of it.
        </p>
      )}
      <Link
        href="/contact"
        style={{ color: "var(--color-primary)", display: "inline-block", marginTop: "var(--space-3)" }}
      >
        Contact us
      </Link>
    </main>
  );
}
