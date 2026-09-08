# Project status

Repository: `mankenntmich3/poker-learning-platofmr` (confirmed spelling). Updated 2026-09-08.

## DONE — local development access

The previous acceptance record did not establish practical local usability. Authentication was real and database-backed, but local hostname canonicalization could reject valid login requests with HTTP 403. Protected pages rendered signup instead of a clear login destination, the demo seed was missing, and training had no explicit session completion.

Implemented fixes:

- Literal loopback Host/Origin validation for development; production retains strict configured-origin checks.
- Explicit login redirects with a validated return destination, verified session-cookie retention and working logout/relogin. Login controls wait until the page can handle their actions.
- Real development-only account `demo@poker.local`, seeded with three clearly labeled, computed sample decisions. Personal signup/login works independently. No auth bypass.
- Local database setup, ordered migrations, idempotent seed and explicit reset commands. A process lock rejects concurrent access and recovers from an exited process.
- Academy → one course → existing original lesson/quiz → associated trainer; session start, up to twelve decisions, feedback, early/full completion and durable per-decision progress.
- Exact commands and demo credentials in [LOCAL DEVELOPMENT — QUICK START](../README.md#local-development--quick-start).

Local access browser suite: four scenarios passed, including personal signup, demo course/training/relogin, both loopback aliases, protected destinations, expired sessions and mobile accessibility. Strict typecheck, lint, 35 domain/solver tests, 16 local server tests and the production build passed. GitHub additionally passed the external PostgreSQL test and both browser suites: **59 tests passed** in [run 34160222732](https://github.com/mankenntmich3/poker-learning-platofmr/actions/runs/34160222732).

Fresh-checkout acceptance is complete: a separate clone of the GitHub-identical commit began without dependencies, environment files or a database. Frozen installation, environment/database setup, migrations and seed succeeded. The real development browser completed demo login → dashboard → course → lesson/quiz → training/action/feedback/completion → saved progress → logout/login. Progress also survived a stopped/restarted server and reseed. Explicit reset restored the three sample decisions and incomplete lesson; the full flow passed again. See [local access QA evidence](qa/local-access.md) for revisions, commands, screenshots and limits.

No secondary product expansion is in progress. Current session position resets on reload; all answered decisions and completed lessons remain stored. The complete product currently contains one course/lesson and the Kuhn training dataset only.

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
