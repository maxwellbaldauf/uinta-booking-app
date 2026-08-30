import Link from "next/link";
import { getVisitByToken } from "@/lib/visit";
import { VisitPortal } from "@/components/visit/VisitPortal";

export const dynamic = "force-dynamic";

// The magic-link portal (spec §3): view the appointment, reschedule, or cancel.
// Public — the token is the only authorization. Expired/unknown token gets a
// friendly page, never a raw error.
export default async function VisitPage({ params }: { params: { token: string } }) {
  const visit = await getVisitByToken(params.token);

  if (!visit) {
    return (
      <main className="page">
        <h1 style={{ fontSize: 22 }}>This link has expired</h1>
        <p style={{ color: "var(--color-fg-muted)" }}>
          Reschedule and cancellation links expire the day after your visit. If
          you still need to make a change, get in touch.
        </p>
        <Link href="/contact" style={{ color: "var(--color-primary)" }}>
          Contact us
        </Link>
      </main>
    );
  }

  return (
    <main className="page">
      <VisitPortal
        visit={{
          token: params.token,
          status: visit.status,
          scheduledDate: visit.scheduledDate,
          arrivalWindowLabel: visit.arrivalWindowLabel,
          address: visit.address,
          canModify: visit.canModify,
        }}
      />
    </main>
  );
}
