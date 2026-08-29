import { notFound } from "next/navigation";

// Guard for dev-only routes and pages under /dev and /api/dev. These exist to
// test build steps in isolation and MUST NOT be reachable in production.
// Delete the /dev and /api/dev folders before the real launch.
export function assertDev(): void {
  if (process.env.NODE_ENV === "production") notFound();
}

export function isDev(): boolean {
  return process.env.NODE_ENV !== "production";
}
