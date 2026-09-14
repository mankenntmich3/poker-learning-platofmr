# Executed full-prior preflop attempts — not a completed release

2026-09-13, existing `feature/mtt-gto-accuracy-v3`, draft PR #5. **The requested
complete verified HU flow remains unavailable.** No new strategy is published,
no approval threshold is relaxed, and staging is unchanged. Existing verified
conditional HU and river artifacts, source pins, policies and UI are preserved.

## What was actually executed

Original external-sampling MCCFR now plays a real 52-card, full-prior tournament
game with 2, 3 or 6 players. The domain supports arbitrary stack vectors, NONE/BBA,
live blinds, dead antes, side pots, uncalled returns and fractional ChipEV splits.
All 1326 physical starting combos have a uniform marginal prior; dealt opponents
and every board card are drawn without replacement, including folded blockers.
No premium-hand conditioning, hand-score frequencies or equity-realization leaf
values are used in these experiments.

The versioned multi-action tree has Fold/Limp/Open 2/Open 2.2/Jam; the next raise
level offers 5/6 BB, the following level 10 BB, subject to the legal minimum and
stack cap. Jam remains available when legal. The BB can check behind a limp.
Non-all-in calls lead to actual flop/turn/river decisions. Each postflop street
offers check, half-pot opening bet and jam, then legal fold/call/jam responses.
This is a **PARTIAL_TREE action abstraction**, not unrestricted NLHE. Absolute
BB and pot-after-call raise sizes are parameters; illegal sizes are omitted,
not rounded into an invented alternative. The existing public engine executes
every transition. A nonterminal payoff request throws.

Chance samples include a full runout, but information keys expose only the
acting seat's cards and chronological public actions/dealt cards. Opponent and
future board cards are excluded. Regret traversals commit only on completion.
Average strategies use a separate full-support sampling path with own-reach /
proposal-reach importance weighting, including for multiplayer. Unvisited
information sets have an explicit uniform default. A populated default is not
evidence of learning or convergence. No multiplayer Nash guarantee is inferred
from regret minimization, and no sampled action EV is offered for training.

