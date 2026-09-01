# uinta-booking-app — working agreement

Public booking / payment / customer-portal app for Uinta Ice Co. Next.js 14 App
Router, Netlify, shared Supabase + Stripe + Resend with `../uinta-field-app`.
See `README.md` for architecture and build history.

## Change process — no direct commits to `master`

1. Feature work goes on a branch.
2. Before it is "done", and again before any release:
   - `/security-review`
   - `/code-review` — `high` for a feature, `max` for a release (`/code-review
     ultra` is billed and user-triggered; recommend it for a big release)
   - New / changed logic covered by tests where practical; `npx tsc --noEmit`,
     `npm run lint`, and `npm run build` all green. Never report "done" on red —
     show the failure output.
3. Triage findings with Max, apply the clear ones (`/code-review --fix` or by
   hand), then fast-forward `master`. This repo has no GitHub remote yet, so
   there is no PR step.

Trivial change (one-liner, comment, config)? `tsc` + `lint` + a quick read is
enough — skip the full review pass.

## Tests

- **No new Playwright / E2E tests.** This repo has none; keep it that way.
- Cheap unit tests for tricky pure logic (date math, parsers, the Kit retry
  path, `.ics` output) are welcome — propose adding Vitest first, do not assume
  it, do not backfill coverage.
- Manual testing is Max's. Booking-flow test customers use
  `maxwellbbaldauf+booking@gmail.com` (plus-addressing, never the bare address).

## Enforcement

`.githooks/pre-push` blocks a push on failing `tsc --noEmit` or `next lint`
(fast checks only — `next build` is covered by the pre-release review and the
Netlify deploy). Activated by `git config core.hooksPath .githooks`, which the
`prepare` npm script runs after `npm install`. Emergency bypass:
`git push --no-verify`.

## Inviolable

- Every route runs server-side with the Supabase **service-role key** and does
  its own token / auth check — RLS blocks anon and is not the boundary. No login
  anywhere.
- Do **not** modify the shared Supabase schema from this repo — the field app
  owns migrations.
- Plain CSS against the tokens in `app/globals.css`; no framework. Mobile-first.
