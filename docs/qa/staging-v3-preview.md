# V3 staging preview — completed 2026-09-15

Preview branch: `staging-v3-preview`, based on tested `694b49c`.
Research is preserved separately on `feature/mtt-gto-accuracy-v3` at `90efc59`.
PR #5 stays Draft; main is unchanged. Render must track only the preview branch.

## Deployment and data safety

- Existing service: `rangeform-staging`, Frankfurt Free, existing Neon PostgreSQL.
- Build: `corepack enable && pnpm install --frozen-lockfile --prod=false && pnpm build`.
- Start: `pnpm start:hosted`; health: `/api/live`. No new environment values needed.
- Migrations run on database initialization, serialized on a held PostgreSQL
  connection using an advisory lock; each migration is transactional.
- 008/010 add solution/job/training tables. 009 adds verification evidence and
  quarantines historical uncertified artifacts without deleting them. 011 only
  widens diagnostic job constraints. All are repeatable; no account, lesson or
  training table is reset. PostgreSQL regression repeats migrations after saved
  lesson/training progress and verifies login, progress and solution availability.
- Packaged river and conditional HU artifacts are independently verified before
  lazy, checksum-based database publication. No development seed runs on hosting.
- Full-prior HU and multiway research has no publication policy; unavailable
  coverage cannot enter the normal verified trainer.

## Visible scope

Shared Premium PokerTable, segmented matrix, combo frequencies/action EVs,
action and frequency recall training, EV loss, mastery and due/weakness selection.
HU is explicitly **VERIFIED CONDITIONAL**, not full-prior multi-action equilibrium:
10/15/20/25/30/40/50/80/100 BB, NONE/BBA1, fixed 26-combo priors per player.
River is the existing verified fixed-range, fixed-board subgame. Both show scope.
The existing small header label now reads **V3 Preview**.

## Validation

Local typecheck, lint, production build, 160 tests and all 12 browser flows
(7 production / 5 development) passed. Five PostgreSQL-only tests are deliberately
not run against local PGlite; CI executes those against PostgreSQL 16.

The first deployment `6fb9fed` succeeded on the existing Render service:
`dep-dajn9hnqj5pc73eacg1g`. `/api/live` returned alive and `/api/health`
reported ready, durable PostgreSQL. The legacy health strategy field describes
the Cash sandbox, not the verified-library gate; actual verified endpoints were
checked through the authenticated application below.

Public HTTPS smoke, 2026-09-14:

| Check | Observed result |
| --- | --- |
| Existing account after deploy | Existing profile, historical NLHE decisions and completed lesson retained |
| Dashboard / Tournament | V3 Preview, MTT navigation, HU and river entry points visible |
| HU 15 BB / BBA1 | 169 cells; AKo has 12 supported physical combos, Jam 100%, action EV 0.437 BB |
| Stack switching | 20 BB loads its own artifact (AKo Jam EV 0.234 BB); switching back restores 15 BB |
| HU action | An action answer persisted with independently derived EV loss and zero-frequency feedback |
| Mobile frequency recall | 390×844, frequency distribution submitted and scored; persistence confirmed, no document overflow |
| HU mastery | Physical-combo mastery records and due times retained |
| River matrix | QJs / 98s supported; 98s aggregate Check 48.6% / Jam 51.4% visible |
| River table | Five board cards, distinct hero hole cards, eight seats and dealer displayed without overlapping cards |
| River action | Check saved; Valid Mixed Action; independent EV feedback and mastery displayed |
| Logout / login | Signed out through Settings; owner signed in again using their existing password |
| Progress after login | Both HU decisions and the river decision, mastery and due timestamps still present |
| Coverage | 18 independently approved conditional HU links; zero complete preflop ranges |
| Unavailable contexts | Full-prior 2/3/6-handed 15 BB show unavailable, never replacement frequencies |
| Existing Academy | Existing lesson content and quiz remain accessible |

No user data, password, environment credential or database connection was changed.
The smoke used the owner's existing account as requested; three new learning
answers remain there. Desktop and mobile screenshots were inspected in the live
browser. Automated screenshots/accessibility evidence are attached to CI.

## Preview fixes and final rollout

- Replaced the old generic header badge with V3 Preview and explicit verified scope.
- Corrected the dashboard's stale claim that no verified MTT artifacts exist;
  its preflop entry now points to the approved HU subgame.
- Updated navigation assertions after that link change. CI `34805628577` correctly
  blocked the intermediate commit because the old test still expected its former
  label; the verified HU/river tests and all 165 unit/integration tests passed.
- Final code commit: `3e759942cd3a166a0ec165ac75732d73f306610b`.
- [CI 34872752563](https://github.com/mankenntmich3/poker-learning-platofmr/actions/runs/34872752563)
  passed all gates: 117 unit + 48 PostgreSQL integration, 7 production and 5
  development browser flows, typecheck, lint, build and solver regression checks.
- Render automatically deployed that exact commit from `staging-v3-preview`:
  `dep-dak2ms3l550s73ao2rpg`, successful in 1m55s, confirmed Live on 2026-09-15.
- Public health reports ready durable PostgreSQL. The corrected dashboard link
  opens HU 15 BB / BBA1, renders 169 cells and retains the saved training progress
  after the final deployment. No new login, database reset or manual switch needed.
- `main` remains `df072d4`; PR #5 was rechecked open/Draft. Research remains
  `90efc59` on the feature branch. No solver experiment was added to the preview.
- This final evidence-only commit does not change the tested/deployed application;
  CI is skipped for the report to avoid repeating expensive identical regressions.
