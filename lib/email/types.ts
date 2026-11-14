export type BuiltEmail = {
  to: string;
  // The customer this email is for — lets the sender add their additional emails (lib/email/recipients.ts).
  customerId?: string;
  subject: string;
  html: string;
  text: string;
  replyTo?: string;
  attachments?: { filename: string; content: Buffer }[];
};
