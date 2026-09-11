import { NextResponse } from "next/server";
import { checkAvailability } from "@/lib/booking";
import type { LeadDetails } from "@/lib/leads";

export const runtime = "nodejs";

// POST { fullName, email, phone, address, iceMakerBrand, iceMakerModel, serviceType }
// -> geocode + explicit service-area check + open-slot lookup (spec §1–2).
// On the out_of_area / no_availability dead ends it also persists a flagged
// lead for Project A's dashboard (the response's `saved` says so).
function isNonEmpty(v: unknown): v is string {
  return typeof v === "string" && v.trim().length > 0;
}

function isServiceType(v: unknown): v is "residential" | "commercial" {
  return v === "residential" || v === "commercial";
}

export async function POST(req: Request) {
  let body: Partial<LeadDetails> & { serviceType?: unknown };
  try {
    body = (await req.json()) as Partial<LeadDetails> & { serviceType?: unknown };
  } catch {
    return NextResponse.json({ error: "Invalid request body" }, { status: 400 });
  }

  if (!isNonEmpty(body.email) || !isNonEmpty(body.address)) {
    return NextResponse.json(
      { error: "Email and address are required." },
      { status: 400 }
    );
  }

  if (!isServiceType(body.serviceType)) {
    return NextResponse.json({ error: "Invalid service type." }, { status: 400 });
  }

  const details: LeadDetails = {
    fullName: (body.fullName ?? "").trim(),
    email: body.email.trim(),
    phone: (body.phone ?? "").trim(),
    address: body.address.trim(),
    iceMakerBrand: (body.iceMakerBrand ?? "").trim(),
    iceMakerModel: (body.iceMakerModel ?? "").trim(),
  };

  try {
    const result = await checkAvailability(details, body.serviceType);
    const saved = result.status === "out_of_area" || result.status === "no_availability";
    return NextResponse.json({ ...result, saved });
  } catch (err) {
    console.error("availability route error", err);
    return NextResponse.json(
      { error: "We couldn't check availability just now. Please try again." },
      { status: 500 }
    );
  }
}
