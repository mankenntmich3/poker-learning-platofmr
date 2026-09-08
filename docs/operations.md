# Development and operations

## Environment separation

Development uses `.data/postgres` and checked-in computed solution artifacts. Tests use isolated in-memory PostgreSQL and an isolated browser database directory. Staging and production must each use their own PostgreSQL, storage location, secrets, canonical HTTPS origin and backups. Never reuse a production database for local tests. The environment example contains no secrets.

The application does not provision infrastructure. Hosting, domain registration, email delivery and paid compute have not been purchased or configured. A production build passing does not establish commercial readiness.

## Startup and health

For local development, follow [LOCAL DEVELOPMENT — QUICK START](../README.md#local-development--quick-start): `pnpm install --frozen-lockfile`, `pnpm db:setup`, `pnpm db:migrate`, `pnpm db:seed`, then `pnpm dev`. Setup creates the local environment file and database. The seeded demo uses real authentication and is allowed only in local development; no bypass exists. Stop the server before reseeding or resetting. `pnpm db:reset --confirm` clears all local accounts and progress, and `pnpm db:seed` then recreates the demo. These local commands reject production mode and `DATABASE_URL`.

Use Node 24 and the pinned pnpm version. Install from the lockfile, run the quality gates and start the app. A hosted environment must supply `DATABASE_URL` and `APP_ORIGIN`; see the configuration checks in the server code. The local-preview flag is for running a production build on your own machine and must not be used for horizontal deployments.

`pnpm typecheck` first generates Next.js route/environment types, so a fresh checkout does not require a previous build. The generated `next-env.d.ts` is ignored: development and production legitimately reference different generated paths. Next.js's managed guidance block is retained in `AGENTS.md` alongside the project rules.

`GET /api/health` is a readiness check for the application, database and strategy storage. Unconfigured queues and solver workers must be represented as inactive, not healthy services. Worker execution is a separate command and never part of a trainer request.

## Backups and recovery

For local development, stop the application before copying the embedded database directory. Never take a raw filesystem copy of an active PGlite instance. Keep backups outside Git and protect them like credentials because they contain account records and progress.

For hosted PostgreSQL, configure automated encrypted backups and point-in-time recovery with an explicit retention policy. For solution artifacts, enable bucket versioning and immutable version names. Re-run checksum/semantic validation after restore, before publishing the library. Test a restore into an isolated environment and verify account login, lesson completion, decision counts and solution checksums before declaring recovery successful. Hosted restore and load tests are not completed in this milestone.

## Data retention

The application collects only account fields and learning decisions needed for the study flow. No third-party analytics or marketing cookies are installed. Sessions expire and account deletion removes owned progress. Store only token hashes in the database. Deployment owners must set a lawful retention policy, backup expiry and processor agreements before public release. This document is operational guidance, not generated legal terms.

## Monitoring and failure handling

Server failures carry request IDs and structured log records. Integrate those records with a real external error/tracing sink before production; console output alone is not a completed monitoring setup. Monitor latency, database saturation, failed requests, storage integrity, backup freshness, solver validation failures and worker jobs. No fabricated observability dashboard is included.

## Release gates

CI installs dependencies, typechecks, lints, runs domain/solver and SQL integration tests, builds the application and exercises browser flows. Do not merge a failed run. Before a public release: complete target PostgreSQL testing, email verification/reset delivery, session/security review, legal/content review, rate-limit/load validation, backup restore drill, monitoring setup and deployment-specific headers. There is no payment or real-money feature to enable in this release.
