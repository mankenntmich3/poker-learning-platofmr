# Full-prior preflop follow-up: requirements 0–53

Latest HU follow-up: [lossless suit encoding and independent quantitative
rejection](qa/hu-scalable-verification.md). Neither the previous nor optimized
candidate is sufficiently accurate. Requirements 1/2/7/8/9/43/48 remain open or
partial; a scalable rejection lower bound is not successful BR certification.

2026-09-13. **Definition of Done NOT met; PR #5 remains Draft; no staging update.**
DONE below means a tested implementation of that particular requirement. It
never converts a sampled candidate, generic interface or bounded failed verifier
into a verified solution. Evidence: [executed solver/BR attempts](qa/full-prior-preflop.md),
[machine-readable measurements](qa/preflop-full-prior-attempts.json),
`tests/domain/preflop-tree.test.ts`, `tests/solver/multistreet-preflop.test.ts`,
`tests/server/solver-attempts.test.ts` and the existing verified browser flows.

| # | Requirement | Status | Actual result / remaining gap |
| --- | --- | --- | --- |
| 0 | Preserve existing conditional work | DONE | Existing 18 HU artifacts and river verifier/UI remain intact; regression flows pass. |
| 1 | General verified preflop pipeline | PARTIAL | Real full-prior solver → independent verification attempt → failure DB → unavailable lookup; successful publication missing. |
| 2 | Complete 1326-combo HU solution | PARTIAL | Full prior and all 1326 HU root policies sampled; no independently verified complete range. |
| 3 | HU multi-action tree | PARTIAL | Fold/Limp/2/2.2/Jam and 3/4-bet continuations actually traversed; no approved frequencies. |
| 4 | Configurable sizes | DONE | Absolute BB, pot-after-call fraction and jam; legality and size tests. |
| 5 | HU stack coverage | OPEN | New full-prior attempts at 15 BB only; old conditional stacks do not satisfy this. |
| 6 | NONE / BBA | DONE | Both forced-bet contexts supported; BBA runs and actual NONE smoke run; old artifacts unchanged. |
| 7 | Action EVs / strategy EV / EV loss | PARTIAL | Existing conditional feedback retained; sampled new strategies have no certified EVs. |
| 8 | Independent verification | PARTIAL | Separate full-chance builder and best-five settlement executed; incomplete full BR returns no certificate. |
| 9 | Scalable verifier | PARTIAL | Existing counterfactual infoset BR reused; explicit full chance expansion still exceeds budget. |
| 10 | Real 3-handed solving | PARTIAL | 3-player full-prior multi-action and reduced-tree strategies trained; neither certified. |
| 11 | 3-handed positions / order | DONE | BTN/SB/BB replay and real solver order; shared domain tests. |
| 12 | 3-handed BTN RFI | PARTIAL | Candidate strategies from BTN roots; no VERIFIED node. |
| 13 | 3-handed BB vs open | PARTIAL | Executable/tested legal responses; not a verified strategy node. |
| 14 | 3-handed SB vs BTN | PARTIAL | SB acts in actual full tree; no approved node/EV projection. |
| 15 | Full multiway stack identity | DONE | Canonical complete vectors retained and unequal-stack tests execute. |
| 16 | Multiway payoff / BR / NashConv | PARTIAL | Independent side-pot payoffs and actual BR attempts; no complete multiway NashConv measurement. |
| 17 | 6-handed solving | PARTIAL | Full-prior 20-BB multi-action and reduced-tree attempts executed; unverified. |
| 18 | 6-handed position/spot coverage | OPEN | No new verified position or scenario coverage. |
| 19 | Fully learnable verified RFI range | OPEN | No complete RFI artifact can pass current policy. |
| 20 | Parallel open sizes | PARTIAL | 2/2.2 and parameterized other sizes executed; no certified mixes. |
| 21 | 6-handed 3-bet solution | PARTIAL | Legal 20-BB tree and BB responses tested; solution/EVs missing. |
| 22 | Verified 4-bet/jam tree | PARTIAL | Open→3bet→4bet→jam/call executes; not independently certified. |
| 23 | Generalized actual game nodes | DONE | Runtime states carry actor, stacks, commitments, pot, actions and terminal/next state; actually traversed. |
| 24 | Legal action engine | DONE | Existing min-raise/reopening logic reused; new limp, sizes, all-in call and refund/side-pot checks. |
| 25 | Future arbitrary spot platform | PARTIAL | Generic 2–9-seat context and parameterized tree; no arbitrary verified solver promised. |
| 26 | Production scope taxonomy | PARTIAL | Existing conditional labels retained; diagnostics distinguish full prior from partial/push-fold tree. No new complete-range release or production taxonomy change. |
| 27 | Expanded coverage dashboard | PARTIAL | Existing database-checked conditional coverage retained; experiment jobs are not yet displayed. |
| 28 | Segmented matrix for new nodes | OPEN | Existing matrix preserved; no new verified data to display. |
| 29 | New hand-class frequencies/EV | OPEN | Sampled frequencies never substituted for certified matrix data. |
| 30 | Physical combo detail | PARTIAL | Full physical sampling/blockers; product details still limited to old approved nodes. |
| 31 | Generalized trainer for 2/3/6 | PARTIAL | Existing shared API retained; new contexts correctly unavailable. |
| 32 | Preserve premium PokerTable | DONE | Existing shared component retained with no separate simplified UI. |
| 33 | Visible new action histories | PARTIAL | Exact chronological history in solver; no new verified table node/UI flow. |
| 34 | Frequency Recall for new nodes | OPEN | Works only for previously approved nodes. |
| 35 | Full Smart weighting | PARTIAL | Existing mastery/due weighting retained; explicit prior EV/recall error weighting not added. |
| 36 | Expanded training filters | OPEN | New table/position/spot coverage and filters not delivered. |
| 37 | No approximate data in GTO trainer | DONE | Diagnostic schema rejected; failure records cannot insert verified artifacts; lookup tests pass. |
| 38 | Priority coverage job generation | PARTIAL | P1–P4 schema and durable failure records; offline commands are not an automated coverage worker. |
| 39 | Compute control and statuses | DONE | Actual runtime/node/infoset/heap caps, timings and interrupted traversal accounting; COMPUTE_LIMIT/NON_CONVERGED persist. |
| 40 | HU tests | PARTIAL | Full prior, legal multi-action tree, physical cards, terminal payoffs and fail-closed verification tested; complete HU BR/E2E missing. |
| 41 | 3-handed tests | PARTIAL | Positions, BBA, vector, responses, side pots and rejected publication tested; measured multiway NashConv missing. |
| 42 | 6-handed tests | PARTIAL | Positions, actual sampled solver, responses and unavailable exact lookup tested; successful verified trainer lookup missing. |
| 43 | Complete HU E2E | OPEN | Existing conditional HU E2E passes; explicitly not the requested full-range flow. |
| 44 | 3-handed verified E2E | OPEN | No certified node. |
| 45 | 6-handed verified E2E | OPEN | No certified node. |
| 46 | No UI detour | DONE | Work stays in solver, independent verifier, domain, job records and tests. |
| 47 | Excluded features | DONE | No 8/9 coverage, ICM/PKO, imports, coach or general postflop product added. |
| 48 | Definition of Done | OPEN | A/B/E verified HU requirements remain unmet; actual multiway attempts do not change that. |
| 49 | Smaller genuine multiway attempts | DONE | Full-prior push/fold fallback trained for both 3 and 6 players, independently attempted and recorded without publication. |
| 50 | Honest coverage report | DONE | Coverage below and executed measurements distinguish original approved subgames from all new failures. |
| 51 | PR / deployment restrictions | DONE | PR stays Draft; no merge or staging deployment. |
| 52 | Solver platform direction | PARTIAL | Reusable actual game/solver/verification code; full solver product remains unfinished. |
| 53 | Execute before documenting | PARTIAL | Full-prior multi-action solve attempted first, then verification/DB failures and smaller trees; successful publication/training not reached. |

