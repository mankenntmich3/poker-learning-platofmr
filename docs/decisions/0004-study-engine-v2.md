# Study Engine v2 — owner request and architecture

Status: implementation and acceptance in progress. Branch `feature/gto-study-engine-v2`.

The owner's current brief supersedes the one-flop milestone: configurable 6-max NLHE ChipEV with heads-up postflop, explicit open/3-bet/4-bet sizes, concrete cards, street histories, range evolution, measured equity and persisted exact-node training. No ICM, bounty, PLO, multiway solver or real-money features. The full brief is in `docs/STUDY_ENGINE_V2_SPEC.md`.

## Existing implementation audit

- Reuse `cards.ts`: validated 52-card deck, 1,326 physical combos, 169 classes, suit canonicalization and board tags.
- Preserve `holdem.ts`: integer-chip six-seat game, blinds, minimum raises, all-ins, side pots and an independent best-five evaluator. It automatically burns/deals cards and settles games, so it is unsuitable as the interactive study cursor without changing existing solver regressions.
- Add `domain/study.ts`: the study adapter has two live players plus dead six-max blind contributions, deterministic preflop line construction, manually selected board transitions, a single replayable action history and legal-action generation. It uses integer 1/10,000 BB units. Terminal study nodes retain the pot for inspection; they do not pay out a real-money game.
- Existing `shared/nlhe.ts`, `nlhe-policy.ts`, `nlhe-provider.ts` and trainer were limited to abstract preflop classes and one hardcoded flop. Keep their stored snapshots backward-compatible; add optional sizing context and a separate generic study provider contract.
- The legacy `handScore` orders original heuristic learning ranges. It is not equity or a solver. The new provider retains explicitly labelled approximate priors; no legacy Kuhn frequencies are transferred.
- `solver/*` remains the independently verified Kuhn regression and immutable artifact infrastructure. `data/nlhe` contains original heuristic parameters, not NLHE solver solutions. No external solver database was supplied.
- Existing `/api/nlhe` continues serving old sessions and sized preflop ranges. `/api/study` derives state server-side, checks ownership/origin/rate limits and never accepts client EV/frequency claims.
- PostgreSQL migrations add user-owned saved spots, decisions and sessions; cascading account deletion and export include study data. Existing tables/data are preserved.

## Provider/data boundary

`ApproximationProvider` and `StaticSolutionProvider` implement the same generic `StrategyProvider` contract. Legal actions belong to the domain. Strategy availability belongs to the provider. 4-bet calling ranges are explicitly unavailable rather than invented. Current postflop educational weights use made-hand categories, draws/backdoors and size buckets. Their normalization is a didactic model, not GTO or measured accuracy. Reach multiplies by action frequency; board blockers remove physical combos. Opponent views also remove the selected Hero hand; range-vs-range equity uses unknown hole cards and mutual removal.

Content-derived version identities cover study state rules, hand features, sizing rules and provider source. No artificial EVs: current EVs/solver accuracy are null. Solver or imported sources must carry their own immutable version, license/source, solver version, assumptions and accuracy. No runtime remote solver, new hosting service, commercial dependency or paid plan is introduced.

## Equity and analysis

Hand-vs-hand enumerates every legal runout. Weighted range comparisons use seeded Monte Carlo, reject incompatible hole-card pairs, complete the board without replacement and report sample count and standard error. The independent seven-card evaluator is tested against the existing best-five enumeration. Equity is showdown pot share including half of ties, not an action EV or equity realization. Current-nuts density means the best made hand possible on the current board; it is explicitly distinct from future nuts equity.

## UI plan

Keep Rangeform's existing Manrope typography, slate background `#0e141c`, surface `#151d28`, text `#e8edf5`, blue `#abbcfa`, muted green `#9ec7b8` and warning amber `#e6c28b`. The interactive board and action chronology are the visual focus; no decorative hero/marketing metrics. Desktop: configuration | board/actions | analysis; narrower layouts stack the analysis, then configuration. Both range matrices follow below. Explicit labels, keyboard grid navigation and 52-card buttons support touch and keyboard input. Unknown/unavailable strategy must remain visible near the decision.

## Public functional references (accessed 2026-09-10)

- [GTO Wizard Study Mode](https://help.gtowizard.com/study-mode/): functional separation of spot selection, action navigation, matrix and combo inspection. No screenshots, assets or solution values copied.
- [GTO Wizard Trainer](https://help.gtowizard.com/how-to-use-the-trainer/): configurable drills and review of decisions, used only as interaction reference.
- [Stack depth discussion](https://blog.gtowizard.com/how-stack-sizes-change-your-range/): sizing is part of game configuration; this does not authorize reusing their proprietary ranges.
- [b-inary/postflop-solver](https://github.com/b-inary/postflop-solver): reviewed as an architectural reference; development is suspended and licensing/integration/compute requirements require separate evaluation before adoption. No code or solver data imported.
- [Web Interface Guidelines](https://raw.githubusercontent.com/vercel-labs/web-interface-guidelines/main/command.md): accessibility and interaction review reference.

## Acceptance tracking

Do not treat this decision as completed QA. New domain and server tests currently cover accounting, card blocking, exact equity, evaluator cross-check, reach evolution and persistence. End-to-end browser acceptance, full session modes, regression checks and the final PR are still in progress.
