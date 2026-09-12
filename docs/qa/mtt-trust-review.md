# MTT V3 Phase-1 mathematical trust review

Date: 2026-09-12. Branch: `feature/mtt-gto-accuracy-v3`. PR: #5, still a draft. This is a safety correction and a bounded mathematical reference implementation, **not completion of V3**.

## Finding

The original Phase-1 gate could label an artifact VERIFIED from a single Hero combo, a generator-selected convergence threshold and a self-reported convergence value. It did not replay the game history, independently measure best responses, establish full combo coverage, or establish licensed parameter-identical provenance. Its tests demonstrated the same weakness by accepting synthetic frequencies with plausible metadata. No real NLHE solution had been published, so there is no real solution library to preserve as VERIFIED.

## Remediation and actual evidence

| Boundary | Implemented check | Remaining limitation |
| --- | --- | --- |
| Generator vs verifier | Structural validation returns STRUCTURALLY_VALID only. Server publication independently rejects all unaudited NLHE models. No artifact report, status flag, threshold, callback or environment flag grants approval. | No approved NLHE game adapter exists. |
| Mathematical evaluator | Separate `src/verification/exact-best-response.ts`, with no generator imports; exhaustive pure information-set best responses against the supplied complete behavioral profile. Analytic tests cover equilibrium, deliberately exploitable profiles, hidden chance, imperfect information and multiway general-sum utility. | Exponential small-game reference; bounded at 50,000 nodes, 4,096 pure policies/player, 5 million node-policy evaluations and depth 128. It refuses excess work; no sampling fallback. It is NOT an NLHE certificate. |
| Metric meaning | Computes profile utility and BR utility per player; NashConv is sum of unilateral improvements. Reports exploitability as NashConv/2 only for two-player zero-sum games. Multiway reports improvements/NashConv, no HU relabeling. | Floating-point enumeration, not interval arithmetic. Numerical error bounds and calibration are required before any NLHE policy can approve output. A learned/sampled BR lower bound would not certify low exploitability. |
| Server policy | Frozen version `rangeform-verification-v2`; no approved NLHE models, accuracy limits or license records. Generator thresholds are diagnostic only. | Per-model thresholds cannot honestly be calibrated before a validated model exists. They remain absent, not arbitrary values presented as quality. |
| Combo completeness | Enumerates expected physical combos from replayed board/dead cards, requires every combo including zero-reach, detects reversed duplicates and missing/blocked combos, normalizes node and full-profile policies. | Full-profile coverage, reach and action EV correctness need the independently constructed full game and projection adapter. Structural validation alone is insufficient. |
| Multiway stacks | Retains each pre-posting stack, contributions, dead ante and remaining stack in integer 0.0001 BB units. Canonical keys include all seats, even previously folded seats. Effective stack is display-only. | This public engine does not settle showdowns/side pots or produce utilities; an audited utility engine is a prerequisite for an NLHE verifier. |
| Exact context | Strict schema; stable ASCII JSON ordering; ordered seats; unordered flop and dead-card sets normalized; turn/river and actions preserve chronology. Hash includes context version, full stack vector, blind/ante/rake rules, evaluation state and betting-tree definition SHA-256. | No suit-isomorphism remapping, no interpolation. Deliberately avoids claiming equivalent independently relabeled ranges. |
| Public replay | Forced posting, payer-specific custom antes, BLINDS_FIRST/ANTES_FIRST, legal turn, limp/call/raise/jam, minimum raises, short/cumulative all-in reopening, street closure and explicit board deals. Hero must be the actual actor reached. | Fold when checking is free is excluded by the declared public-model rule. Unsupported models may be stored as future contexts but cannot solve/publish. |
| HU roles | BTN posts SB; BTN first preflop, BB first postflop. UI labels BTN / SB. | No movement of a dealer button across successive hands is implemented by a single-node context. |
| Future contexts | Explicit rake rate/cap/no-flop-no-drop/min-players/rounding/rule version. ICM contains remaining player IDs, all stacks, table mappings, payouts, currency and stage. PKO additionally carries owned bounties and progressive share; Mystery carries remaining award distribution. Canonical identity validates table/global stack correspondence. | Raked Cash, ICM, PKO and Mystery utility engines are intentionally rejected. Data structures are not solved strategies. |
| Imported data | Immutable dataset/revision/source hash/license-evidence hash/parameter hash; import origin and source type must agree. Same server mathematical and rights gate as original computation. | No approved imported dataset or license evidence yet; nonempty license text cannot authorize use. |
| Persistence | Migration 009 quarantines legacy uncertified VERIFIED rows, preserving content/checksum. Failed publication is durable; lookup rechecks eligibility rather than trusting database flags or inserted reports. | Successful certificate-bound publication remains disabled until the full verifier is integrated. |