## Coverage

| Table size | Stack BB | Ante | Position | Spot | Tree | Scope | Combo coverage | Verifier | NashConv / exploitability BB | Status |
| --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- |
| HU | 10/15/20/25/30/40/50/80/100 | NONE / BBA1 | BTN/SB | Conditional root | Fold/Jam | CONDITIONAL_SUBGAME + PUSH_FOLD_ONLY | 26 supported / 1326 rows | Exact pinned equity + independent BR | max NashConv 3.345e-15 across old 18 nodes | Existing VERIFIED PARTIAL |
| HU | 15 | BBA1 | BTN/SB | RFI attempt | Multi-action, real bounded continuation | FULL_PRIOR_UNVERIFIED + PARTIAL_TREE | 1326 prior; 1326 averaged roots | Full-chance attempt exhausted | Unavailable | COMPUTE_LIMIT |
| 3 | 15 | BBA1 | BTN | RFI attempt | Multi-action | FULL_PRIOR_UNVERIFIED + PARTIAL_TREE | 1326 prior; 1319 averaged roots | Full-chance attempt exhausted | Unavailable | COMPUTE_LIMIT |
| 6 | 20 | BBA1 | UTG | RFI attempt | Multi-action | FULL_PRIOR_UNVERIFIED + PARTIAL_TREE | 1326 prior; 1184 averaged roots | Full-chance attempt exhausted | Unavailable | COMPUTE_LIMIT |
| HU | 15 | BBA1 | BTN/SB | Reduced attempt | Fold/Jam | FULL_PRIOR_UNVERIFIED + PUSH_FOLD_ONLY | 1326 averaged roots | Full-chance attempt exhausted | Unavailable | COMPUTE_LIMIT |
| 3 | 15 | BBA1 | BTN | Reduced attempt | Fold/Jam/Call | FULL_PRIOR_UNVERIFIED + PUSH_FOLD_ONLY | 1326 averaged roots | Full-chance attempt exhausted | Unavailable | COMPUTE_LIMIT |
| 6 | 20 | BBA1 | UTG | Reduced attempt | Fold/Jam/Call | FULL_PRIOR_UNVERIFIED + PUSH_FOLD_ONLY | 1326 averaged roots | Full-chance attempt exhausted | Unavailable | COMPUTE_LIMIT |

**Complete verified HU ranges: 0.** Existing conditional river also remains usable;
it is not counted as new preflop or multiplayer coverage. Biggest blocker and the
next concrete technical approach are in the linked QA report. No architecture-only
preparation or sampled policy is marked as a completed verified node.
