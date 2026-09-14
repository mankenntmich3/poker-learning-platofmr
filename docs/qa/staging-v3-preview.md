# V3 staging preview — 2026-09-14

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

Typecheck and lint passed locally. CI, build and public desktop/mobile smoke
results will be recorded after execution; deployment is not claimed yet.
