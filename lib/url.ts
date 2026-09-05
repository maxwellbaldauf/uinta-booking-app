import { headers } from "next/headers";

// The public base URL for links we put in emails (the /visit/[token] portal).
//
// - If APP_BASE_URL is set, use it. Set it only once a real domain exists.
// - Otherwise derive it from the incoming request, so links in emails point at
//   whatever host you're actually on — localhost:<whatever-port> in dev, a
//   preview URL on a preview deploy, etc. No more swapping the domain by hand.
export async function getAppBaseUrl(): Promise<string> {
  const explicit = process.env.APP_BASE_URL?.trim();
  if (explicit) return explicit.replace(/\/$/, "");

  try {
    const h = await headers();
    const host = h.get("x-forwarded-host") ?? h.get("host");
    if (host) {
      const proto =
        h.get("x-forwarded-proto") ??
        (host.startsWith("localhost") || host.startsWith("127.0.0.1") ? "http" : "https");
      return `${proto}://${host}`;
    }
  } catch {
    // Called outside a request scope — fall through.
  }

  return "http://localhost:3000";
}
