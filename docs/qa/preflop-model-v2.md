# V2 architecture experiment — no publication approval

2026-09-14, `feature/mtt-gto-accuracy-v3`, Draft PR #5. The previous
unabstracted terminal-play run was not enlarged. The new owner request is
[preserved verbatim](../PREFLOP_MODEL_V2_SPEC.md).

## What actually runs

One HU 15 BB / BBA 1 public tree, 104 nodes / 42 decision nodes. Root Fold,
Limp, Raise 2 BB, Jam; BB check/raise/jam versus limp and fold/call/3-bet/jam
versus open. Non-all-in continuations play one flop betting round with check,
one-third-pot or jam, followed by fold/call. Remaining streets are explicitly
forced checkdown. This is a deliberately small **pilot**, not a validated
practical replacement for multistreet NLHE.

The chance builder enumerates all 1,624,350 ordered compatible physical hole
pairs with equal weight; all 1326 combos per player remain represented. It
samples one legal five-card board per pair. PILOT_2 explicitly closes that
empirical measure under all 24 global suit permutations. Each stored row
represents those equally weighted renamed worlds: observations, payoffs and
blockers are invariant, and the physical hole prior remains uniform. Thus root
suit symmetry is lossless within that symmetrized finite model. PILOT_1's
numerical observation operators are unchanged; the new model identity makes
this interpretation explicit and all three model BRs were recomputed. Source
snapshots retain the earlier benchmark definitions. Root strategies have 169 classes;
flop observations retain that root class, a six-way paired/suit-count texture
and one of nine made-hand categories. Draw/nut potential is not represented.
Private observations never include opponent cards or unrevealed streets.
The public node preserves the full betting history; there is no hot-path JSON
information-set key. The finite empirical board law is **not exact NLHE
runout equity**. Physical accuracy remains unapproved.

The model contract includes continuation, board/private/action abstractions,
full stacks/posts/context, convergence-policy absence, verifier version and
an immutable configuration hash. Runs also retain source and chance hashes.
The explicit server state is **no approved V2 policy**. Diagnostic outputs do
not have the approved artifact schema and cannot enter ordinary training.

### A: indexed chance-sampled abstract game

Python/Numba uses indexed Float64 regret/average arrays and a shared public
tree. 10,000 iterations × 256 chance samples were executed for ordinary CFR,
a sampled positive-regret variant, and a DCFR-style discounted variant.
The sampled positive-regret variant is **not claimed to have the deterministic
CFR+ convergence guarantee**. Separate full-batch CFR/CFR+/DCFR calibration
also executes on small known games.

Ordinary chance-sampled CFR seeds 17/29/43 took approximately 22–23 seconds;
complete finite-model NashConv was 0.076595 / 0.074219 / 0.075439 BB/hand.
Mean root L1 distances between these runs were 0.38–0.40: insufficient stability.
The other sampled variants were worse at this budget (0.169841 / 0.153546).
The reported working array sum is 30,931,056 bytes; it is not process peak RSS.

### B: independently trained, frozen continuation policies

Five continuation subgames were trained separately under the unconditional
hole prior, then evaluated as per-world continuation values. Construction took
99.25 seconds; preflop training took 19.41 seconds. The restricted game reached
NashConv 0.035291. Expanding its policies and allowing continuation deviations
in model A gives **0.113512**. Thus a frozen unconditional oracle cannot be
presented as a range-conditioned equilibrium continuation. This variant is
rejected as the preferred design. No equity-realization factor or heuristic
value was used; these are actual, insufficiently solved subgames.

### C: exact sparse chance operators for the abstract game

Implemented after A/B comparison. Joint private-observation probabilities and
showdown pot shares become CSR operators. Approximately 429,000 nonzeros replace
repeated per-world terminal evaluation. Terminal utilities are affine in pot
share, so this compression is exact **for the finite board model**. Preflop
counterfactual values sum over the 54 still-hidden flop signals before a regret
update; the solver cannot choose using future information.

Full-batch positive-regret CFR with linear averaging is now feasible. The
100-iteration pilot took 6.43 seconds, NashConv 0.045910. Three longer independent
chance-measure runs and their exact numbers are retained in the accompanying
machine-readable evidence. Public-node throughput here must not be compared
directly with sampled world-node throughput: each operator visit processes
many private states at once.

| Independent board seed | Solve seconds / iterations | Complete model NashConv BB/hand | HU exploitability BB/hand |
|---|---:|---:|---:|
| 17 | 143.02 / 2000 | 0.000511075 | 0.000255537 |
| 29 | 138.94 / 2000 | 0.000377290 | 0.000188645 |
| 43 | 132.66 / 2000 | 0.000366574 | 0.000183287 |

