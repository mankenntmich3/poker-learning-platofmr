# Rangeform

A No-Limit Texas Hold’em study workspace for **6-max Cash**: choose a preflop spot, study its full 169-hand matrix, train real two-card combinations and retain progress. Permanent private repository: **mankenntmich3/poker-learning-platofmr**.

Current ranges are **APPROXIMATED original educational heuristics**, with coarse educational weights and explicit sizing assumptions. They are **not validated GTO**, licensed ranges, or measured EV values. No range files were supplied by the owner. Kuhn remains an internal solver/API regression only.

Preflop supports RFI, responses to one open (fold/call/3-bet), and responses to one 3-bet after opening (fold/call/4-bet), for all legal position pairs. All eleven requested stack presets (10–200 BB) and custom depths from 10–500 BB in 0.01-BB units work. Study Engine v2 adds explicit sizing, heads-up postflop with freely selected cards, legal flop/turn/river histories, range evolution, measured showdown equity and persistent node training. Existing fixed-flop sessions remain readable.

See [strategy scope and provenance](docs/decisions/0003-nlhe-first.md), [current status](docs/PROJECT_STATUS.md) and [private staging setup](docs/staging.md).

**Online staging:** [https://rangeform-staging.onrender.com](https://rangeform-staging.onrender.com). Use a personal account; initial registration requires the owner's private invitation. Local demo credentials do not work online. Render Free may need about a minute to wake after inactivity; PostgreSQL progress is stored separately on Neon. The local setup below remains independent.

## LOCAL DEVELOPMENT — QUICK START

**V3 branch:** after setup, open [the verified River study](http://localhost:3000/mtt/river)
or Tournament → **Verifizierten River studieren**. One real NLHE fixed-range river
subgame provides a segmented matrix, action EVs, action/recall training and saved
progress. This is **not** MTT preflop coverage; those nodes remain unavailable.
See [precise boundaries and accuracy evidence](docs/qa/verified-river.md).

Requirements: Node.js 24, Git and pnpm 10.28.2. If pnpm is missing, install it once with `npm install --global pnpm@10.28.2`. Authenticate Git with your GitHub account to clone this private repository.

```sh
git clone https://github.com/mankenntmich3/poker-learning-platofmr.git
cd poker-learning-platofmr
pnpm install --frozen-lockfile
pnpm db:setup
pnpm db:migrate
pnpm db:seed
pnpm dev
```

For this ongoing milestone, select `git switch feature/mtt-gto-accuracy-v3` after
cloning and before installing. The branch remains draft; staging is not updated.

Open **[http://localhost:3000](http://localhost:3000)**. The alternative [127.0.0.1:3000](http://127.0.0.1:3000) also works; each hostname keeps its own browser session. In an existing checkout, start with `pnpm install --frozen-lockfile` and the database commands above.

**Development demo login:** `demo@poker.local` / `Poker-Local-Demo-2026!`. Use the login form or **Mit Demo-Konto anmelden**. You can also choose **Konto erstellen** to register a personal account. The demo uses real password verification and database sessions; no authentication bypass is implemented.

`db:setup` creates `.env.local` from `.env.example` if absent and creates/migrates the local database. `db:migrate` is safe to repeat. `db:seed` creates or recovers the development demo and adds three explicitly labeled sample decisions evaluated against the labelled NLHE learning range; it preserves subsequent progress. `pnpm setup:local` combines setup and seed. No manual environment editing, mail provider, Docker or external database is required for local use.

**Range flow:** log in → Preflop → choose stack/position/history/opponent and Open Size → tap a matrix cell → **Diese Range trainieren** → start → act → compare frequencies → next hand or finish → return to Dashboard. The trainer keeps the exact selected spot.

**Study Engine v2 flow:** Preflop → **Mit AKs zum Flop** (or another selected hand) → **Flop frei wählen** → choose three cards → play the first player's action → **Diesen Spot trainieren** when Hero acts → choose an action → inspect saved feedback → **Mit dieser Action fortfahren** → opponent call/check/raise → choose Turn and River when each betting round closes. The link explicitly states the assumed preflop call continuation. Alternatively, **Postflop** opens 30 BB BTN-vs-BB, 2 BB open, K♥ 8♠ 4♣ as an editable starting example.

Use **Trainingssitzung konfigurieren** for 10/25/50/100 decisions. Spot repeats the selected node; Street continues within its street; Full Hand continues until the hand ends, then samples a new hand. Zero-reach continuations restart from a supported hand. Questions, strategy snapshots, answers and completion are saved server-side. Favorites and shared URLs reopen the exact configuration, cards and action history; shared links contain no account data and still require login.

**Analysis:** Strategy, Range Funnel, individual Combos, exact Hand-vs-Hand equity, sampled weighted Hand-vs-Range/Range-vs-Range equity with sample/error reporting, current made-hand/draw/nuts densities and qualified Why explanations. Equity is showdown pot share, never an action EV. Four-bet calling ranges are explicitly unavailable; the Cash Sandbox has no solver solution. The separate V3 river page bundles the precisely scoped verified solution described below. Postflop is heads-up with equal effective stacks, no rake/antes or multiway support. Terminal study nodes retain the pot for inspection rather than paying out a game.

**Academy flow:** log in → Dashboard → Academy → **Kurs öffnen** → **Lektion öffnen** → read and answer the quiz → **Am Tisch anwenden** → **Trainingssitzung starten** → choose an action → read feedback → **Sitzung jetzt abschließen** → **Fortschritt ansehen**. A full session ends after ten decisions. Current question, feedback and session completion also survive reload. Log out under Einstellungen, log in again and confirm your saved progress.

PGlite stores data under `.data/postgres`, excluded from Git. The demo account is marked development-only in the database. Seed/reset commands refuse production mode and any `DATABASE_URL`; login and existing sessions for that account are rejected outside local development, even if its database is accidentally copied. Demo credentials and the instant-access button are absent from the production interface.

### Reset or reseed

Stop `pnpm dev` with **Ctrl+C** first. The database rejects a second application/CLI process while open.

To recover demo login without deleting your learning progress:

```sh
pnpm db:seed
pnpm dev
```

To delete **all local accounts and progress** and recreate the demo:

```sh
pnpm db:reset --confirm
pnpm db:migrate
pnpm db:seed
pnpm dev
```

Reset clears local tables and keeps the schema; it never recursively deletes files or touches a hosted database. A fresh clone starts without a database and recreates it with `db:setup`.

### Troubleshooting

**Codex on Windows:** its bundled terminal may resolve `pnpm` to version 11 despite this project's pinned version 10. If `pnpm --version` reports 11 or a command unexpectedly tries to reinstall dependencies, select the already bundled version 10 for the current PowerShell session:

```powershell
function pnpm {
  & "$env:USERPROFILE\.cache\codex-runtimes\codex-primary-runtime\dependencies\node\bin\node.exe" "$env:USERPROFILE\.cache\codex-runtimes\codex-primary-runtime\dependencies\node\node_modules\pnpm\bin\pnpm.cjs" @args
}
pnpm --version
```

This workstation's launcher reports `10.28.2`. Then use the ordinary quick-start commands above. This workaround is specific to the bundled Codex Windows runtime; a normal Node/pnpm installation only needs the documented version prerequisite.

- Wrong login: use the exact credentials above, or stop the server and run `pnpm db:seed` again.
- Database already open: stop the other development/test server before setup, migration, seed or reset. A process lock prevents concurrent PGlite access and recovers after a dead process.
- Cookies blocked: allow cookies for the chosen local address. The login screen verifies the session before navigating.
- Already using port 3000: stop that server, or use `pnpm dev --port 3001` and open `http://localhost:3001`.
- Stop the normal development server before running browser tests: Next.js allows one development server per checkout. `pnpm test:dev-access` starts its own server on port 3100 and an isolated test database.

All environment names and deployment-only settings are described in [.env.example](.env.example). Do not set `NODE_ENV` yourself for the normal quick start.

Do not run multiple app processes against the same embedded database. Hosted environments use `DATABASE_URL` for real PostgreSQL and a canonical HTTPS `APP_ORIGIN`. See [.env.example](.env.example) and [operations](docs/operations.md).

## Verify

```sh
pnpm typecheck
pnpm lint
pnpm test
pnpm build
pnpm exec playwright install chromium
pnpm test:e2e
pnpm test:dev-access
```

The regular browser suite starts a production build on loopback with an isolated local database. GitHub CI supplies PostgreSQL 16 for that flow. The separate development-access suite runs setup, migrations and demo seed before testing the actual development server, both loopback addresses, protected destinations, Academy, training completion and persistence. Production credentials must never be used for tests.

## Reproduce strategy data

```sh
pnpm ranges:generate
```

This publishes a content-hashed NLHE **APPROXIMATED** policy and checks 385 preflop contexts plus one flop for structural validity. It does not solve GTO or measure accuracy. Published sessions snapshot the exact version and remain resumable after a library update.

### Internal solver regression

```sh
pnpm solve
```

The separate solver command creates a small Kuhn solution, measures exploitability with an independent best-response evaluator, validates and stores the artifact, then makes the version available to the strategy provider. See [solver architecture](docs/solver-architecture.md) and [strategy data](docs/strategy-data.md) for exact rules, provenance, versioning and limitations.

## Structure

```text
src/app         Next.js pages and API adapters
src/components  Study interface and accessible controls
src/domain      Framework-independent card/game rules
src/solver      Computation, independent evaluation and validation
src/strategy    Provider boundary and immutable artifact storage
src/server      Authentication, SQL and learning services
src/shared      Browser-safe request/response contracts
migrations      PostgreSQL schema
data/nlhe       Immutable NLHE heuristic policy versions
data/solutions  Computed Kuhn regression artifacts
tests           Domain, solver, integration and browser checks
docs            Product specification, decisions and project memory
```

Start future sessions with [project status](docs/PROJECT_STATUS.md), [architecture](docs/architecture.md), and the [complete product specification](docs/PRODUCT_SPEC.md). The specification describes the long-term product; the status file distinguishes implemented work from future scope.

This is a personal study release, not a public commercial launch. Broad NLHE solving, hand imports, leak analysis, AI coaching, subscription billing and distributed GPU workers are later milestones. There is no real-money functionality.


## Recompute the actual NLHE solution (optional)

Normal app use needs no Python. For solver execution, install Python 3.12 and
create an environment with `python -m venv .tools/solver-venv`.
Activate it with `.tools\solver-venv\Scripts\Activate.ps1` in PowerShell or
`source .tools/solver-venv/bin/activate` on macOS/Linux, then:

```sh
python -m pip install -r scripts/solver-requirements.txt
pnpm solve:nlhe output/regenerated-river.json
pnpm exec tsx scripts/verify-nlhe.ts output/regenerated-river.json
```

`PYTHON_EXECUTABLE` can select another interpreter. The first command executes
HiGHS; the second independently reconstructs best responses, checks every combo
EV/reach and compares a separate full-tree evaluator. A new immutable run ID is
created without overwriting the shipped artifact. Unreviewed models cannot be
published. `pnpm solve:nlhe:dcfr 20000 output/dcfr.json` runs the separate pinned
DCFR engine for diagnostics; its output is not approved by publication policy.
The app independently validates the shipped artifact before publishing and on
exact lookup, on both local PGlite and hosted PostgreSQL.
