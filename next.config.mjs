// CSP allowlist, report-only for now (switches to enforcing once Max verifies
// a deploy preview with DevTools console open). Domain-allowlist only, no
// nonces — a nonce forces every page dynamic, which would take the four
// currently-static marketing pages down with it.
const CSP_REPORT_ONLY = [
  "default-src 'self'",
  "script-src 'self' https://js.stripe.com https://maps.googleapis.com https://plausible.io",
  "connect-src 'self' https://api.stripe.com https://maps.googleapis.com https://plausible.io",
  "frame-src https://js.stripe.com",
  "img-src 'self' data: https:",
  "style-src 'self'",
  "font-src 'self'",
  "frame-ancestors 'none'",
  "object-src 'none'",
  "base-uri 'self'",
].join("; ");

/** @type {import('next').NextConfig} */
const nextConfig = {
  turbopack: {
    root: process.cwd(),
  },
  // Stop announcing the framework to every visitor.
  poweredByHeader: false,
  // The booking confirmation email reads content/service-agreement-<version>.pdf
  // off disk at send time (lib/email/bookingConfirmation.ts). It isn't imported
  // anywhere, so file-tracing won't pick it up on its own — pull it into the
  // /book server bundle (that route hosts the createBooking server action).
  outputFileTracingIncludes: {
    "/book": ["./content/service-agreement-*.pdf"],
  },
  // Evaluated at build/deploy time, not per-request, so this doesn't force
  // any of the static marketing pages dynamic. HSTS is left alone — Netlify
  // already sends it as a platform default.
  async headers() {
    return [
      {
        source: "/:path*",
        headers: [
          { key: "X-Frame-Options", value: "DENY" },
          { key: "Referrer-Policy", value: "strict-origin-when-cross-origin" },
          {
            key: "Permissions-Policy",
            value: "camera=(), microphone=(), geolocation=()",
          },
          { key: "Content-Security-Policy-Report-Only", value: CSP_REPORT_ONLY },
        ],
      },
    ];
  },
};

export default nextConfig;