Regret/average arrays occupy 10,310,352 bytes and the solver's four chance
operators approximately 20.7 MB. These partial allocations exclude temporary
arrays, chance data, Python and the verifier. An observed process peak during
the seed-29 solve/world-verification process was 866,226,176 bytes; it is not
attributed solely to the solver.

**Critical holdout result:** applying each profile to the other independently
sampled finite board measures yields NashConv **0.05156–0.05889**. Root mean L1
distance is 0.4935–0.5013 across models; some hands switch almost completely.
Model values differ by up to 0.00610 BB. This is not three seeds of the same
deterministic solver: it measures sensitivity to the uncertain board law.
Complete low in-model BR is therefore insufficient for publication. The chance
measure needs refinement and independent holdout calibration, in addition to
the deliberately coarse continuation needing stronger strategic validation.

### D: streamed refinement of the board measure

The next implemented experiment, explicitly `PREFLOP_MODEL_V2_PILOT_3`, combines
eight independent board measures (seeds 17/29/43/101/103/107/109/113) without
adding public nodes or private observation slots. Chance operators are accumulated
one block at a time; an independent verifier separately accumulates three
outcome operators. A test compares streamed results/updates with concatenated
world evaluation on an analytic game.

2,000 full CFR+ iterations took **224.42 seconds**. Training-model NashConv is
**0.000463467**, independently checked in **1.08 seconds**. Solver operators
occupy 36,318,784 bytes; regrets/averages remain 10,310,352 bytes. The three unseen
board seeds 127/131/137 give individual finite-model gaps 0.04079 / 0.04314 /
0.04138; their joint measure gives **0.0190556**. Individual and joint holdout
numbers use different chance measures and are not interchangeable comparisons.
The physical test remains INCONCLUSIVE. This candidate also stays unapproved.

These holdout BRs optimize within sampled finite games; they are not unbiased
estimates or confidence bounds for unrestricted physical exploitability. They
demonstrate unresolved finite-measure sensitivity. Their absence would not by
itself establish a practical high-quality solution either.

The existing external-sampling MCCFR implementation was also executed on the
same V2 abstraction: 256,000 iterations, 7,530,978 nodes, 65,474 observed infosets,
3.35 seconds and approximately 100.6 MB sampled heap. Independent model NashConv
was **0.525261**. Its averaging path left 44,670 visited infosets unaveraged at
this budget. This further supports the full chance-operator approach for this
specific pilot, rather than merely switching programming languages.

## Independent verification and calibration

`preflop_v2_verify.py` imports no solver traversal or regret implementation.
It performs complete NumPy information-set best responses over every finite
chance world. An action is selected after aggregating all hidden worlds in an
information set, not separately for each world. Both player BRs, profile values,
NashConv and HU exploitability are calculated. Typical runtime: 4–5 seconds.
An additional independent verifier, `preflop_v2_operator_verify.py`, rebuilds
three separate loss/tie/win mass operators (not the generator's probability/
pot-share operators). It agrees with full-world BR within 1e-10 for all three
profiles, computes conditional root action EVs, and completes in **0.18–0.19
seconds** including operator construction. Its six operator arrays occupy
about 14.5 MB; this is not process RSS. Preflop maximization still aggregates
hidden flop signals before choosing an action. These are complete finite-model floating-point measurements, not a certified
error bound for physical NLHE or a server approval.

`validate-v2-model.ts` separately replays all 104 public nodes and independently
settles every terminal win/tie/loss ledger through legal checkdowns. Existing
river and conditional HU LP profiles are exported only as calibration inputs:
the new verifier reproduces their known NashConv to floating-point residual
(approximately 1.1e-15 and zero). The new solver is also executed with full CFR,
CFR+ and DCFR on both models. This does not replace their pinned production
implementations. Full-prior exact all-in equity calibration remains missing.

Six analytic tests cover hidden-information BR, deterministic solver
convergence, invalid profile rejection, and equality of sparse-operator versus
full-world updates on a known game with unrevealed signals, and all 24 global
suit renamings / physical hand-class multiplicities, and streamed chance mixtures. These and the
existing-model calibration are added to CI.

