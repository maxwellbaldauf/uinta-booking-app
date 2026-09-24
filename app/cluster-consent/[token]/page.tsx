import Link from "next/link";
import { getClusterConsentByToken } from "@/lib/clusterConsent";
import { ClusterConsentPortal } from "@/components/clusterConsent/ClusterConsentPortal";

export const dynamic = "force-dynamic";

// The magic-link consent portal for a geographic-clustering suggestion on
// an already-scheduled job — public, token-is-the-only-auth, same model as
// /visit/[token]. Distinct route (not a mode of /visit/[token]) because the
// consent_token has different expiry semantics than jobs.access_token (see
// supabase/cluster-suggestion-jobs.sql).
export default async function ClusterConsentPage({
  params,
}: {
  params: Promise<{ token: string }>;
}) {
  const { token } = await params;
  const consent = await getClusterConsentByToken(token);

  if (!consent || consent.status !== "pending") {
    return (
      <main className="page">
        <h1 style={{ fontSize: 22 }}>This suggestion is no longer available</h1>
        <p style={{ color: "var(--color-fg-muted)" }}>
          This link may have expired, already been responded to, or the suggested time is no
          longer open. Your visit stays as originally scheduled unless you hear otherwise from us.
        </p>
        <Link href="/contact" style={{ color: "var(--color-primary)" }}>
          Contact us
        </Link>
      </main>
    );
  }

  return (
    <main className="page">
      <ClusterConsentPortal
        token={token}
        originalDate={consent.originalDate}
        originalArrivalBlock={consent.originalArrivalBlock}
        proposedDate={consent.proposedDate}
        proposedArrivalBlock={consent.proposedArrivalBlock}
        blocksNeeded={consent.blocksNeeded}
        deadline={consent.deadline}
      />
    </main>
  );
}
