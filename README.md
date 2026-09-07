# Rangeform

A focused poker study workspace: learn a concept, make a decision, inspect computed strategy feedback and keep your progress. Built in the private repository **mankenntmich3/poker-learning-platofmr**.

The initial training dataset is **genuinely computed Kuhn poker**, a small three-card game. It is visibly identified in the interface and is not an NLHE GTO dataset. The Hold'em range explorer teaches the 169 hand classes and 1,326 exact combinations without presenting invented opening frequencies.

![Rangeform study dashboard](docs/qa/dashboard-desktop.png)

See the [acceptance results and mobile screenshots](docs/qa/README.md).

## Run locally

Requirements: Node.js 24 and pnpm 10.28.2.

```sh
pnpm install --frozen-lockfile
pnpm dev
```

Open [127.0.0.1:3000](http://127.0.0.1:3000), create your own account, complete the Academy lesson and start training. No cloud credentials are required locally. PostgreSQL-compatible PGlite saves accounts and learning progress under `.data/postgres`. This directory is private local data and is excluded from Git.

Do not run multiple app processes against the same embedded database. Hosted environments use `DATABASE_URL` for real PostgreSQL and a canonical HTTPS `APP_ORIGIN`. See [.env.example](.env.example) and [operations](docs/operations.md).

## Verify

```sh
pnpm typecheck
pnpm lint
pnpm test
pnpm build
pnpm exec playwright install chromium
pnpm test:e2e
```

The browser suite starts the production build on loopback with an isolated local database. GitHub CI provides a real PostgreSQL service for the same browser flow. Production credentials must never be used for tests.

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
