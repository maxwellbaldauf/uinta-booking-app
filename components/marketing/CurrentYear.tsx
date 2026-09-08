"use client";

// Renders the current year. In a statically prerendered footer, `new Date()`
// on the server is frozen at build time; this re-reads it on the client so the
// copyright line stays current between deploys. suppressHydrationWarning covers
// the one day a year the two can disagree.
export function CurrentYear() {
  return <span suppressHydrationWarning>{new Date().getFullYear()}</span>;
}
