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

## Quality gate now implemented

The new `VerifiedSolutionArtifact` separates `VERIFIED_SOLVER` and `IMPORTED_VERIFIED` from `APPROXIMATED`, `DEMO` and future `INTERPOLATED` data. The gate verifies:

- exact NLHE game type, evaluation model, handedness, positions, blinds, antes, stacks, action history and board;
- declared legal actions equal the immutable betting tree;
- every physical combo is unblocked, unique, in range and has exactly one normalized frequency for every declared action;
- finite EVs where present, complete solver identity, algorithm, iteration count, runtime and abstraction details;
- a passed numerical threshold, optional non-negative exploitability, timestamp, licence/source and content checksum;
- standard GTO training eligibility only after status `VERIFIED` and source `VERIFIED_SOLVER` or `IMPORTED_VERIFIED`.

Quality labels derive from the artifact's declared and documented convergence threshold: at most 25% of threshold is `VERY_HIGH`, at most 60% is `HIGH`, and a passing result above that is `EXPERIMENTAL`. This is a relative convergence label, not a claim that different games or metrics are directly comparable.

## Remaining verification before the first real MTT node

1. Select and pin an eligible solver commit or obtain written commercial data rights.
2. Audit the exact multiplayer preflop game, card/action abstraction, BBA accounting and best-response implementation.
3. Define a conservative NashConv/exploitability threshold in BB/hand for that model and document compute hardware.
4. Reproduce a deterministic sample, compare independent implementations or references under identical assumptions, and preserve deviations.
5. Only then publish multiple 6/8/9-handed, 10–50 BB MTT ChipEV nodes to the standard trainer.

Until those steps pass, zero verified coverage is the correct product result. A missing solution is preferable to a fabricated one.
