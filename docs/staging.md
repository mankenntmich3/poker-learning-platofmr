# Private staging — Render Free + Neon Free

Status: **online and authenticated learning verified** (2026-09-10). Stable HTTPS: [rangeform-staging.onrender.com](https://rangeform-staging.onrender.com). Render confirmed `Deploy succeeded | Live`; `/api/health` verified the real PostgreSQL database and NLHE artifact. The owner created a personal account and completed the final logout/login handoff.

## Deployed resources

- Render Free web service: `rangeform-staging`, ID `srv-dagro2rl550s73e5suc0`, Frankfurt, Node 24.21.0, branch `main`.
- Initial live revision: `a408c2981bf25b43d08c134b87f0a4f9fac3e1a2`, deploy `dep-dagro3jl550s73e5t190`, 2026-09-09 at 22:07 CEST.
- Neon Free project: `rangeform-staging` (`green-base-17157640`), AWS Frankfurt, PostgreSQL 18, dedicated database `neondb`. The provider-created branch is called `production`; it holds only this staging application, not existing production data.
- Both provider accounts belong to the owner. Database and invitation credentials exist only in the provider configuration, never in this repository.

Verified public HTTPS checks: health `ok`, database `postgresql/ready`, NLHE policy `nlhe-approx-v1-34a10890a8dd`, invitation required, protected progress returns 401 while logged out, uninvited registration returns 403, and development demo login returns 401. The browser redirects a logged-out visitor to `/login?next=%2F`. No hosted demo account is seeded.

## Authenticated hosted acceptance — 2026-09-10

The real hosted browser completed Academy → course → lesson/quiz, then selected a 25 BB SB-vs-BTN open-response range and switched to 40 BB. All 169 cells were available; a suited hand's detail panel showed four combinations and the displayed 75/25 mix. Starting from that range produced a new session with the exact 40 BB context and actual Hold'em hole cards. Submitting an action returned policy feedback; explicit completion survived a full page reload.

The bounded 100 BB BTN-vs-BB flop also opened, generated a hand without board collisions, accepted check and returned check/bet feedback. Its completed session appeared in the dashboard. An existing unfinished session was preserved. These two explicit acceptance sessions remain visible in the owner's progress; they are test activity, not evidence of independently completed study by the owner.

After actual UI logout, the owner logged in again using their private password. The complete dashboard progress summary matched its pre-logout value exactly, and the completed preflop session reopened successfully. A previously saved flop question and feedback also survived Render's observed free-tier sleep/wake cycle on the following day. No browser cookies, personal account identifiers, passwords or session URLs are recorded in Git.

Render's active application revision was verified as `a408c2981bf25b43d08c134b87f0a4f9fac3e1a2`, with a successful automatic deploy `dep-dagrq2mk1f9s73fnaotg` after its first deploy. Later repository checks also passed in [GitHub run 34399476527](https://github.com/mankenntmich3/poker-learning-platofmr/actions/runs/34399476527), documentation/build-recipe revision `e81d499ef77f26b2ca18f56938ec7ed69cdfc80c`; application code is identical. The local development setup remains separate and functional. A hosted backup restore drill, email recovery and always-on availability remain outside this free private milestone.

## Ownership and limits

Both accounts belong to the owner. The private GitHub repository remains the source of truth. Render gets access only to this selected repository. No payment method, paid compute, paid database, domain purchase or extra hosted service is required for this staging plan.

Render Free provides a stable `onrender.com` HTTPS address but sleeps after 15 minutes without inbound traffic; waking can take about a minute. It also has monthly resource limits. Neon Free is managed PostgreSQL with no fixed trial expiry and finite storage/compute quotas. This is suitable for occasional private study/development, not guaranteed always-on availability. Do not use Render's free PostgreSQL for persistence: that database expires after 30 days. Sources checked 2026-09-08: [Render Free](https://render.com/docs/free), [Neon pricing](https://neon.com/pricing).

## Setup

1. Use the dedicated Neon Free project `rangeform-staging`, AWS Frankfurt, PostgreSQL 18, database `neondb`. No existing production database is involved.
2. Import `render.yaml` from this private repository into the owner's Render workspace. Confirm web compute **Free**, Frankfurt, branch `main`, and deployment after successful checks. Build with `corepack enable && pnpm install --frozen-lockfile --prod=false && pnpm build`; the explicit install flag retains TypeScript/build dependencies even with `NODE_ENV=production`. Start with `pnpm start:hosted`.
3. Enter the **direct, non-pooled** Neon connection string as secret `DATABASE_URL`. Use certificate-verifying TLS (`sslmode=verify-full`). The startup migrator holds a session advisory lock, so the transaction-pooler address is not suitable for schema initialization.
4. `pnpm start:hosted` uses Render's assigned HTTPS `RENDER_EXTERNAL_URL` as `APP_ORIGIN` when `RENDER=true`. A custom domain requires an explicit exact HTTPS `APP_ORIGIN` without a path. Set `STAGING_MODE=true`; let Render generate secret `STAGING_INVITE_CODE` (at least 24 characters). Pin `NODE_VERSION=24`. Never set `ALLOW_LOCAL_DB`, `DATA_DIR`, `TEST_DATABASE_URL`, `DEV_AUTH_BYPASS` or development credentials on the host.
5. Deploy. The server binds `0.0.0.0:$PORT`. Its first database access applies ordered, idempotent SQL migrations. To explicitly apply them in an environment holding the hosted secret, use `pnpm db:migrate:hosted`. This command does not seed accounts.
6. Verify `/api/health`: database `postgresql`, strategy game `nlhe`, source `APPROXIMATED`. The hosting health check is `/api/live`, which avoids repeatedly waking the database.
7. Create a personal application account using the staging invitation, then choose a private password. Never use the local demo credentials on the host. The invitation is only needed for signup; subsequent login uses the personal account. Keep the invitation in the owner's password manager and host secret store. Rotating it does not revoke existing accounts; account/session management remains separate.
8. Verify the full browser flow, logout/relogin, service restart and retained progress. Record the resulting HTTPS URL and actual evidence here after success.

The login page is publicly reachable, while Academy, ranges, training and account APIs require authentication. Signup requires the unadvertised invitation. This is application-level private staging, not an IP-restricted network. `robots.txt` discourages indexing but is not an access control.

## Continued development

Use local PGlite and the demo seed for daily work. Push changes through reviewed branches; merge only after CI passes. Render follows `main` after successful checks. SQL changes must remain backwards compatible with the preceding deployment, and training snapshots preserve earlier range versions. Never run local reset/seed against Neon. Local commands explicitly reject `DATABASE_URL`.

For recovery, export personal account progress and use Neon restore facilities within its free retention window. Before broad sharing or production use, choose a budget for dependable uptime, backups and monitoring and test a database restore. No production-readiness or availability guarantee is implied by a successful staging deploy.
