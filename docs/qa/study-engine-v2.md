# Study Engine v2 acceptance

Date: 2026-09-11. Feature branch: `feature/gto-study-engine-v2`. [PR #4](https://github.com/mankenntmich3/poker-learning-platofmr/pull/4).

## Local evidence

- Strict `pnpm typecheck`, `pnpm lint`, `pnpm test` and `pnpm build` passed. 83 tests passed; the external PostgreSQL check is intentionally skipped without `TEST_DATABASE_URL`.
- Domain checks cover integer pot/stack conservation, minimum raises, illegal actors/cards/streets, all-in runouts, canonical spot identity, exact turn/river outcomes, ties, weighted equity sampling and 200 independent seven-card evaluator comparisons.
- Study integration checks cover all stack presets with explicit short-stack 3-bet sizing, JSONB property reordering, 169/1,326 range structure, action/card reach evolution, private/idempotent decisions, account cascade/export, ten-question completion/resume, random boards/full-hand continuation and static-provider provenance rejection.
- `pnpm test:e2e`: four Chromium flows passed. The new flow selects 30 BB BTN with 2 BB open, compares 2.5 BB, visits BB response, follows the selected AKs range into postflop, freely chooses K♥ 8♠ 4♣, checks duplicate-card blocking, plays BB check / BTN bet 33% / BB call, chooses 7♠ turn and 2♦ river after check/check, computes exact equity, saves a favorite and decision, logs out/in and reopens retained state.
- The initial pot is 4.500 BB (including the folded SB's 0.5 BB); 33% is 1.485 BB; bet/call produces 7.470 BB. Each active stack is 26.515 BB after the call.
- Existing production API tests include private auth, retries, account export/deletion and internal solver regression. Existing learning tests exercise Academy and full preflop sessions. Layout checks cover 320, 375, 390, 430, 768, 1024, 1280, 1440 and 1920 pixel widths; axe scans cover desktop and mobile.
- `pnpm test:dev-access`: five Chromium flows passed. The suite creates/migrates/seeds an isolated development database and checks real signup, demo login, exact-range training, saved postflop session reload/completion, stack selection and mobile keyboard controls.
- Desktop and mobile screenshots of the new river state were visually reviewed. A CSS import had registered cascade layers before the intended order, leaving the desktop sidebar on mobile; importing the study stylesheet after globals fixed it. Removing text opacity from unreachable matrix cells fixed contrast. Both issues are covered by browser assertions.

Browser screenshots/traces are generated under ignored `test-results` and retained as the GitHub `browser-qa` artifact, rather than committing test account activity.

## Hosted release gate

[GitHub run 34585564632](https://github.com/mankenntmich3/poker-learning-platofmr/actions/runs/34585564632) passed every gate from a fresh checkout with frozen dependency installation and PostgreSQL 16, including both browser suites. This validates application commit `b420b5b`. The final follow-up narrows Simple mode to one displayed size, extends the full-hand session test through ten saved decisions (passed locally), and records this evidence. The subsequent staging deployment must still be verified before claiming v2 is online. The existing Render/Neon staging service remains available during review.

## Product limits

All current strategy is original APPROXIMATED learning policy. Structural checks and equity tests do not establish GTO accuracy. There is no independently solved NLHE strategy, exploitability measurement, licensed range import or action EV. Four-bet calling ranges explicitly show unavailable. Postflop is two live players with equal effective stacks; folded six-max blinds remain in the pot. Rake/antes are zero, terminal nodes retain the study pot, and no real-money settlement occurs. Exact-node snapshots survive later policy changes; ongoing full-hand questions use the provider version recorded with each new question. Local demo credentials remain development-only.
