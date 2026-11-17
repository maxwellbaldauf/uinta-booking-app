// Publishes a Google Business Profile "What's new" post THROUGH A MAKE.COM SCENARIO.
// Google denied direct Business Profile API access for this profile, so the post
// goes via Make's built-in Google Business Profile connection (Make is an
// approved Google partner). The scenario is:
//   Custom webhook  ->  Google Business Profile: Create a Post (CTA "Book", link)
//                   ->  Webhook response (200 + the created post's name)
// Env (Netlify, booking site):
//   MAKE_GBP_WEBHOOK_URL — the scenario's webhook URL (secret: anyone with it can post)
// Scheduling/spacing/retries are handled by content_drafts + lib/jobs/runGbpPosting.ts.
//
// Relative-import-free on purpose (bundled into Netlify functions).

const SUMMARY_MAX = 1500;
const TIMEOUT_MS = 20_000; // inside the scheduled function's 30 s budget

export function gbpConfigured(): boolean {
  return Boolean(process.env.MAKE_GBP_WEBHOOK_URL);
}

// Returns the created post's name (or Make's response text). Throws on failure.
export async function createGbpPost(summary: string, bookUrl: string): Promise<string> {
  let res: Response;
  try {
    res = await fetch(process.env.MAKE_GBP_WEBHOOK_URL!, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ summary: summary.slice(0, SUMMARY_MAX), bookUrl }),
      signal: AbortSignal.timeout(TIMEOUT_MS),
    });
  } catch (err) {
    // A timeout means Make got the request and may well have posted: treat it as
    // posted (unconfirmed) rather than retrying into a duplicate public post.
    if (err instanceof Error && err.name === "TimeoutError") return "unconfirmed (Make response timed out)";
    throw err;
  }
  const text = (await res.text().catch(() => "")).trim();
  // Make answers "Accepted" when the scenario has no Webhook response module (the
  // post may not have happened), and 4xx/5xx when the scenario or Google failed.
  if (!res.ok || !text || text === "Accepted") {
    throw new Error(`Make post failed: ${res.status} ${text}`.trim().slice(0, 400));
  }
  return text.slice(0, 300);
}
