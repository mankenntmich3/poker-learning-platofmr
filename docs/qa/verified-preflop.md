# Executed HU preflop path — 2026-09-13

**Partial delivery; the requested complete HU preflop game is NOT finished.**
PR #5 remains draft. Existing river verification is preserved. No staging deploy.

## What actually runs

`/mtt/preflop?stack=15&ante=1` uses the existing segmented matrix, extracted shared
premium `PokerTable`, action/recall trainer and persistent mastery/reviews.
The authenticated Tournament coverage table independently verifies and publishes
the bundled library before showing VERIFIED links. Unsupported full-prior,
multi-action and multiway contexts remain unavailable.

| Table / exact scope | Stacks, BB before forced bets | Ante | Verified roots |
| --- | --- | --- | --- |
| HU BTN/SB; fixed AKo/QQ/A5s/76s inputs; Fold/Jam versus Fold/Call | 10,15,20,25,30,40,50,80,100 | NONE, BBA 1 | 18 |
| Complete HU with all starting hands, limp/small raises/continuations | All | All | 0 |
| 3-handed / 6-handed preflop | All | All | 0 |

Each player's input has 26 equally weighted **physical combos**, before rejecting
collisions. These are study assumptions, not equilibrium opening ranges. There
are 554 compatible ordered deals, 52 private information sets, 2771 nodes in the
explicit chance-integrated tree. Each artifact includes all 1326 physical rows:
26 supported, 1300 explicitly unavailable (zero reach, no EV/recommendation).
Neither these rows nor the 18 configurations are counted as complete HU coverage.

## Computation and independent trust

Original Rangeform HU security LPs use SciPy 1.16.2 / bundled HiGHS 1.8.0,
SciPy BSD-3-Clause and HiGHS MIT. Upstream SciPy tag commit:
`dd9a357d5945921310346226088ea8ab5c5356cc`. Source and license notices remain under
`vendor/solver-licenses`; offline JIT uses pinned Numba 0.63.1 / llvmlite 0.46.0
with their permissive notices. No commercial dataset or third-party chart imported.
The original generator source identity hashes both Python files with canonical LF;
the artifact binds solver/package versions, context, full stacks, priors, actions,
tree hash, output profile, timing and immutable checksum. Deterministic exact
enumeration and LP have no random seed/sampling error.

1. Generator directly classifies seven-card hands and exhaustively enumerates
   all C(48,5) = 1,712,304 boards per four-card matchup.
2. An independent evaluator classifies each five-card subset and takes the best
   of all 21. It repeats the **entire** board enumeration. All 21 matchup integer
   win/tie/total triples agree. Exact suit-permutation/player-exchange bijections
   expand these to all 554 deals. No rank bucketing or approximate equity matrix.
3. Server-owned verified equity counts are pinned by hash. The publication
   verifier accepts no artifact-supplied payoff table. It replays the public
   betting ledger, reconstructs net chip payoffs, then recomputes information-set
   BR for both players, profile utilities, NashConv and every combo EV/reach.
4. A separate generic finite-tree BR agrees on the actual 554-deal game and on
   deliberately exploitable profiles. Exhaustive pure policies cross-check a
   smaller actual-poker subset. This second BR check shares approved equity
   counts; evaluator independence is supplied by step 2, not falsely inferred
   from the BR check.

The equity table is reviewed **server evidence**, not an opaque solver claim.
Online requests reverify strategy profiles against that pinned evidence rather
than repeating a 30-minute enumeration. `scripts/preflop_equity.py verify` makes
the full offline trust step reproducible. The signed evidence and all 18 reports
are in [preflop-calibration.json](preflop-calibration.json).

Policy `rangeform-verification-v3-preflop1` accepts NashConv + 1e-9 BB numerical
allowance <= 1e-7 BB/hand; VERY_HIGH <= 1e-8. This quality describes only the
declared restricted game. Generator convergence fields never control acceptance.
No imported model, changed prior, missing combo, forged EV, changed stack vector,
unsupported tree or changed license/source identity passes the gate.

At HU 15 BB / BBA 1: profile utilities approximately `[+0.51805054,-0.51805054]`
BB/hand. Independently measured NashConv approximately `6.66e-16`, exploitability
`3.33e-16` BB/hand: floating-point residuals, not a claim of exact real-number zero.
EVs are **net changes from before forced posting**, unlike the centered river EV.
BTN folds for -0.5 BB; BB folds to a jam for BTN +2 BB. Called jam returns BTN's
one uncalled live BB, distributes 29 BB, and costs BTN 14 BB. A tie gives BTN
+0.5 and BB -0.5 due to the dead BBA. These values follow chip replay, not fixed
strategy EV labels. Action EVs still depend on the actual opponent profile.

