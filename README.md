# Rangeform

A focused poker study workspace: learn a concept, make a decision, inspect computed strategy feedback and keep your progress. Built in the private repository **mankenntmich3/poker-learning-platofmr**.

The initial training dataset is **genuinely computed Kuhn poker**, a small three-card game. It is visibly identified in the interface and is not an NLHE GTO dataset. The Hold'em range explorer teaches the 169 hand classes and 1,326 exact combinations without presenting invented opening frequencies.

![Rangeform study dashboard](docs/qa/dashboard-desktop.png)

See the [local access acceptance results and mobile screenshots](docs/qa/local-access.md).

## LOCAL DEVELOPMENT — QUICK START

Requirements: Node.js 24, Git and pnpm 10.28.2. If pnpm is missing, install it once with `npm install --global pnpm@10.28.2`. Authenticate Git with your GitHub account to clone this private repository.

```sh
git clone https://github.com/mankenntmich3/poker-learning-platofmr.git
cd poker-learning-platofmr
pnpm install --frozen-lockfile
pnpm db:setup
pnpm db:migrate
pnpm db:seed
pnpm dev
```

Open **[http://localhost:3000](http://localhost:3000)**. The alternative [127.0.0.1:3000](http://127.0.0.1:3000) also works; each hostname keeps its own browser session. In an existing checkout, start with `pnpm install --frozen-lockfile` and the database commands above.

**Development demo login:** `demo@poker.local` / `Poker-Local-Demo-2026!`. Use the login form or **Mit Demo-Konto anmelden**. You can also choose **Konto erstellen** to register a personal account. The demo uses real password verification and database sessions; no authentication bypass is implemented.

`db:setup` creates `.env.local` from `.env.example` if absent and creates/migrates the local database. `db:migrate` is safe to repeat. `db:seed` creates or recovers the development demo and adds three explicitly labeled sample decisions evaluated by the existing solver; it preserves subsequent progress. `pnpm setup:local` combines setup and seed. No manual environment editing, mail provider, Docker or external database is required for local use.

**Try the product:** log in → Dashboard → Academy → **Kurs öffnen** → **Lektion öffnen** → read and answer the quiz → **Am Tisch anwenden** → **Trainingssitzung starten** → choose an action → read feedback → **Sitzung jetzt abschließen** → **Fortschritt ansehen**. A full session ends after twelve decisions. Log out under Einstellungen, log in again and confirm your saved progress.

PGlite stores data under `.data/postgres`, excluded from Git. The demo account is marked development-only in the database. Seed/reset commands refuse production mode and any `DATABASE_URL`; login and existing sessions for that account are rejected outside local development, even if its database is accidentally copied. Demo credentials and the instant-access button are absent from the production interface.

### Reset or reseed

Stop `pnpm dev` with **Ctrl+C** first. The database rejects a second application/CLI process while open.

To recover demo login without deleting your learning progress:

```sh
pnpm db:seed
pnpm dev
```

To delete **all local accounts and progress** and recreate the demo:

```sh
pnpm db:reset --confirm
pnpm db:migrate
pnpm db:seed
pnpm dev
```

Reset clears local tables and keeps the schema; it never recursively deletes files or touches a hosted database. A fresh clone starts without a database and recreates it with `db:setup`.

### Troubleshooting

- Wrong login: use the exact credentials above, or stop the server and run `pnpm db:seed` again.
- Database already open: stop the other development/test server before setup, migration, seed or reset. A process lock prevents concurrent PGlite access and recovers after a dead process.
- Cookies blocked: allow cookies for the chosen local address. The login screen verifies the session before navigating.
- Already using port 3000: stop that server, or use `pnpm dev --port 3001` and open `http://localhost:3001`.
- Stop the normal development server before running browser tests: Next.js allows one development server per checkout. `pnpm test:dev-access` starts its own server on port 3100 and an isolated test database.

All environment names and deployment-only settings are described in [.env.example](.env.example). Do not set `NODE_ENV` yourself for the normal quick start.

Do not run multiple app processes against the same embedded database. Hosted environments use `DATABASE_URL` for real PostgreSQL and a canonical HTTPS `APP_ORIGIN`. See [.env.example](.env.example) and [operations](docs/operations.md).

## Verify

```sh
pnpm typecheck
pnpm lint
pnpm test
pnpm build
pnpm exec playwright install chromium
pnpm test:e2e
pnpm test:dev-access
```

The regular browser suite starts a production build on loopback with an isolated local database. GitHub CI supplies PostgreSQL 16 for that flow. The separate development-access suite runs setup, migrations and demo seed before testing the actual development server, both loopback addresses, protected destinations, Academy, training completion and persistence. Production credentials must never be used for tests.

## Compute a solution

```sh
pnpm solve
```

The separate solver command creates a small Kuhn solution, measures exploitability with an independent best-response evaluator, validates and stores the artifact, then makes the version available to the strategy provider. See [solver architecture](docs/solver-architecture.md) and [strategy data](docs/strategy-data.md) for exact rules, provenance, versioning and limitations.

## Structure

```text
src/app         Next.js pages and API adapters
src/components  Study interface and accessible controls
src/domain      Framework-independent card/game rules
src/solver      Computation, independent evaluation and validation
src/strategy    Provider boundary and immutable artifact storage
src/server      Authentication, SQL and learning services
src/shared      Browser-safe request/response contracts
migrations      PostgreSQL schema
data/solutions  Computed, versioned strategy artifacts
tests           Domain, solver, integration and browser checks
docs            Product specification, decisions and project memory
```

Start future sessions with [project status](docs/PROJECT_STATUS.md), [architecture](docs/architecture.md), and the [complete product specification](docs/PRODUCT_SPEC.md). The specification describes the long-term product; the status file distinguishes implemented work from future scope.

This is a personal study release, not a public commercial launch. Broad NLHE solving, hand imports, leak analysis, AI coaching, subscription billing and distributed GPU workers are later milestones. There is no real-money functionality.
