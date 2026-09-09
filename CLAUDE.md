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
   hand), then fast-forward `master` and `git push origin master`. The GitHub
   remote (`origin` → `github.com/maxwellbaldauf/uinta-booking-app`) tracks
   `master` directly — no PR step; the `.githooks/pre-push` checks are the gate.

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

<!-- BEGIN:nextjs-agent-rules -->

# This is NOT the Next.js you know

This version has breaking changes — APIs, conventions, and file structure may all differ from your training data. Read the relevant guide in `node_modules/next/dist/docs/` (resolved from this file's directory; in monorepos the `next` package may not be visible from the repo root) before writing any code. Heed deprecation notices.

This block is written and re-added by `next dev` — verify at `node_modules/next/dist/server/lib/generate-agent-files.js`. Removing it from a diff only re-creates the uncommitted change; committing it with your work keeps the tree clean.

<!-- END:nextjs-agent-rules -->