Algorithm reference: [Lanctot et al., MCCFR (2009)](https://www.mlanctot.info/files/papers/nips09mccfr.pdf).
The [OpenSpiel averaging discussion](https://github.com/google-deepmind/open_spiel/blob/master/open_spiel/python/algorithms/external_sampling_mccfr.py)
explains why the simple two-player opponent-node averaging rule cannot just be
assumed unbiased for more players. No upstream implementation was copied or
new dependency installed. The implementation is original code in this private
project; it is not newly relicensed as MIT/Apache. Node version, hardware,
seed, full context, tree hash, source files/hashes and verifier source identity
are stored in [the executed reports](preflop-full-prior-attempts.json).

## Measurements, not approved ranges

All runs use seed 20260913 and a per-run cap of 60 seconds, 500000 information
sets, 20 million visited nodes and 768 MiB sampled JS heap. Runtime includes
profile extraction; resource checks are periodic. Heap is sampled during
traversal, not a claim about total process peak RSS or serialization memory.
Wall times were measured on the same development machine alongside validation,
not on an otherwise idle performance reference host.

| Players / stack / BBA | Tree | Complete iterations | Visited nodes | Infosets | Averaged root combos | Runtime | Outcome |
| --- | --- | ---: | ---: | ---: | ---: | ---: | --- |
| HU / 15 / 1 | Multi-action | 16034 | 1234001 | 500000 | 1326/1326 | 27.62 s | INFOSET_BUDGET |
| 3 / 15 / 1 | Multi-action | 7371 | 990481 | 500000 | 1319/1326 | 29.16 s | INFOSET_BUDGET |
| 6 / 20 / 1 | Multi-action | 3029 | 732731 | 500000 | 1184/1326 | 31.02 s | INFOSET_BUDGET |
| HU / 15 / 1 | Push/fold fallback | 537492 | 5322241 | 2652 | 1326/1326 | 60.00 s | RUNTIME_BUDGET |
| 3 / 15 / 1 | Push/fold fallback | 188484 | 3881729 | 7956 | 1326/1326 | 60.01 s | RUNTIME_BUDGET |
| 6 / 20 / 1 | Push/fold fallback | 30847 | 2147329 | 82145 | 1326/1326 | 60.11 s | RUNTIME_BUDGET |

“Averaged” means visited by the independent average-policy sampling pass; it
does **not** mean independently verified or statistically accurate. All six
tried strategies have `nashConv: null`, `exploitability: null`, `publishable: false`.
The smaller trees were really trained; they are not reused 26-combo artifacts.
NONE was also executed in a one-second CLI smoke test, not claimed as coverage.

## Independent verification attempt

`verification/multistreet-preflop.ts` imports no solver, generator payoff or
reported convergence/EV. It independently enumerates physical hole deals and
street-ordered chance, reconstructs public actions, verifies policy identities
and normalization, and settles terminal chips with the separate best-five
oracle. Only after complete reconstruction can the independent counterfactual
information-set BR evaluator measure profile values, all unilateral BR values,
NashConv and HU zero-sum exploitability. The solver's uniform fallback is a
well-defined candidate policy, not a reason to omit those states from BR.

Every attempted full verification hit its separate 20000-node budget and
returned **COMPUTE_LIMIT with no report**, not a deceptively low partial BR.
The HU multi-action attempt checked 10715 terminal payoffs across nine started
chance cases; 3-handed checked 10464 and 6-handed 10615. These partial checks
are diagnostics, not a complete payout/BR certificate. The expanded chance
space is 55,627,620,048,000 HU deal/runout assignments:
`C(52,2) * C(50,2) * C(48,3) * 45 * 44`. Street ordering matters when later
decisions are present. For all-in-only trees, an optimized verifier could
collapse the 20 equivalent street assignments and additionally apply exact
suit symmetry; this reference attempt does not yet perform that optimization.

Already on a single fixed limp/check/check-through public betting path, one
seat has `1326 * C(50,3) * 47 * 46 = 56,189,515,200` distinct card observations
by the river before exact suit isomorphism. This explains why a sparse sampled
strategy with 500000 stored infosets is far from a trained unabstracted tree.
It is **not a proof that all algorithms or better hardware cannot solve it**.

The generic CFR implementation was cross-checked by training the existing real
conditional river game and measuring its resulting profile with the separate
BR evaluator. That implementation regression does not calibrate any preflop
quality threshold. The server continues approving only its previously pinned
conditional river/HU models. Experiment schema, runtime status, default policies
and solver-reported metrics cannot authorize publication.

## Persistence and reproduction

Run from the repository after `pnpm install --frozen-lockfile`; no Python is
needed for this new experiment. Commands perform bounded offline computation:

```sh
pnpm solve:preflop:attempt 2 15 60 output/hu15.json
pnpm solve:preflop:attempt 3 15 60 output/three15.json
pnpm solve:preflop:attempt 6 20 60 output/six20.json
pnpm solve:preflop:attempt 2 15 60 output/hu15-pf.json push-fold
pnpm solve:preflop:attempt 3 15 60 output/three15-pf.json push-fold
pnpm solve:preflop:attempt 6 20 60 output/six20-pf.json push-fold
pnpm solve:preflop:attempt 2 15 1 output/hu-none.json multi-action 0
pnpm solve:preflop:record-attempts output/hu15.json output/three15.json output/six20.json
```

The recorder is development-only and refuses `DATABASE_URL` or production.
Its fallback directory is `.data/preflop-attempts`; an explicit `DATA_DIR` takes
precedence. Six actual runs were recorded in `.data/preflop-experiment-qa`.
Only compact diagnostic metadata enters `solver_jobs`, never the potentially
large sampled profiles or `verified_solution_artifacts`. Migration 011 preserves
old jobs and adds COMPUTE_LIMIT/NON_CONVERGED and priority P4. The explicit CLI
is not a background queue worker or on-demand hosted service.

The full output profiles stay in ignored `output/`; committed summaries retain
their SHA-256, exact inputs and source identities. Each new command also writes
an adjacent `.summary.json`. Fixed seed and deterministic node/infoset budgets
are reproducible; wall-clock cutoffs naturally produce different iteration counts
on different machines. No account data or secrets occur in these reports.

## Remaining work and the next realistic technical step

No COMPLETE_RANGE is published or trainable. Multi-action HU, 3-player and
6-player action EVs, verified frequencies, EV-loss training and their requested
browser flows remain open. Current study pages continue serving only the
previously certified conditional models. Shared PokerTable/matrix/recall/mastery
were preserved; no new unverified UI or design detour was added.

The largest blocker is complete, quantitatively certified continuation strategy
and BR over the full card space. Increasing the sparse-map cap alone is not a
credible plan. Next: factor chance and public betting states, apply lossless
global suit isomorphism with perfect-recall checks, and implement vector or
sequence-form BR with independently audited equity kernels. First calibrate
that representation against existing exact conditional games, then a full-prior
all-in game, then add the actual multistreet continuation. Card bucketing or
forced checkdown would change the game and requires explicit error/scope
handling; it cannot silently satisfy the complete HU acceptance criterion.

See [every requirement of this follow-up](../PREFLOP_FULL_RANGE_REQUIREMENTS.md)
and [the original 66-point V3 audit](../MTT_V3_REQUIREMENTS.md). **PR remains draft.**
