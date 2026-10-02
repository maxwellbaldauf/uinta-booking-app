import { NextResponse } from "next/server";
import { checkAvailability, isServiceType } from "@/lib/booking";
import { firstContactError } from "@/lib/contactValidation";
import type { LeadDetails } from "@/lib/leads";
import { allowLeadWrite, clientIpFromHeaders } from "@/lib/chat/rateLimit";

export const runtime = "nodejs";

// POST { fullName, email, phone, address, iceMakerBrand, iceMakerModel, serviceType }
// -> geocode + explicit service-area check + open-slot lookup (spec §1–2).
// On the out_of_area / no_availability dead ends it also persists a flagged
// lead for Project A's dashboard (the response's `saved` says so).
function isNonEmpty(v: unknown): v is string {
  return typeof v === "string" && v.trim().length > 0;
}

export async function POST(req: Request) {
  let body: Partial<LeadDetails> & { serviceType?: unknown };
  try {
    body = (await req.json()) as Partial<LeadDetails> & { serviceType?: unknown };
  } catch {
    return NextResponse.json({ error: "Invalid request body" }, { status: 400 });
  }

  // Same rules DetailsStep enforces, checked before any geocoding or lead save
  // so a bad contact never reaches the DB.
  const contactError = firstContactError(body);
  if (contactError || !isNonEmpty(body.email) || !isNonEmpty(body.address)) {
    return NextResponse.json(
      { error: `${contactError ?? "Please check your details"}.` },
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
    // Per-IP cap on lead CAPTURE only (its own 5/hour budget, spent only when a
    // lead row is actually about to be written). Over the cap just skips the
    // save; availability itself is never limited.
    const ip = clientIpFromHeaders(req.headers);
    const result = await checkAvailability(details, body.serviceType, {
      allowLeadCapture: () => allowLeadWrite(ip, "inarea"),
    });
    const saved =
      result.status === "out_of_area" || result.status === "no_availability"
        ? true
        : result.status === "ok" && !!result.leadCaptured;
    return NextResponse.json({ ...result, saved });
  } catch (err) {
    console.error("availability route error", err);
    return NextResponse.json(
      { error: "We couldn't check availability just now. Please try again." },
      { status: 500 }
    );
  }
}
