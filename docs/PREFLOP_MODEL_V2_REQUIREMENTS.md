# Solver architecture request — requirement-by-requirement status

2026-09-14. [Original request](PREFLOP_MODEL_V2_SPEC.md).
[Implemented methods and evidence](qa/preflop-model-v2.md).
**Prompt 2 remains incomplete; V2 has no publication approval.**

| # | Requirement | Status | Actual outcome / gap |
|---|---|---|---|
| 1 | Scalable full HU multi-action core | PARTIAL | Real 104-node pilot and full-model BR run; physical/model quality unapproved. |
| 2 | Benchmark abstract subgame and value oracle | DONE for experiments | A/B actually trained and completely evaluated; neither approved. |
| 3 | Mathematical continuation values | DONE for pilot | Actual bounded subgames/checkdown payoffs; no heuristic realization factors. |
| 4 | Versioned abstraction contract | PARTIAL | Immutable pilot context/tree/source/chance identities; no approved production policy. |
| 5 | All 1326 root combos | PARTIAL | All physical hole pairs represented and class projection; board-law and symmetry calibration need release review. |
| 6 | Public-state factorization | DONE | 104 shared numeric nodes; sparse chance operators; no JSON hot-path keys. |
| 7 | Indexed storage / checkpoints | PARTIAL | Arrays vs Map measured, binary profiles saved; resume/checkpoint protocol absent. |
| 8 | TS / Numba / native traversal comparison | PARTIAL pending CI | Actual TS traversal measured; equivalent C++ and Numba comparison added to private CI; results must be checked. |
| 9 | Algorithm execution/comparison | DONE for bounded comparisons | External sampling, chance-sampled CFR variants and full-batch CFR/CFR+/DCFR executed; existing exact small LPs regenerated/calibrated. This does not imply a released equilibrium. |
| 10 | Controlled meaningful postflop abstraction | PARTIAL | Explicit one-flop-round pilot; lacks draw/nut and later-street quality calibration. |
| 11 | Accurate model-scoped labeling | DONE | Diagnostics explicitly unapproved; no unrestricted GTO claim or user-facing release. |
| 12 | Two-stage verification | PARTIAL | Complete finite-model BR and physical rejection tool execute; production acceptance not established. |
| 13 | Factorized verifier | DONE for finite model | Independent three-outcome CSR BR agrees with full-world BR; about 0.18–0.19 seconds. |
| 14 | Calibration | PARTIAL | Existing river/HU LP profiles reproduced and new solvers exercised; exact full-prior all-in calibration missing. |
| 15 | Independent seeds/stability | PARTIAL | Three sampled solver seeds and three independent finite board laws measured; stability not approved. |
| 16 | Calibrated server policy | OPEN | No arbitrary acceptance policy added; existing approval policies unchanged. |
| 17 | Complete released HU artifact / EVs | PARTIAL | Complete diagnostic profiles and independently computed root action EVs; no approved artifact. |
| 18 | Existing trainer integration after approval | DEFERRED | Correctly blocked by absent V2 approval; existing trainer preserved. |
| 19 | No multiway expansion | DONE | HU only; older multiway work untouched. |
| 20 | No product feature detours | DONE | No new UI, Academy, imports, ICM, PKO or coach work. |
| 21 | Full success criterion | NOT MET | Strong finite-model computation result; no server-approved practical node. |
| 22 | Compare failures and implement next design | DONE for experiments | Frozen oracle weakness quantified; sparse full-chance CFR, independent operator BR and streamed eight-block refinement then implemented and measured. |
| 23 | Draft / no deployment / preserve data | DONE | Existing approved artifacts untouched; PR remains Draft; no staging action. |
| 24 | Report real results and limits | DONE | Quantitative QA evidence, source hashes and explicit open items retained. |
