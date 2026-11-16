// Minimal Google Business Profile client: create a "What's new" local post.
// Credentials are Netlify env vars (no schema, no UI):
//   GBP_CLIENT_ID, GBP_CLIENT_SECRET  — OAuth client (scope business.manage)
//   GBP_REFRESH_TOKEN                 — for the Google account that owns the profile
//   GBP_LOCATION                      — "accounts/{accountId}/locations/{locationId}"
// The Business Profile APIs must be enabled on the Cloud project AND approved by
// Google for that project (access request form) or every call returns 403/429.
//
// Relative-import-free on purpose (bundled into a Netlify function).

const SUMMARY_MAX = 1500;

export function gbpConfigured(): boolean {
  return Boolean(
    process.env.GBP_CLIENT_ID &&
      process.env.GBP_CLIENT_SECRET &&
      process.env.GBP_REFRESH_TOKEN &&
      process.env.GBP_LOCATION
  );
}

async function accessToken(): Promise<string> {
  const res = await fetch("https://oauth2.googleapis.com/token", {
    method: "POST",
    headers: { "Content-Type": "application/x-www-form-urlencoded" },
    body: new URLSearchParams({
      client_id: process.env.GBP_CLIENT_ID!,
      client_secret: process.env.GBP_CLIENT_SECRET!,
      refresh_token: process.env.GBP_REFRESH_TOKEN!,
      grant_type: "refresh_token",
    }),
  });
  const data = (await res.json().catch(() => ({}))) as { access_token?: string; error?: string };
  if (!res.ok || !data.access_token) {
    throw new Error(`GBP token refresh failed: ${res.status} ${data.error ?? ""}`.trim());
  }
  return data.access_token;
}

// Returns the created post's resource name. Throws with Google's error text on failure.
export async function createGbpPost(summary: string, bookUrl: string): Promise<string> {
  const token = await accessToken();
  const location = process.env.GBP_LOCATION!.replace(/^\/+|\/+$/g, "");
  const res = await fetch(`https://mybusiness.googleapis.com/v4/${location}/localPosts`, {
    method: "POST",
    headers: { Authorization: `Bearer ${token}`, "Content-Type": "application/json" },
    body: JSON.stringify({
      languageCode: "en-US",
      topicType: "STANDARD",
      summary: summary.slice(0, SUMMARY_MAX),
      callToAction: { actionType: "BOOK", url: bookUrl },
    }),
  });
  const data = (await res.json().catch(() => ({}))) as { name?: string; error?: { message?: string } };
  if (!res.ok || !data.name) {
    throw new Error(`GBP post failed: ${res.status} ${data.error?.message ?? ""}`.trim());
  }
  return data.name;
}
