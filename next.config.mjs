/** @type {import('next').NextConfig} */
const nextConfig = {
  turbopack: {
    root: process.cwd(),
  },
  // The booking confirmation email reads content/service-agreement-<version>.pdf
  // off disk at send time (lib/email/bookingConfirmation.ts). It isn't imported
  // anywhere, so file-tracing won't pick it up on its own — pull it into the
  // /book server bundle (that route hosts the createBooking server action).
  outputFileTracingIncludes: {
    "/book": ["./content/service-agreement-*.pdf"],
  },
};

export default nextConfig;
