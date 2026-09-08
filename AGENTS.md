# Project instructions

The permanent private repository is `mankenntmich3/poker-learning-platofmr` (user-confirmed spelling). Read `docs/PROJECT_STATUS.md`, `docs/architecture.md`, and `docs/PRODUCT_SPEC.md` before continuing work.

- Complete one end-to-end learning flow before broadening scope. No inactive navigation or fake product metrics.
- Preserve strict TypeScript and separation of `domain`, `strategy`, `solver`, `server`, and UI.
- Never invent solver values. Every delivered strategy must carry source, immutable version, solver version and independently measured accuracy.
- Kuhn is a three-card toy game, not a No-Limit Hold'em solution. Never relabel or transfer its frequencies to NLHE.
- Use PostgreSQL for hosted environments. Embedded PGlite is for local development/test only unless deliberately enabled for a single-process local production-build preview.
- Secrets and user data never belong in Git. Use `.env.example` for configuration names only.
- Verify meaningful changes with `pnpm typecheck`, `pnpm lint`, `pnpm test`, `pnpm build`, and relevant browser flows. Update status and QA evidence with real results.
- Apply the installed frontend-design, web-design-guidelines and react-best-practices skills while changing UI. Keep mobile controls and keyboard navigation usable.
- Do not add hosted services, commercial dependencies or real-money functionality without resolving cost, licensing and ownership decisions with the owner.

<!-- BEGIN:nextjs-agent-rules -->

# This is NOT the Next.js you know

This version has breaking changes — APIs, conventions, and file structure may all differ from your training data. Read the relevant guide in `node_modules/next/dist/docs/` (resolved from this file's directory; in monorepos the `next` package may not be visible from the repo root) before writing any code. Heed deprecation notices.

This block is written and re-added by `next dev` — verify at `node_modules/next/dist/server/lib/generate-agent-files.js`. Removing it from a diff only re-creates the uncommitted change; committing it with your work keeps the tree clean.

<!-- END:nextjs-agent-rules -->
