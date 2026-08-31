import { NextResponse } from "next/server";
import { isDev } from "@/lib/dev";
import { subscribeToQuotesList } from "@/lib/kit";

export const runtime = "nodejs";

// DEV ONLY. Fire the Kit daily-quotes opt-in against a real address so you can
// confirm KIT_API_KEY works and the subscriber lands in the "1% Better"
// sequence, without running a full booking with a live card.
//   POST { "email": "maxwellbbaldauf+kit@gmail.com" }
export async function POST(req: Request) {
  if (!isDev()) return NextResponse.json({ error: "Not found" }, { status: 404 });

  let body: { email?: string };
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: "bad body" }, { status: 400 });
  }
  if (!body.email) {
    return NextResponse.json({ error: "email required" }, { status: 400 });
  }

  const result = await subscribeToQuotesList(body.email);
  return NextResponse.json(result);
}