## Measured compute and limits

Complete HU equity generation: 69.41 seconds. Independent best-five re-enumeration:
1843.50 seconds. Each evaluates 35,958,384 distinct boards across 21 matchups.
Stack/ante-specific LP executions take approximately 15–21 ms after Python startup;
the measured local worker solve→verify→publish job took 908 ms, including
45.6 ms verification/publication, with worker RSS 432,517,120 bytes. Solver peak
RSS is explicitly unknown, not claimed as measured. These are local measurements,
not SLA or estimates for a general solver.

The bounded local worker persists QUEUED → RUNNING → VALIDATING → VERIFIED/FAILED,
with artifact identity, iteration count, runtime, node count and verification time.
It permits at most nine distinct approved stacks and 130 seconds per job. It does
not start paid/on-demand hosted workers. Publication errors stay unavailable.

[Multiway benchmark](preflop-multiway-benchmark.json) actually enumerates one fixed
three-player deal (1,370,754 boards) and one fixed six-player deal (658,008 boards),
with both independent evaluators and exact tie-share conservation. This is payoff
work, **not a solved strategy**. The 3-player independent run took 128.1 s, the
6-player run 126.2 s. There are 1,832,266,800 ordered physical 3-player hole deals
before symmetry, already before histories or runouts; six players have
1,544,626,032,777,828,000. These counts do not imply no faster algorithm exists.
They establish why the current exhaustive full-deal representation cannot simply
be scaled. The HU two-player minimax LP is not a multiplayer Nash solver.

Next viable implementation: a vectorized full-prior HU push/fold engine with
verified suit-isomorphic payoff compression, followed by a genuine postflop
continuation model for limp/small-raise leaves. Generalizing the present 26-combo
input to 1326 hands is still work, not completed by writing empty rows. Multiway
then needs a separate strategy algorithm and per-player independent BR/NashConv;
equilibrium convergence is not guaranteed by applying two-player LP/CFR claims.

## Reproduction

Normal local application setup remains the README quick start; Python is optional.
After local signup/demo login, Tournament → HU-Teilspiel studieren.

```powershell
python -m venv .tools/preflop-venv
.tools/preflop-venv/Scripts/python -m pip install -r scripts/solver-requirements.txt
$env:PYTHON_EXECUTABLE=(Resolve-Path .tools/preflop-venv/Scripts/python.exe).Path
New-Item -ItemType Directory -Force output | Out-Null
& $env:PYTHON_EXECUTABLE scripts/preflop_equity.py generate output/preflop-generator-equity.json
& $env:PYTHON_EXECUTABLE scripts/preflop_equity.py verify output/preflop-independent-equity.json
pnpm solve:preflop 15 1 output/recomputed-preflop.json
pnpm verify:nlhe output/recomputed-preflop.json
# Stop the local dev server before opening its PGlite database with this worker.
pnpm solve:preflop:jobs 10,15,20,25,30 1
```

On Linux use `.tools/preflop-venv/bin/python` and `export PYTHON_EXECUTABLE=...`.
The fresh-checkout CI regenerates all 21 generator equity matchups, solves HU,
independently checks the generated profile and then runs the application gates.
Full independent offline enumeration was executed locally; CI does not falsely
claim to repeat that 30-minute step on every push.

## Application acceptance

Passed locally: strict typecheck, lint, all unit/integration tests (external PG
cases exercised in CI), production build, all seven production browser flows,
all five development flows. New E2E: protected login → HU 15 BB BBA → 169-cell
matrix → AKo → stack 20/15 switching → actual hole-card trial → jam → checked
action EVs/EV Loss → recall → persisted mastery → logout/login → retained answers.
Existing river E2E still passes. New mobile desktop/390px flows include Axe and
keyboard checks. Final exact-head CI result is recorded in PROJECT_STATUS.md.


Final application validation: commit `0ef7f9ef813bf23473db618d1f319c81a0897d9e`,
[CI run 34731503071](https://github.com/mankenntmich3/poker-learning-platofmr/actions/runs/34731503071),
all gates successful. 100 unit, 46 PostgreSQL integration tests, seven production
and five development browser flows; no skips. The Linux-regenerated HU artifact
independently measured the same 6.66e-16 NashConv. Final local typecheck/build,
100 unit tests, integration regressions and HU/river browser retests passed.
The final visible Fold control has readable contrast; Axe now covers the actual
preflop decision buttons as well as matrix and recall. Full HU DoD remains open.
