# Project status

Repository: `mankenntmich3/poker-learning-platofmr` (confirmed spelling). Updated 2026-09-11.

## Study Engine v2 — feature branch, release verification in progress

Branch `feature/gto-study-engine-v2` now contains configurable sized preflop and heads-up flop/turn/river study. The prior online release described below remains the staging baseline until the feature is merged and its deployment is verified.

Implemented: replayable integer-chip study state; legal bet/raise/call/check/fold/all-in sequences; freely selected Hero and board cards with card removal; preflop-to-flop continuation; two 169-class matrices and physical combos; action-conditioned range funnels; exact hand-vs-hand and sampled weighted range equity; made-hand/draw/nuts densities; qualified Why explanations; saved favorites/history/share links; persisted exact-node questions with 10/25/50/100 decisions and spot/street/full-hand modes; dashboard metrics derived from actual answers; account export/deletion covering new study data.

Strategy is explicitly APPROXIMATED with content-derived versions. There are no NLHE GTO solutions or action EVs. Four-bet calling ranges are unavailable. HU equal effective stacks, 6-max ChipEV, rake/antes zero; no multiway, ICM or real-money settlement. Existing Academy, auth, preflop sessions and development seed remain intact. Additive migrations `006_study_engine.sql` and `007_study_sessions.sql` preserve existing data.

Current local evidence: 83 tests passed, one external-PostgreSQL test skipped locally; lint and production build passed; five development browser flows passed. Final production browser acceptance and GitHub PostgreSQL CI are still being completed. See [architecture decision](decisions/0004-study-engine-v2.md) and [owner brief](STUDY_ENGINE_V2_SPEC.md).

## Previous deployed release — NLHE usable locally, private staging online

The owner replaced the Kuhn-facing milestone with No-Limit Texas Hold'em. The user-facing app now offers 6-max NLHE preflop RFI, responses to an open and responses to a 3-bet, all eleven requested 10–200 BB presets plus custom 10–500 BB stacks, a complete 169-class/1,326-combo mixed-frequency explorer, exact-spot ten-hand training and durable sessions/progress. The Academy lesson now teaches NLHE position, stacks, combos and mixed frequencies. A bounded 100 BB BTN-vs-BB SRP flop on A♠ 7♦ 2♣ supports hero cards, blocker-adjusted opponent range and check/bet feedback.

No owned/licensed ranges were supplied. The owner explicitly authorized original **APPROXIMATED** educational data as the initial fallback. All user-facing ranges expose provenance and immutable version, with solver version and measured accuracy unavailable. There is no GTO or EV claim. Current policy: `nlhe-approx-v1-34a10890a8dd`. Its 386 context checks validate structure and legal actions only. Kuhn remains an internal solver/API regression, absent from primary navigation and training.

Strict typecheck, lint, 67 local tests and the production build passed. All three production Chromium flows and five development Chromium flows passed, including a fresh GitHub-identical checkout with frozen installation, new environment/database, migrations and seed. Full ten-hand completion, a second session, lost-response recovery, exact-spot training, logout/relogin and filesystem restart persistence are verified. Eight automated accessibility scans and nine responsive widths passed. GitHub additionally passed all 68 unit/integration tests against PostgreSQL 16 and both browser suites in [run 34398395517](https://github.com/mankenntmich3/poker-learning-platofmr/actions/runs/34398395517), repeated successfully for the deployed release in [run 34399476527](https://github.com/mankenntmich3/poker-learning-platofmr/actions/runs/34399476527). PR #2 is merged. See [NLHE acceptance](qa/nlhe-acceptance.md).

The owner additionally requested a stable HTTPS staging address with managed PostgreSQL and authorized **free tiers only**. The application is live at [rangeform-staging.onrender.com](https://rangeform-staging.onrender.com), backed by Neon Free PostgreSQL 18 in Frankfurt and Render Free. HTTPS readiness, actual PostgreSQL access, invitation-only signup, logged-out route protection and rejection of the local demo credentials are verified. The owner created a personal hosted account. Academy, exact-range preflop training and bounded flop training were verified online, with feedback, completion, reload and unchanged progress after actual logout/login. A saved question and feedback also survived the free host's sleep/wake cycle. The local app and development demo remain available independently. See [staging](staging.md) and [NLHE decision](decisions/0003-nlhe-first.md).

### Current limits and next step

Private staging supports additional independently revocable signup invitations through secret `STAGING_INVITE_CODES`, preserving the original invitation and existing logins. Invitations are reusable and do not expire automatically; actual codes remain outside the repository.

Invitation rollout verified 2026-09-10: [PR #3](https://github.com/mankenntmich3/poker-learning-platofmr/pull/3), [successful CI](https://github.com/mankenntmich3/poker-learning-platofmr/actions/runs/34458631270), Render live commit `babbb2d`. Both newly issued invitations passed actual HTTPS signup → protected dashboard → logout → login; temporary test accounts were deleted and their sessions rejected afterwards. An invalid invitation returned 403. Locally, typecheck, lint, 69 tests (external PostgreSQL test skipped), production build and all eight browser flows passed. Real invitation values were configured only in the hosting environment, never committed.

This is a usable private study release, not verified GTO or a public commercial service. Render Free sleeps when idle and may take about a minute to wake; free database/compute quotas apply. There is one Academy lesson and one bounded flop. Password-reset email, hosted backup restore validation and paid uptime are not implemented. The next useful milestone is obtaining or computing an independently validated, legally usable NLHE range dataset within a clearly bounded game configuration.

## Historical acceptance — pre-NLHE local release

The sections below record the previous Kuhn milestone. Current training is NLHE and server-persisted session position now survives reload. Earlier test counts and screenshots do not validate the new release.

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

At this historical checkpoint, session position reset on reload and the course used Kuhn. These limitations are superseded by the current NLHE work above.

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