## Independent reference checks

The analytic matching-pennies equilibrium has measured NashConv 0; its deterministic exploitable profile has measured NashConv 2 and two-player exploitability 1. A hidden 75/25 chance guessing game yields BR utility 0.5, not the clairvoyant value 1. The three-player independent-choice fixture gives baseline 0.5 each, BR 1 each and NashConv 1.5. These are **synthetic mathematical tests**, not poker strategy data, not coverage and not production artifacts.

Definitions checked against [OpenSpiel's NashConv evaluator](https://github.com/google-deepmind/open_spiel/blob/master/open_spiel/python/algorithms/exploitability.py). Heads-up roles and explicit ante-format rules checked against [Poker TDA rules](https://www.pokertda.com/view-poker-tda-rules/). Implementation is original; no provider strategies were extracted.

## Prerequisites before the first VERIFIED NLHE node

1. Pin an eligible generator and independently audited NLHE game/utility implementation. Validate BBA pot eligibility, short stacks, side pots, rake identity, chance distributions, information sets and permitted betting-tree abstraction.
2. Build the complete joint profile and prove coverage/projection for every published node, including zero-probability counterfactual continuations. A Hero-only chart is insufficient.
3. Recompute BR/NashConv independently, including all players and root reach/chance distributions. Compute independent action EVs and reach used in the UI; bind all results to exact model, context, tree, profile and generator content hashes.
4. Calibrate a versioned server model policy with documented numerical error budget, repeatability, reference comparisons and model-specific maximum NashConv. Abstract-game accuracy must not be described as unrestricted NLHE accuracy.
5. Approve concrete source/license evidence bound to dataset revision and parameter identity, then implement atomic immutable publication of the artifact plus independently issued verification report. Revalidate on policy/model changes.

Verified MTT coverage remains **0** for every 6/8/9-handed stack in 10–100 BB. No engine or license has been selected for production computation.

## Local validation

- Typecheck and lint: passed.
- Full Vitest suite: 125 passed, 2 external PostgreSQL tests skipped because no TEST_DATABASE_URL is configured locally.
- Production build: passed, 34 pages.
- Targeted final trust/replay suite after separating browser-safe positions and chip primitives: 42 passed.
- Production Playwright suite: 5 passed, including MTT unavailable state, 9→2 handed switching, explicit BTN/SB, and axe.
- Development Playwright suite: 5 passed, covering fresh local migrations/seed, exact Sandbox training, action feedback, persistence across login, mobile/keyboard access.
- Migration 009: exercised in local PostgreSQL WASM including repeated migration, quarantine preserving artifact checksum and forged-report lookup rejection.
- Dedicated external PostgreSQL publication-boundary test added to CI; its result must be recorded separately, not inferred from PGlite.

Warnings observed: existing Vite config loader and NO_COLOR/FORCE_COLOR notices. No new build, type or lint errors.

## PostgreSQL CI evidence

[GitHub Actions run 34662867410](https://github.com/mankenntmich3/poker-learning-platofmr/actions/runs/34662867410) passed on application commit `31b168651042c52a7adfdc2d181952831029727e`: frozen fresh-checkout installation, typecheck, lint, 90 unit tests, 37 integration tests (including both external PostgreSQL tests), production build, 5 production browser tests and 5 development browser tests. PostgreSQL version: 16. The MTT browser flow reports no console/page errors and passes axe. This evidence verifies the trust-boundary correction and existing application, not the unavailable solver-backed V3 acceptance flow.