The separate physical test lifts the finite-model strategy to legal NLHE play,
with explicitly passive off-tree/checkdown behavior. The first 20,000-world
test of A is **INCONCLUSIVE**, not a pass. It reports only statistical lower
bounds and retains model/profile/source hashes. A missing positive witness
cannot approve a strategy. The new operator candidate must pass this stage
as well as stronger model-quality calibration before any future publication.
The final operator candidate's separately executed 20,000-world physical test
was also **INCONCLUSIVE**, with no positive lower bound. That cannot override
the complete holdout-model failures or justify publication.

Evidence and compressed numeric candidate profiles are in [v2/](v2/).
[Operator verification and diagnostic action EVs](v2/preflop-v2-operator-verification.json),
[cross-model checks](v2/preflop-v2-cross-validation.json),
[seed stability](v2/preflop-v2-sparse-stability.json), and
[physical test](v2/preflop-v2-physical-operator.json) retain actual results.
Earlier source hashes resolve through [snapshot mapping](v2/source-snapshots.json);
the historical TypeScript file has a `.txt` suffix to exclude it from compilation.

## Language and storage comparison limits

Executed TypeScript storage microbenchmark: 100,000 infosets / 2 million
updates, identical checksums. Indexed arrays: 6.4 MB buffers plus measured
heap overhead; Map/object/string keys: about 20.5 MB measured heap growth.
Approximately 0.019 versus 0.768 seconds in this particular storage test.
This is **not** a TypeScript-versus-Numba poker convergence comparison.
The actual new solver uses Python/Numba and SciPy sparse operations. No C++
compiler was found locally, so a standalone original C++20 kernel and an
equivalent indexed TypeScript traversal are now executed in private Linux CI.
They consume the same finite game, chance stream and iteration budget; their
full numeric profiles must agree within 1e-10, then undergo the separate
operator BR. Numba is benchmarked on that same runner with its separately
identified random stream and additional coverage counters. Results remain
pending until that workflow completes; no native speed claim is made yet.
The local TS traversal (not just storage) took 2.61 seconds for 5,303,636 decision
visits. Efficient array files are exported; resumable checkpoints are not yet implemented.

Dependencies were already pinned: NumPy 2.3.5, SciPy 1.16.2, Numba 0.63.1,
llvmlite 0.46.0, with retained third-party notices. New game/solver code is
original Rangeform work. No paid services, imported charts or new hosting.

## Reproduce locally

Use the existing Python environment instructions in README; app development
still requires no Python. These commands write only ignored `output/` files:

```sh
pnpm exec tsx scripts/build-preflop-model-v2.ts
pnpm exec tsx scripts/validate-v2-model.ts
pnpm exec tsx scripts/export-v2-calibration.ts
python scripts/test_preflop_v2.py
python scripts/calibrate-preflop-v2.py
python scripts/benchmark-preflop-v2.py output/preflop-model-v2.json output/v2-comparison.json 10000
python scripts/preflop_v2_sparse.py output/preflop-model-v2.json output/v2-operator.json 2000 17
python scripts/benchmark-v2-mixture.py output/v2-mixture.json 2000
node --expose-gc --import tsx scripts/benchmark-regret-layout.ts
```

Do not run multiple large experiments concurrently on a small host. Defaults
and hard iteration limits are diagnostic compute guards, not quality thresholds.

## Remaining release boundary

The preferred next step is controlled refinement of the board chance measure
and variance-aware independent evaluation beyond the eight-block attempt,
then draw-aware/later-street continuation refinement. Increasing the old
physical information-set budget is not the selected path.

The finite-model solver/complete BR bottleneck is materially reduced. The
full practical HU milestone is nevertheless **incomplete**: model distortion,
board-law error, draw/continuation quality, root stability and server calibration
are not approved. No V2 matrix, EV-loss training, publication or staging update.
Existing conditional HU/river and shared premium UI remain intact.

Mathematical references: [CFR+](https://arxiv.org/abs/1407.5042),
[discounted regret minimization](https://arxiv.org/abs/1809.04040),
[public chance sampling discussion](https://poker.cs.ualberta.ca/publications/2016-johanson-phd-thesis.pdf).
These motivate the methods; measured code/results above, not citations, establish
what this implementation actually achieves.

## Validation

Implementation commit `694b49cd85c1f95a2a4bd23907f46bea9b6284c7` passed the complete
[quality workflow](https://github.com/mankenntmich3/poker-learning-platofmr/actions/runs/34803712297):
117 unit tests, 48 PostgreSQL integration tests, seven production and five
development browser flows, five Python analytic tests at that commit, actual
river/conditional-HU regeneration, V2 ledger replay/calibration, typecheck,
lint and production build. The streamed-mixture/native comparison follow-up
adds a sixth analytic test and requires its own subsequent workflow evidence.
