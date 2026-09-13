# Project status

Repository: `mankenntmich3/poker-learning-platofmr` (confirmed spelling). Updated 2026-09-13.

## Current run — scalable HU rejection and lossless suit encoding

The previously staged work was committed/pushed as `7b85005` first; its full
[CI passed](https://github.com/mankenntmich3/poker-learning-platofmr/actions/runs/34772240143).
Further work stayed on HU. A new independent fixed-deviation verifier completes
without full chance enumeration and statistically rejects both the previous
and optimized frozen profiles: NashConv lower bounds 0.0277326 and 0.0890429
BB/hand respectively (20000 fixed samples, stated IID assumption, familywise
failure probability 1e-9 per candidate). **These are lower bounds for rejection,
not an upper certificate or permission to publish.**

Lossless global suit canonicalization, observation caching and sparse average
export now work. The larger HU 15/BBA run completed 70520 iterations and visited
5248052 nodes before the 2-million-infoset limit; all 1326 root combos remain
represented. Postflop continuation learning is still inadequate. No new
VERIFIED node, complete HU matrix or trainable action EVs resulted. Prompt 2
remains incomplete. Existing conditional HU/river and UI remain intact; no
3/6-player expansion or staging deployment in this follow-up.

See [mathematics, executed evidence and remaining technical boundary](qa/hu-scalable-verification.md).

## Previous run — full-prior multi-action computation attempted, not verified

2026-09-13, existing branch and draft PR #5. **The new full-HU Definition of Done
is NOT met.** Original external-sampling MCCFR now actually traverses full-prior
52-card HU/3/6-player trees, including limp, parallel small opens, 3/4-bets, jam
and real bounded flop/turn/river continuation. Independent best-five payout and
full-chance verification attempts execute, but hit budget before complete BR.
No reported convergence, default policy or failed partial result is published.

HU 15/BBA: 16034 completed iterations, 1234001 visited nodes, all 1326 root
combos averaged, 500000 infoset cap reached. 3-handed 15/BBA and 6-handed 20/BBA
also genuinely trained, as did smaller full-prior push/fold fallbacks for all
three table sizes. **No new NashConv certificate, full-range matrix, action EVs
or trainable verified preflop node resulted.** This is execution progress, not
a completed usable-product milestone.

Migration 011 and the development recorder persist COMPUTE_LIMIT/NON_CONVERGED
diagnostics with priorities P1–P4. Six actual local jobs recorded; no experiment
profile enters verified artifacts or training. Existing river, 18 conditional
HU solutions, shared premium table/matrix and retained progress remain intact.
No staging deployment or merge. Details, measurements, limits and next steps:
[executed QA](qa/full-prior-preflop.md), [all 54 follow-up sections](PREFLOP_FULL_RANGE_REQUIREMENTS.md),
[original 66-point audit](MTT_V3_REQUIREMENTS.md).

## Previous run — conditional HU preflop works; complete HU requirement remains open

Updated 2026-09-13 on the existing branch and draft PR #5. **The requested complete
HU preflop game is NOT done.** Eighteen independently verified conditional HU
push/fold roots now run end-to-end: 10/15/20/25/30/40/50/80/100 BB, NONE or BBA 1,
BTN/SB Fold/Jam versus BB Fold/Call. Both seats have only the disclosed fixed
AKo/QQ/A5s/76s inputs (26 supported physical combos each). No limp/small-raise or
full-prior HU coverage, no 3/6-handed strategy coverage. The existing river is preserved.

`/mtt/preflop?stack=15&ante=1`: shared premium PokerTable, 169-cell segmented matrix,
physical combo selection, independently checked action EVs, EV Loss, Frequency
Recall, exact-version saved mastery/reviews and relogin retention. Tournament has
an actual database-backed conditional coverage table. Unsupported contexts remain
unavailable, including supplied table-size/hero/query parameters outside this model.

Solver: original HU security LP, SciPy 1.16.2 / HiGHS 1.8.0. All 35,958,384 boards
across 21 exact suit/seat matchup orbits were enumerated twice: direct seven-card
and independent best-five evaluators agree in every integer win/tie count.
Independent server BR on the full profile gives HU 15 BB/BBA NashConv ~6.66e-16
BB/hand, plus server-owned 1e-9 numerical allowance. The model's 1326 artifact rows
include 1300 explicitly unsupported rows; these are never training recommendations.

The local bounded job worker actually solved, verified and published a fresh
artifact with durable statuses/timing. Real 3/6-player all-in benchmarks exist,
but are not strategies. Full multiway solving and its verifier remain absent.
Application commit `0ef7f9ef813bf23473db618d1f319c81a0897d9e` passed
[every CI gate](https://github.com/mankenntmich3/poker-learning-platofmr/actions/runs/34731503071):
fresh Linux checkout/install, regenerated river and HU solver artifacts, all 21
HU generator equity enumerations, independent profile verification, typecheck,
lint, **100 unit + 46 integration tests against PostgreSQL 16**, production build,
**7 production + 5 development browser flows**. No skipped CI tests. Local checks
also pass; four external PostgreSQL checks are covered by that CI run. The Fold
button contrast was corrected and the final HU decision UI passed Axe and visual
inspection. The final follow-up changes documentation only.
PR remains draft; no merge or staging deployment.

Evidence: [preflop execution, exact boundaries and commands](qa/verified-preflop.md),
[calibration](qa/preflop-calibration.json), [multiway benchmark](qa/preflop-multiway-benchmark.json).

## Previous run — river acceptance (historical)

## MTT GTO accuracy v3 — one working verified river subgame; V3 remains incomplete

Continuing `feature/mtt-gto-accuracy-v3` and draft PR #5. The new `/mtt/river`
flow actually executes a solver, independently verifies the strategy, publishes
an immutable artifact to the database, exact-loads it through StrategyProvider,
displays a segmented matrix, starts real NLHE training, and saves action/recall
feedback and review progress. Existing application work is preserved.

**Scope:** one conditional river root with 8-handed/15-BB/BBA ancestry, BTN vs BB,
a fixed five-card board, explicit eight-combo input distributions for each live
player, and Check / Bet 2.75 BB / Jam followed by Fold/Call. The input distributions
are study assumptions, not GTO-solved preflop ranges. This is not unrestricted
NLHE or proof of the earlier streets. **Verified MTT preflop coverage stays 0**
for all requested 6/8/9-handed stacks, positions and scenarios.

Actual production solution: SciPy 1.16.2 / HiGHS 1.8.0 security LPs. Independent
TypeScript reconstruction checks every profile policy, all 56 compatible deals,
all 1081 unblocked combo rows (only 8 supported), reach and action EVs. A second
full-tree best-response implementation and exhaustive smaller NLHE case cross-check
the mathematics. Measured NashConv is approximately 1.78e-15 BB/hand (roundoff).
Server policy adds a conservative 1e-9 BB numerical allowance; no artifact-chosen
threshold is trusted. Model/source/license approval is restricted to this exact
conditional game. Imported data and every unsupported model remain unavailable.

Matrix: proportional segments, compact/detailed percentages, action/mixed/reach/EV
views and physical combo details. Training: actual hole cards at BTN, seats/stacks,
button, board/pot, legal actions, mixed-aware feedback and independently checked
EV regret. Frequency Recall, basic per-combo/per-mode Mastery and adaptive due
dates persist. Smart/weakness/due/mixed selection works within this sole solved
range. Broad MTT preflop modes, multi-action preflop solutions, full strategic
mastery weighting and broad postflop coverage are still open.

The browser test verifies protected-route login, matrix, actual action and recall,
mobile accessibility, logout/login and retained progress. The new route's login
return whitelist and mobile card/control sizing were fixed during verification.
Local validation: `pnpm typecheck`, `pnpm lint`, `pnpm test` and `pnpm build`
passed. Tests: 134 passed; 3 dedicated external-PostgreSQL checks skipped locally.
All 6 production Playwright flows and all 5 development-access flows passed.
The real LP was regenerated and independently verified again outside the bundled
artifact. [CI on application commit 8432ab8](https://github.com/mankenntmich3/poker-learning-platofmr/actions/runs/34717017097)
passed every gate: fresh Linux checkout, dependency installation, actual solver
regeneration and independent verification, typecheck/lint, **95 unit + 42 integration
tests against PostgreSQL 16**, production build, **6 production + 5 development
browser flows**. The final documentation follow-up changes no application code.
No merge or new staging deployment has occurred; the existing staging app remains
on its previous accepted version.

Evidence: [executed river QA and exact boundaries](qa/verified-river.md),
[calibration](qa/river-calibration.json), [DCFR diagnostics](qa/river-dcfr-crosscheck.json),
[all 66 requirements](MTT_V3_REQUIREMENTS.md), [original V3 prompt](MTT_GTO_V3_SPEC.md)
and [solver research](solver-research-v3.md). The earlier fail-closed trust review
is preserved as historical evidence; policy v3-river1 is the only new approval.

## Study Engine v2 — deployed and accepted online

PR #4 from `feature/gto-study-engine-v2` is merged. Configurable sized preflop and heads-up flop/turn/river study is live at [Rangeform](https://rangeform-staging.onrender.com/postflop). Render deployed merge commit `f2fe6288640371c2858908b73562461d68543e3a` successfully on 2026-09-11 at 16:17 Europe/Berlin, using the existing Neon PostgreSQL database and free plans. Local development remains available.

Implemented: replayable integer-chip study state; legal bet/raise/call/check/fold/all-in sequences; freely selected Hero and board cards with card removal; preflop-to-flop continuation; two 169-class matrices and physical combos; action-conditioned range funnels; exact hand-vs-hand and sampled weighted range equity; made-hand/draw/nuts densities; qualified Why explanations; saved favorites/history/share links; persisted exact-node questions with 10/25/50/100 decisions and spot/street/full-hand modes; dashboard metrics derived from actual answers; account export/deletion covering new study data.

This previously deployed Cash Study Engine uses explicitly APPROXIMATED strategies with content-derived versions, without solver action EVs. The separate new V3 river subgame above has its own verified solution and is not yet deployed. Four-bet calling ranges are unavailable. HU equal effective stacks, 6-max ChipEV, rake/antes zero; no multiway, ICM or real-money settlement. Existing Academy, auth, preflop sessions and development seed remain intact. Additive migrations `006_study_engine.sql` and `007_study_sessions.sql` preserve existing data.

Local acceptance: typecheck, lint, 83 tests (one external-PostgreSQL check skipped locally), production build, all four production browser flows and five development browser flows passed. [Final-head PostgreSQL CI](https://github.com/mankenntmich3/poker-learning-platofmr/actions/runs/34608143988) passed every gate on `f73ab4c`, whose application tree matches the deployed merge, including frozen fresh-checkout installation and both browser suites. Online HTTPS acceptance verified signup, protected dashboard, sized ranges, flop/turn/river, equity, ten completed full-hand decisions, a saved inline decision, favorite, logout/login retention and full account export. The temporary test account was deleted successfully. See [QA evidence](qa/study-engine-v2.md), [merged PR #4](https://github.com/mankenntmich3/poker-learning-platofmr/pull/4), [architecture decision](decisions/0004-study-engine-v2.md) and [owner brief](STUDY_ENGINE_V2_SPEC.md).

## Previous deployed release — NLHE usable locally, private staging online

The owner replaced the Kuhn-facing milestone with No-Limit Texas Hold'em. The user-facing app now offers 6-max NLHE preflop RFI, responses to an open and responses to a 3-bet, all eleven requested 10–200 BB presets plus custom 10–500 BB stacks, a complete 169-class/1,326-combo mixed-frequency explorer, exact-spot ten-hand training and durable sessions/progress. The Academy lesson now teaches NLHE position, stacks, combos and mixed frequencies. A bounded 100 BB BTN-vs-BB SRP flop on A♠ 7♦ 2♣ supports hero cards, blocker-adjusted opponent range and check/bet feedback.

No owned/licensed ranges were supplied. The owner explicitly authorized original **APPROXIMATED** educational data as the initial fallback. All user-facing ranges expose provenance and immutable version, with solver version and measured accuracy unavailable. There is no GTO or EV claim. Current policy: `nlhe-approx-v1-34a10890a8dd`. Its 386 context checks validate structure and legal actions only. Kuhn remains an internal solver/API regression, absent from primary navigation and training.

Strict typecheck, lint, 67 local tests and the production build passed. All three production Chromium flows and five development Chromium flows passed, including a fresh GitHub-identical checkout with frozen installation, new environment/database, migrations and seed. Full ten-hand completion, a second session, lost-response recovery, exact-spot training, logout/relogin and filesystem restart persistence are verified. Eight automated accessibility scans and nine responsive widths passed. GitHub additionally passed all 68 unit/integration tests against PostgreSQL 16 and both browser suites in [run 34398395517](https://github.com/mankenntmich3/poker-learning-platofmr/actions/runs/34398395517), repeated successfully for the deployed release in [run 34399476527](https://github.com/mankenntmich3/poker-learning-platofmr/actions/runs/34399476527). PR #2 is merged. See [NLHE acceptance](qa/nlhe-acceptance.md).

The owner additionally requested a stable HTTPS staging address with managed PostgreSQL and authorized **free tiers only**. The application is live at [rangeform-staging.onrender.com](https://rangeform-staging.onrender.com), backed by Neon Free PostgreSQL 18 in Frankfurt and Render Free. HTTPS readiness, actual PostgreSQL access, invitation-only signup, logged-out route protection and rejection of the local demo credentials are verified. The owner created a personal hosted account. Academy, exact-range preflop training and bounded flop training were verified online, with feedback, completion, reload and unchanged progress after actual logout/login. A saved question and feedback also survived the free host's sleep/wake cycle. The local app and development demo remain available independently. See [staging](staging.md) and [NLHE decision](decisions/0003-nlhe-first.md).

### Current limits and next step

Private staging supports additional independently revocable signup invitations through secret `STAGING_INVITE_CODES`, preserving the original invitation and existing logins. Invitations are reusable and do not expire automatically; actual codes remain outside the repository.

Invitation rollout verified 2026-09-10: [PR #3](https://github.com/mankenntmich3/poker-learning-platofmr/pull/3), [successful CI](https://github.com/mankenntmich3/poker-learning-platofmr/actions/runs/34458631270), Render live commit `babbb2d`. Both newly issued invitations passed actual HTTPS signup → protected dashboard → logout → login; temporary test accounts were deleted and their sessions rejected afterwards. An invalid invitation returned 403. Locally, typecheck, lint, 69 tests (external PostgreSQL test skipped), production build and all eight browser flows passed. Real invitation values were configured only in the hosting environment, never committed.

This is a usable private study release, not verified GTO or a public commercial service. Render Free sleeps when idle and may take about a minute to wake; free database/compute quotas apply. There is one Academy lesson; the former bounded flop is superseded by configurable heads-up study through the river. Password-reset email, hosted backup restore validation and paid uptime are not implemented. The next useful milestone is obtaining or computing an independently validated, legally usable NLHE range dataset within a clearly bounded game configuration.

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
