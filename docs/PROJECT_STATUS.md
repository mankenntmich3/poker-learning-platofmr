# Project status

Repository: `mankenntmich3/poker-learning-platofmr` (confirmed spelling). Updated 2026-09-07.

## DONE — first complete learning flow

- Verified private repository read/write access. Source, original product specification, migrations, computed data, tests and documentation are versioned here. Delivery: [PR #1](https://github.com/mankenntmich3/poker-learning-platofmr/pull/1).
- Working registration, login/logout, personal dashboard, one original Academy lesson with quiz, twelve Kuhn training situations, server-calculated feedback and durable personal progress.
- Editable profile and weekly goal, account export/deletion, private sessions, bounded input validation and persistent rate limits. Decisions retain their solution version and retries are idempotent.
- Responsive German study interface with functional navigation, real empty states, recovery controls and keyboard-operated 169-class Hold’em combination explorer.
- Deterministic Kuhn CFR worker, durable local job states, immutable publication and independent best-response validation. Published version: `cfr1-100000-e359ca83dfee`; exploitability **0.0006762196802849174 ante/hand** after 100,000 iterations.
- Strict TypeScript boundaries for domain, solver, strategy, server and UI. PostgreSQL adapter and migrations; PGlite only for local development/testing and explicitly enabled local previews.
- Local verification: typecheck, lint and production build passed; **47 tests passed, one external-PostgreSQL test skipped locally; all 3 browser scenarios passed**. Nine viewport widths, six automated accessibility scans, complete trainer navigation and lost-response recovery are covered. See [QA evidence](qa/README.md).
- GitHub PostgreSQL 16 acceptance passed: **35 domain/solver tests, 13 server integration tests and 3 browser scenarios**, plus typecheck, lint and production build. [Successful recorded run](https://github.com/mankenntmich3/poker-learning-platofmr/actions/runs/34135665830); subsequent revision checks are attached to the PR.

## NEXT

1. Use the complete flow personally and independently review the original lesson and strategy explanations.
2. Choose a tightly bounded next curriculum/training milestone; add validated NLHE coverage only after choosing game scope, computation method, accuracy acceptance and ownership/licensing.
3. Before hosting, select infrastructure and resolve costs, then validate HTTPS, database TLS, backups/restores, email delivery, security, content and monitoring on that environment.

## ARCHITECTURAL DECISIONS

- Next.js + React + strict TypeScript, PostgreSQL for hosted environments, PGlite local development adapter.
- StrategyProvider decouples training from versioned, independently validated solution storage.
- Small immutable COMPUTED Kuhn artifacts; no fabricated or third-party NLHE strategies.
- No hosted services, GPU provisioning or subscription costs introduced.

## KNOWN LIMITATIONS

- Personal learning milestone, not a public commercial release. One lesson and one toy-game solution are complete; the full long-term specification is not implemented.
- No NLHE solution library, hand imports/analyzer, leak finder, AI coach, billing, videos or native mobile app.
- No password-reset/email-verification delivery, hosted deployment, external monitoring or tested hosted backup recovery yet.
- Browser acceptance currently uses Chromium. Automated accessibility checks and keyboard exercises do not replace a screen-reader audit or device testing.

## TECHNICAL DEBT

- Validate deployed configuration against target PostgreSQL and storage infrastructure before launch.
- Expand curriculum and review poker content independently before commercial release.
- Tiny solution artifacts are cached per process; publishing a new index requires an application restart. Larger libraries need node/chunk indexing, storage adapters and distributed job ownership.
- Weekly activity uses UTC calendar days; configurable local-day boundaries are future work.

Continue with this status, [architecture](architecture.md), [QA](qa/README.md), and [PRODUCT_SPEC](PRODUCT_SPEC.md). Do not infer implementation from the long-term specification.
