# Executed NLHE river solver and learning flow

Date: 2026-09-12. Branch `feature/mtt-gto-accuracy-v3`, draft PR #5.
This is a working, narrowly scoped NLHE subgame, not completion of MTT V3.

## Exactly what is solved

8 dealt seats; every initial stack is 15 BB **before** forced postings;
SB 0.5, BB 1, BBA 1, blinds first. Five early positions fold, BTN opens to
2 BB, SB folds, BB calls. Both check flop and turn; BB checks river.
Board: As 7d 2c / Kh / Tc (flop order canonicalized). Root pot 5.5 BB;
BTN has 13 BB and BB 12 BB. Full seat vectors and history are replayed.

The root **conditioning distributions** are part of canonical context v2:
BTN QsJs QhJh QdJd QcJc 9s8s 9h8h 9d8d 9c8c;
BB KsQs KsJs KcQc KcJc AdQd AdJd AhQh AhJh. Each input combo weight is 1/8;
joint probability is the product, conditioned on no shared card, yielding
56 compatible physical deals. These deliberately narrow study distributions
are **not solver-produced preflop ranges or recommendations**. Folded players'
unobserved cards impose no additional conditioning in this specified subgame.

BTN may check, bet 2.75 BB or jam 13 BB. BB responds fold/call to either bet;
there are no subsequent raises. A called jam matches 12 BB, returning the
uncalled 1 BB. Showdown uses actual best-five NLHE hand ordering. No card
abstraction or board sampling is used. This does **not** solve unrestricted
NLHE, earlier streets, or the strategic decision to reach the conditioning.

Utilities equal future received chips minus future contributions minus half
the root pot. They are zero-sum; this constant centering does not affect BR,
NashConv or action regret. UI explains this EV convention. The artifact includes
all 1,081 board-unblocked physical combos: 8 with positive reach; the other
1,073 explicitly have zero reach/frequency and no EV, and cannot be trained.

## Actual execution and independent mathematics

1. Pinned Python `amaster97/poker_solver` DCFR engine at
   `f78f1b2bc338dd8cbb5226ecb8398bbdb3635676`, copied unchanged under MIT.
   Adapter freezes the behavioral policy within an iteration; the original
   traversal otherwise changes an infoset policy between hidden deals.
   Actual diagnostic runs are recorded in `river-dcfr-crosscheck.json`.
   Even 200,000 iterations did not meet publication policy and **were not published**.
2. The production artifact instead uses two exact security LP formulations,
   executed by **SciPy 1.16.2 / bundled HiGHS 1.8.0** (BSD-3-Clause / MIT).
   Source tag SciPy v1.16.2 points to `dd9a357d5945921310346226088ea8ab5c5356cc`.
   Requirements, adapter source hash and both license texts are pinned.
   For this tree, each player acts at most once along a path, so private-hand
   behavioral simplices give the complete sequence-form minimax problem.
   Both players' security problems are solved separately.
3. The TypeScript publication verifier reads **only the full behavioral profile**
   plus identity fields, reconstructs all deals, independently evaluates best-five
   hands by enumerating five-card subsets, and derives payouts from public-engine
   commitments. The generator uses a different seven-card evaluator and explicit
   tree payout formula. No LP status, dual gap, reported EV, convergence value or
   artifact threshold authorizes publication.
4. Exact best responses aggregate hidden states at the **information set** before
   choosing a best action. This is complete for this particular tree. Generic
   perfect-recall counterfactual BR independently traverses the generator tree;
   tests compare every player value and NashConv. A smaller actual NLHE tree is
   additionally checked by exhaustive pure-policy enumeration. Deliberately
   exploitable profiles, all 1,081 hand-rank orderings and forged projections are
   checked. This is mathematical cross-validation, not agreement with commercial
   charts and not proof for multiplayer preflop.

The shipped LP profile has measured NashConv **1.7763568394002505e-15 BB/hand**;
that is floating-point roundoff, **not a claim of exact zero exploitability**.
Server policy adds a conservative **1e-9 BB** arithmetic allowance, accepts an
upper bound <=1e-7 BB and assigns VERY_HIGH only <=1e-8 BB, scoped to this model.
The work bound is small: 56 deals, 24 infosets, |payoff| <=14.75 BB and fewer
than 10,000 scalar operations. The allowance exceeds standard bounded-sum
roundoff budgets for those operations. It is not an interval-arithmetic proof.
Full evidence and the hash-bound calibration are in `river-calibration.json`.
No other model or imported dataset is approved by this policy.

## Publication and learning

The app validates and publishes the bundled immutable artifact on first access
to `/api/verified/study`. A single SQL CTE stores the artifact, independent report,
policy, full stack vector and successful job. The provider then retrieves it by
canonical context + tree SHA and re-verifies its mathematical content. A row
status or manually inserted certificate alone never suffices. Repeated migration
does not quarantine this newly approved policy. Old uncertified evidence remains.

`/mtt/river` displays a segmented 169-cell matrix, weighted class frequencies,
physical combo details, reach and independently checked action EVs. Exact-range
training uses server-selected positive-reach combos and persists each question,
checksum, submitted answer and feedback. Answers are idempotent, user-owned and
included in account export/deletion. A question is one completed training trial;
there is no separate multi-hand session aggregate yet.

Action feedback separates dominant/mixed/low/zero-frequency choices and shows
actual EV regret. Frequency Recall scores `100 * (1 - total variation distance)`.
Mastery is per artifact/physical combo/mode: first observed score, then an EMA
with 65% previous /35% new. Scores >=85 progress through 1/3/7/14/30-day review
intervals; weaker scores return after ten minutes. Smart mode weights low mastery
and due/unseen combinations; it does not yet implement all V3 strategic-importance
or stack/position modes. Empty review selections give a usable explanation.

## Validation evidence

`tests/solver/river-verification.test.ts`: independent mathematical cross-checks,
complete support/projection and tampering. `tests/server/verified-training.test.ts`:
publication, lookup, repeated migration, account isolation, idempotent answers,
recall, due dates, logout/login, export and deletion. PostgreSQL-specific success
coverage is in `tests/server/verification-postgres.test.ts`.

`tests/e2e/verified-river.spec.ts` uses real API/database data: protected URL,
registration, matrix/filter/keyboard, starting exact-range training, actual NLHE
cards/action/EV feedback, recall, mobile accessibility, logout and login with
retained progress. It caught and fixed the new route missing from the safe-login
return list. Desktop/mobile screenshots were inspected; card sizing, primary
controls and Tournament navigation were corrected.

Final command/CI results are recorded in PROJECT_STATUS.md. No staging deployment
or V3-wide acceptance is implied by a passing bounded-river test.
