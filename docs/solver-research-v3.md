# Solver and strategy-data research — MTT GTO accuracy v3

Research date: 2026-09-11. Scope: official product documentation, official terms and upstream repositories only. No provider was scraped, reverse engineered or queried for strategy extraction.

## Decision

Rangeform currently has **no legally obtained, independently validated MTT NLHE solution dataset**. Therefore the standard Tournament Study surface reports `Verified GTO solution currently unavailable.` and exposes no GTO training questions. Existing Rangeform heuristics remain a separately named Cash Sandbox and keep `APPROXIMATED` provenance.

The immediate implementation uses an engine-neutral artifact format, quality gate and PostgreSQL registry. A solver is not accepted because it produces plausible frequencies. Publication requires an exact context, complete solver and betting-tree identity, normalized legal combo strategies, immutable checksum, a passed numerical convergence threshold and reproducible validation evidence. Failed validation is stored as a failed job and never creates a discoverable strategy artifact.

## Commercial providers and solvers

| Provider | Official access found | Reuse decision |
| --- | --- | --- |
| GTO Wizard | The public API found is a benchmarking API. Its terms restrict use to agent benchmarking and explicitly prohibit scraping, systematic strategy extraction and model distillation. | No solution-data provider. Contact the vendor for a separate written B2B/data licence before any integration. |
| GTOBase | Published terms grant personal, non-commercial access and prohibit copying, competitive use, reverse engineering and dumping solution libraries. | No integration or automated export. |
| DTO Poker | Published terms describe personal/non-commercial app use and prohibit combining or incorporating... modified app content with other software without permission. | No integration or solution reuse without a separate written licence. |
| PioSOLVER | Official UPI offers local scripting. Normal licences allow personal integration when each user owns Pio, but prohibit turning results into an on-demand service. The official business page offers a cloud/web licence at a quoted high-volume price. Edge provides heads-up preflop, not 6–9 handed MTT coverage. | Technically adapter-friendly, but not selected: licence/cost and handedness do not meet this milestone. |
| TexasSolver | AGPL-3.0 repository; its author explicitly requests a commercial licence for source integration or providing an internet service. It is a heads-up postflop solver. | Do not integrate into hosted Rangeform without a written commercial licence. |
| Simple Postflop / MonkerSolver / HRC / GTO LAB | No official public solution-data API or redistribution licence was established in this research pass. Product access or ordinary exports are not evidence of redistribution rights. | Treat as unavailable until the owner obtains written API/data terms. They may be used manually only where their terms permit and only for like-for-like validation. |

Official sources:

