# Blip: cloud kitchen platform

One monorepo, two web apps, one backend.

| App | Path | For | Port |
| --- | --- | --- | --- |
| Customer (installable PWA, mobile-first) | `apps/customer` | Browse, order, track | 3000 |
| Owner dashboard (desktop-first, login required) | `apps/admin` | Orders, menu, banners, settings | 3001 |
| Design system | `packages/ui` | Tokens and component CSS lifted from the three approved prototypes | |
| Data, pricing, auth, validation | `packages/db` | Types, Zod schemas, `priceCart`, Supabase + demo stores | |

Brand name, tagline and theme colour live in one place: [`packages/db/src/brand.ts`](packages/db/src/brand.ts).

## Run it in 2 minutes (demo mode)

No accounts needed. With no Supabase variables set, both apps share a small file store in `.data/`.

```bash
pnpm install
pnpm dev
```

Production builds (`pnpm build`, then `start`) refuse to run without Supabase on purpose, because demo mode has a known owner password. To try a production build locally, set `ALLOW_DEMO=1`.

Open <http://localhost:3000> (customer) and <http://localhost:3001> (owner). Demo sign-ins (demo mode only, defined in `packages/db/src/server/seed.ts`):

| Who | Email | Password |
| --- | --- | --- |
| Customer | `priya@example.com` | `priya-demo-123` |
| Owner | `owner@blip.test` | `owner-demo-123` |

Reset the data with `pnpm reset:demo` (restart the apps afterwards). Online payment uses a clearly labelled **demo gateway** page until Cashfree keys are set.

## Commands

```bash
pnpm dev          # both apps
pnpm build        # production builds
pnpm typecheck    # all packages
pnpm test         # pricing and helper unit tests (vitest)
pnpm e2e          # Playwright smoke test (build first; uses installed Chrome)
```

## Going live with Supabase

1. Create a Supabase project. In the SQL editor run `supabase/migrations/0001_init.sql`, then `supabase/seed.sql` (sample menu). With the CLI: `supabase link` then `supabase db push`.
2. **Auth → URL configuration**: add your customer domain and `https://<customer-domain>/auth/callback`. Keep email confirmation on.
3. Copy the three keys into both apps' environment (see below).
4. **Create the owner account.** Owners are never created through sign-up. Create the user in **Auth → Users** (or sign up once in the customer app), then promote them by hand:

   ```sql
   update public.profiles set role = 'owner' where email = 'you@yourdomain.com';
   ```

5. Open the admin domain and sign in with that email and password.

### Environment variables

| Variable | Apps | Notes |
| --- | --- | --- |
| `NEXT_PUBLIC_SUPABASE_URL`, `NEXT_PUBLIC_SUPABASE_ANON_KEY` | both | Public |
| `SUPABASE_SERVICE_ROLE_KEY` | both | **Server only.** Never prefix with `NEXT_PUBLIC_` |
| `SESSION_SECRET` | both | Demo mode only |
| `NEXT_PUBLIC_SITE_URL` | customer | Public customer URL, used for payment return and email links |
| `CASHFREE_ENV` (`sandbox`/`production`), `CASHFREE_APP_ID`, `CASHFREE_SECRET_KEY` | customer | **Server only.** Start with sandbox keys |
| `NEXT_PUBLIC_VAPID_PUBLIC_KEY`, `VAPID_PRIVATE_KEY`, `VAPID_SUBJECT` | both | `npx web-push generate-vapid-keys` |

Each app has a documented `.env.example`. Nothing secret is committed.

### Cashfree

In the Cashfree dashboard add the webhook `https://<customer-domain>/api/cashfree/webhook` for payment events. The handler verifies the signature against the raw body, checks the amount against the order, and ignores replays. The customer returning from checkout also triggers a server-side status check, so a slow webhook never leaves an order unpaid.

## Deploy: two Vercel projects from one repo

Create two projects from the same repository:

| | Customer | Admin |
| --- | --- | --- |
| Root Directory | `apps/customer` | `apps/admin` |
| Domain | `www.example.com` | `kitchen.example.com` |
| Install / build | defaults (pnpm is detected) | defaults |
| Extra setting | | Enable "Include source files outside of the Root Directory" on both |

Set the variables above on each project. The admin domain is never linked from the customer app, serves `noindex` headers, and every request is checked in `proxy.ts`, again in each server action, and finally by row-level security.

## How the brief is covered

- **Design**: the three prototypes' CSS is the system (`packages/ui/src/styles.css`). Cart, checkout, tracking, orders, account, login and the whole dashboard reuse the same classes, tokens, light and dark sets, 44px targets and Outfit type.
- **Money**: integer paise everywhere, `en-IN` grouping. `priceCart` is the single pricing function; the browser uses it for display and the server re-runs it from database prices before creating any order.
- **Security**: RLS on every table; customers cannot insert orders directly (the server does it with the service role after repricing); owner role is read from `profiles`; login, sign-up and order creation are rate limited (in memory, see note in `rate-limit.ts`); notes and addresses are stripped of control characters and angle brackets and validated with Zod.
- **Order flow**: forward-only statuses with a cancel-with-reason escape, an `order_events` row per change, COD marked collected by the owner, online orders hidden from the kitchen until paid.
- **Realtime**: Supabase Realtime when configured, otherwise a 4-5 second poll.
- **PWA**: manifest, generated icons, service worker (shell, last-viewed Home and Menu offline, push). Notification permission is requested only after the first order.

## Status against the milestones

| | Status |
| --- | --- |
| M0 Foundation, M1 Auth, M2 Admin catalog, M3 Browse, M4 Cart and COD, M5 Admin orders, M6 Tracking and payment, M7 PWA and push | Built |
| M8 Passkeys | **Not built on purpose.** The brief asks for a proposal first: [`docs/passkeys-proposal.md`](docs/passkeys-proposal.md) |
| M9 Polish | Partly: empty, loading and error states exist; no Lighthouse run and no formal accessibility audit yet |

## What has and has not been verified

- Verified: unit tests (10 passing), TypeScript strict on all packages, production builds of both apps, and a Playwright smoke test (browse → add → sign in → COD order → owner accepts, prepares, sends out, delivers, marks cash collected → customer sees Delivered) in demo mode.
- **Not verified against real services**: the Supabase store, SQL migration, Supabase Auth and Realtime, Cashfree, and Web Push have never run here (no accounts or keys). They are written to the same interfaces the demo store satisfies, but treat the first run against real keys as a test of those parts.
- Not set up: ESLint config, Lighthouse scores.
