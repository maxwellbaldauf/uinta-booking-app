import { randomBytes } from "crypto";

// URL-safe, ~32 chars, ~144 bits. Used for the imported-customer
// payment_setup_token. (jobs.access_token uses crypto.randomUUID() to match
// what Project A's recurring scheduler writes.)
export function newPaymentSetupToken(): string {
  return randomBytes(24).toString("base64url");
}

// Days from now, as an ISO timestamp — for *_token_expires_at columns.
export function expiresInDays(days: number): string {
  return new Date(Date.now() + days * 24 * 60 * 60 * 1000).toISOString();
}