- [GTO Wizard Benchmark API terms](https://gtowizard.com/benchmark/terms)
- [GTOBase terms](https://www.gtobase.com/docs/terms)
- [DTO Poker terms](https://www.dto.poker/terms/)
- [PioSOLVER licensing](https://piosolver.com/docs/licensing/), [business licensing](https://piosolver.com/docs/faq/business/), [UPI](https://piosolver.com/docs/upi/) and [product comparison](https://piosolver.com/docs/product_comparison/)
- [TexasSolver upstream and licence statement](https://github.com/bupticybee/TexasSolver)

## Open-source candidates

| Candidate | Licence | Coverage and quality signals | Decision |
| --- | --- | --- | --- |
| `amaster97/poker_solver` | MIT according to upstream README | HUNL; Python reference plus Rust DCFR differential checks; preflop, push/fold and postflop claims. It does not establish 6–9 player MTT BBA coverage from the README alone. | Best candidate for an isolated technical evaluation. Pin a commit, reproduce tests and audit its preflop game model before using output. No artifact is verified yet. |
| `b-inary/postflop-solver` | AGPL-3.0-or-later in upstream Cargo metadata | Mature heads-up postflop library with full-combo solving; not a multiway MTT preflop solver. Network integration triggers material source-availability obligations that need an explicit project licensing decision. | Possible later postflop engine only after AGPL compliance/ownership decision. |
| `bupticybee/TexasSolver` | AGPL-3.0 plus upstream commercial-integration statement | Heads-up postflop, JSON output, cross-language interface; no MTT preflop coverage. | Rejected for hosted integration without commercial licence. |
| Unlicensed CFR repositories | No licence means normal copyright remains with the author. | Even technically useful code cannot be assumed reusable. | Rejected. |

Upstream sources:

- [`amaster97/poker_solver`](https://github.com/amaster97/poker_solver)
- [`b-inary/postflop-solver` Cargo metadata](https://github.com/b-inary/postflop-solver/blob/main/Cargo.toml)
- [`bupticybee/TexasSolver`](https://github.com/bupticybee/TexasSolver)

## Correction after the 2026-09-12 trust review

The earlier Phase-1 implementation checked generator-reported convergence and even used the artifact's threshold for quality labels. It also accepted incomplete combo lists. That was structural plausibility checking, not independent mathematical verification. Those acceptance paths and quality labels have been removed. No real NLHE solution had been published.

Current structural checks validate runtime schemas, full physical combo coverage including zero reach, legal public replay, complete multiway stacks, canonical context and tree identity, normalized frequencies and immutable provenance. They return STRUCTURALLY_VALID only. Generator EVs/reach/full-profile claims still need an independently built game to be checked mathematically.

The server-owned rangeform-verification-v2 policy approves no NLHE model, accuracy threshold or dataset license yet. Publication explicitly fails, stores the reason and makes no strategy available. Imported data has the identical mathematical and provenance requirements. Historical uncertified VERIFIED flags are quarantined without deleting their artifacts.

An original independent reference evaluator now enumerates information-set-consistent best responses for bounded finite perfect-recall games. Analytic two-player and multiway tests establish its limited numerical behavior. It has no audited NLHE adapter and is not evidence of NLHE accuracy. NashConv is computed as the sum of each player's unilateral improvement; the HU zero-sum /2 exploitability convention is not applied to multiway results. Work exceeding exact enumeration limits is rejected.

Before approving a model, Rangeform must independently build and audit its game/payoffs and information sets, verify the complete joint strategy plus node projection/EV/reach, measure BR/NashConv, calibrate server-side accuracy and numerical error bounds, verify source/license/parameter identity, and bind the report to all immutable hashes. See [trust review](qa/mtt-trust-review.md) for findings, tests and limitations.

Current 6/8/9-handed, BBA, 10–100 BB verified coverage: **zero**. The next work is still a real eligible multiplayer NLHE generator and independently validated game/verification adapter; no architecture or fixture is counted as a solved node.


## Executed follow-up: conditional river model (2026-09-12)

The v2/no-adapter statements above describe the earlier trust review. This follow-up
implements a genuine executable bounded NLHE path, not a general MTT solver.

- Pinned and inspected `amaster97/poker_solver` at
  `f78f1b2bc338dd8cbb5226ecb8398bbdb3635676`. Actual `HUNLConfig` uses two players,
  symmetric starting stacks and a symmetric ante; it is not 8/9-handed BBA.
  Its chart interpolation and preflop claims are not imported as verified data.
  The unchanged MIT DCFR engine is vendored and executed against an original
  full-combo conditional river game, with a policy-freezing adapter. Recorded
  2k/20k/200k runs are diagnostic, not approved strategies.
- For the exact one-round game, original sequence-form security LPs are executed
  by SciPy 1.16.2 (BSD-3-Clause), bundled HiGHS 1.8.0 (MIT). The release source
  tag identifies `dd9a357d5945921310346226088ea8ab5c5356cc`. Both license texts,
  interpreter requirements and adapter hashes are retained. Runtime version is
  in the artifact. This solves both players' security policies without sampling.
- The LP output is accepted only after a separate TypeScript reconstruction,
  full-information-set best responses, combo projection checks and a calibrated
  server-owned numeric bound. A separate generic evaluator checks the entire
  game and an exhaustive oracle checks a smaller NLHE instance. The longer DCFR
  run's game-value error lies within its independently measured BR interval.

Sources: [SciPy linear programming](https://docs.scipy.org/doc/scipy/reference/generated/scipy.optimize.linprog.html),
[HiGHS](https://highs.dev/),
[pinned SciPy source](https://github.com/scipy/scipy/tree/dd9a357d5945921310346226088ea8ab5c5356cc),
[pinned poker engine](https://github.com/amaster97/poker_solver/tree/f78f1b2bc338dd8cbb5226ecb8398bbdb3635676).

See [executed QA](qa/verified-river.md) for exact priors, public history, utility
convention, independent measurements and limits. One river root is trainable;
6/8/9-handed preflop BBA 10–100 BB coverage is still zero. Neither HUNL charts nor
a generic LP can simply substitute for the much larger multiway imperfect-
information game. That work still needs a complete preflop/chance/continuation
model and full-profile best responses, including card removal and side pots;
NashConv must sum unilateral improvements without applying the two-player /2
convention. Current context/replay/queue supports preserving those parameters,
but an executable approved multiplayer solver is not delivered in this run.


## Executed preflop follow-up — 2026-09-13

The current decision supersedes the historical no-data statement above: one
conditional HU push/fold model is implemented, independently verified and usable
at nine stacks with BBA/NONE. Complete HU and multiway coverage remain absent.
See [executed scope and evidence](qa/verified-preflop.md).

Rechecked primary upstream sources: [chirenonhive/poker-solver](https://github.com/chirenonhive/poker-solver),
[amaster97/poker_solver](https://github.com/amaster97/poker_solver),
[MatthewPDingle/GTOpen](https://github.com/MatthewPDingle/GTOpen).
The first repository explicitly scores non-all-in closures with equity realization
rather than solved postflop continuation; those outputs cannot validate the
requested unrestricted limp/raise game. Existing amaster MIT/DCFR code remains
pinned from the river evaluation. No source or data from the other candidates
was integrated or certified based on README claims. Their unpinned latest heads
are research leads, not reproducible execution identities.

Selected execution: original Rangeform physical-combo HU security LP with the
already pinned SciPy 1.16.2 / HiGHS 1.8.0 engine (BSD-3-Clause / MIT). Source commit
for SciPy tag v1.16.2 is dd9a357d5945921310346226088ea8ab5c5356cc. Original local
adapter source is identified by the canonical-LF two-file SHA-256 in
`server/preflop-approval.ts`, plus this branch's Git commit. Two players, explicit
full stack vector, SB/BTN 0.5, BB 1, optional BBA 1 paid from the BB stack.
Fold/Jam versus Fold/Call only; all-in runouts exact, no postflop proxy or card
bucketing. Exact fixed input ranges, not a complete random-deal preflop solution.

Full independent enumeration took 30.7 minutes for the 21 matchup orbits; the
current finite representation does not support unrestricted multiway. Actual
3/6-player all-in benchmarks are recorded separately; they do not supply a
strategy algorithm or NashConv certificate. No imported verified dataset has
been approved and no heuristic frequencies entered normal training.


## Full-prior multi-action execution (2026-09-13)

The previous conditional release remains preserved. Rechecked primary sources
again disclose the non-all-in limitation: [chirenonhive/poker-solver](https://github.com/chirenonhive/poker-solver)
uses equity realization at such leaves; [amaster usage](https://github.com/amaster97/poker_solver/blob/main/USAGE.md)
identifies limits on full chance-over-hole-card preflop. No unpinned upstream
code or frequencies from those repositories were approved or imported.

Instead, an original external-sampling MCCFR implementation was executed on
full-prior HU/3/6 games with real bounded later-street betting and on smaller
full-prior all-in trees. The algorithm follows [Lanctot et al.](https://www.mlanctot.info/files/papers/nips09mccfr.pdf);
separate full-support importance-weighted averaging avoids assuming the simple
HU opponent-node averaging rule works unchanged in multiway. No new external
solver package or commercial dependency is used. Source hashes and local Node
version are recorded, rather than attributing this new engine to the old SciPy
LP or MIT DCFR implementation.

All six real attempts failed to obtain a complete independent BR certificate.
They are not GTO data and do not satisfy the complete HU release criterion.
The exact model, action sizes, chance/compute limits, measurements, licensing
boundary and next viable factorization work are in [full-prior QA](qa/full-prior-preflop.md).
