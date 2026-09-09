# Uinta Ice Co — Booking App (Project B)

Public-facing booking, payment, and customer portal for Uinta Ice Co. Companion
to the internal field app (Project A, `../uinta-field-app`).

- **No login anywhere.** Every route is fully public or authorized by a
  one-time token. All server code uses the Supabase service-role key and is
  responsible for its own authorization.
- **Same Supabase project as Project A.** Do not modify the schema.
- Mobile-first. Plain CSS, no framework. Not a PWA (Project A is).
- Cards only via Stripe SetupIntents. No Stripe webhook here.
- Manual testing — no automated test suite.

## Setup

```
cp .env.local.example .env.local   # fill in values
npm install
npm run dev
```

`NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY` must be the test-mode `pk_test_…` from the
Stripe dashboard — Elements can't mount without it.

## Build order

1. Payment setup component — **done** (`components/payment/PaymentSetup.tsx`,
   `/api/payment/setup-intent`, `/api/payment/finalize`). Isolation harness at
   `/dev/payment-setup` (dev only; delete `app/dev` + `app/api/dev` before launch).
2. Booking flow
3. Confirmation email + `.ics` + same-day owner alert
4. Magic-link portal (reschedule / cancel)
5. Contact form + dead-end lead capture
6. Import payment-setup page (`/pay/[token]`)
7. Marketing placeholder + Plausible
8. AI chat widget — lead capture on the marketing pages
   (`components/chat/ChatWidget.tsx`, `app/api/chat`, `lib/chat/*`). Server-side
   Anthropic call (`claude-haiku-4-5`), grounded in `lib/faq.ts` + a curated
   supplement, writes leads through `submitContact()` into `contact_submissions`.
   Needs `ANTHROPIC_API_KEY`.
