# HU verification follow-up: quantitative rejection, not VERIFIED

2026-09-13. The previously staged work was first committed and pushed as
`7b85005da6bea0001c4a6d37b08d5b5a4a060a08`; its entire
[GitHub quality workflow passed](https://github.com/mankenntmich3/poker-learning-platofmr/actions/runs/34772240143).
This follow-up remains restricted to HU. No further 3/6-player solving, staging
deployment, merge or promotion of PR #5 occurred.

## Implemented and executed

The new independent verifier can now **reject an inaccurate frozen strategy
quantitatively without enumerating the complete chance tree**. It reconstructs
physical deals, public actions and best-five terminal payouts without importing
the solver traversal, RNG, regrets or EV estimates. Nine legal deviations are
fixed before measurement: each root action, plus postflop check/call and jam
rules for each player. Neither policy can observe the opponent's hand or future
board. Each deviation is paired with baseline play on common random inputs.

There are 20000 fixed observations per candidate. The one-sided empirical
Bernstein inequality of [Maurer and Pontil, Theorem 4](https://www.cs.mcgill.ca/~colt2009/papers/012.pdf)
is applied to paired gain. The support width is the deterministic 60 BB from
the 15/15 stack vector, not the observed sample range. With sample variance
`s²`, count `n`, nine hypotheses `K`, and `delta=1e-9`, the lower bound is:

```text
mean_gain - sqrt(2*s²*log(2*K/delta)/n)
          - 7*60*log(2*K/delta)/(3*(n-1))
```

The union bound covers all nine hypotheses in each report. The largest positive
bound per player, summed across players, lower-bounds NashConv. This is valid
under the explicitly recorded IID-random-draw idealization of the cryptographic
stream. AES-256-CTR, rejection sampling, seed, candidate hash, observations,
variance, source hashes and bounds are retained. These are statistical statements,
not deterministic enumeration certificates. The two distinct reported candidate
tests have a combined failure bound at most `2e-9` under those assumptions.
Repeated same-seed execution is reproducibility evidence, not extra samples.

Critically, this method supplies **no NashConv upper bound**. Zero detected gain
is INCONCLUSIVE; it cannot grant VERIFIED. An interrupted run returns no confidence
bound, avoiding optional-stopping misuse. The script refuses to write evidence
if verifier sources change during measurement. Tests include an analytically
known +2.5 BB deviation, support-width/confidence checks, timeout rejection and
the production publication gate rejecting the entire diagnostic format.

## Solver changes

The solver can merge losslessly equivalent **global suit permutations** while
retaining all 1326 physical starting combos. Hole cards and every public street
are canonicalized jointly; cards/streets are never independently renamed.
The full chronological record retains perfect recall. Tests exhaust all 24
suit permutations for a history, recover earlier information from its prefix,
distinguish flush relationships, and verify exactly 169 preflop suit orbits.
Fixed dead cards are excluded from this encoding until their stabilizer subgroup
is implemented. There is no rank-strength bucketing or approximate card feature.

Repeated observations are cached, including the bounded 1326-entry preflop cache.
Average-policy export omits never-averaged information sets because they are
exactly the already-declared uniform default. Root visitation is tracked
separately, so sparse output cannot turn omitted rows into fake learned coverage.
This preserves policy semantics; it does not make unlearned states accurate.
The diagnostic DB recorder retains the information encoding.

The larger run used 2 million infosets / 1536 MiB sampled heap / 300 seconds,
versus the earlier 500000 / 768 MiB / 60 seconds. Increased learning is therefore
**not claimed as an equal-budget speedup from symmetry alone**.

## Actual result

HU, 15 BB, BBA 1, BTN/SB, full physical prior; the same versioned multi-action
preflop and bounded later-street tree as the preceding attempt.

| Candidate | Iterations | Visited nodes | Infosets | Exported policy records | Root combos | Measured rejection |
| --- | ---: | ---: | ---: | ---: | ---: | --- |
| Previous physical encoding | 16034 | 1234001 | 500000 | Previous explicit defaults | 1326/1326 | NashConv **at least 0.0277326 BB/hand** |
| Suit-isomorphic, larger budget | 70520 | 5248052 | 2000000 | 46213 | 1326/1326 | NashConv **at least 0.0890429 BB/hand** |

The second solver run took 125.04 seconds with sampled heap peak 1534389280
bytes. Its independent full-enumeration reference still hit its separate 20000
node cap. The new scalable witnesses instead completed in approximately 27.56
and 30.68 seconds. The successful deviation in both was BTN postflop jam: measured
paired mean gains 0.384700 and 0.460445 BB/hand respectively. These are gains of
a tested legal policy, not complete best-response values or trainer action EVs.
Different samples/lower bounds do not prove a monotonic worsening of true NashConv.

Evidence:

- [Optimized solve, exact configuration and source hashes](hu15-suit-optimized.json)
- [Independent rejection of the previous candidate](hu15-deviation-original.json)
- [Independent rejection of the optimized candidate](hu15-deviation-optimized.json)

The optimized failed attempt was recorded locally as a diagnostic job. Neither
candidate is publishable; the existing exact conditional HU and river approval
policies, artifacts, PokerTable, matrix and trainer remain unchanged.

## Reproduction

```sh
pnpm solve:preflop:attempt 2 15 300 output/hu15-suit.json multi-action 1 suit
pnpm verify:preflop:deviations output/hu15-suit.json 20000 output/hu15-witness.json
```

The optional fifth verifier argument is the recorded 64-character hex seed.
Pass it to reproduce a measurement against the **identical candidate hash**.
The solver's wall-clock/heap limits may stop at different iterations on another
host; do not compare different candidate files as identical profiles.

## What this establishes—and what remains open

The blocker is **not only an oversized verifier**. Both supplied candidate
profiles contain profitable legal deviations. The larger run still has
1953787 information sets never reached by the averaging pass. Merely granting
an approval label or increasing the enumeration cap cannot repair that strategy.
This is a measured limitation of the current sparse multistreet approach within
the executed budgets, **not a proof that HU solving is generally impossible**.

A complete positive independent upper certificate and a sufficiently converged
full-prior multi-action HU strategy remain missing. The next implementation must
factor public states and strengthen actual continuation learning, paired with
a tight information-set BR upper bound; rejection witnesses alone are inadequate.
No new COMPLETE_RANGE matrix, EV-loss trainer flow or HU release DoD is claimed.
Prompt 2 remains incomplete; PR #5 remains Draft.

## Validation of committed implementation

Implementation commit `efc29f3448d33cc325b9f09453eab4dba93d7b1f` was pushed to
`feature/mtt-gto-accuracy-v3`. Its complete
[Linux/PostgreSQL quality workflow passed](https://github.com/mankenntmich3/poker-learning-platofmr/actions/runs/34773497065):
fresh dependency installation, exact equity and conditional HU/river solver
regeneration, independent verification, bounded multi-action execution,
typecheck, lint, 116 unit tests, 48 integration tests, production build,
seven production browser flows and five development-access browser flows.
No CI tests skipped. Local checks also passed: typecheck/lint/build, 159 tests
(five dedicated PostgreSQL cases deferred to that successful CI run), and both
verified HU/river browser flows. This validates implementation and regression
behavior, not the rejected multi-action strategy's game-theoretic accuracy.
