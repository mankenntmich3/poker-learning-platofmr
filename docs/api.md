# API — NLHE learning and private staging

The Next.js App Router serves JSON from `/api`. Public response types are versioned with the application in `src/shared/contracts.ts` and `src/shared/nlhe.ts`. The current product supports an original German NLHE lesson, preflop study and one bounded flop. Every NLHE range is labelled APPROXIMATED, with immutable provenance and unavailable solver accuracy/EV. Kuhn endpoints remain internal regression infrastructure.

## Requests and authentication

Register or log in to obtain the opaque session cookie. Browsers send it automatically with same-origin `fetch`. All learning data reads and writes require a current server-validated session. No user ID is accepted in request bodies. The session lookup determines which account may be read or modified.

Every mutation requires both `Origin: <APP_ORIGIN>` and `Content-Type: application/json`. Requests with a missing or different origin are rejected, including logout and account deletion. `Sec-Fetch-Site: cross-site` is also rejected. There is no cross-origin allowlist or wildcard CORS. JSON is parsed through a bounded stream (8 KiB maximum), then a strict Zod schema; unexpected fields fail validation.

Production requires `APP_ORIGIN` as an exact origin without a path and a configured `DATABASE_URL`. A trailing slash on the origin is accepted. The intentional single-process local deployment override is `ALLOW_LOCAL_DB=1`; it must have persistent writable storage. Development defaults to filesystem PGlite at `.data/postgres`. `DATA_DIR` overrides that local database directory, including isolated browser-test storage. Production uses `__Host-study_session; Path=/; Secure; HttpOnly; SameSite=Strict`, development uses `study_session` without `Secure`. Sessions expire after 14 days, are rotated on login, and are deleted on logout or account deletion.

Passwords contain 10–128 characters and use scrypt with `N=131072`, `r=8`, `p=1`, a random 16-byte salt and a 64-byte derived key. Parameters are stored in a versioned hash. Derivation concurrency is limited to one per process with at most eight waiting requests. The database stores SHA-256 digests of random 32-byte session tokens, never the cookie token itself. Login uses a dummy derivation for unknown accounts and a generic invalid-credentials response. Registration currently reveals that an email is already registered through a 409 response; email verification and recovery are deferred.

## Endpoints

| Method and path | Request body | Success response | Authentication |
| --- | --- | --- | --- |
| `GET /api/session` | — | `{ user: StudyUser \| null, stagingInviteRequired: boolean }` | Optional |
| `POST /api/auth/register` | `{ name, email, password, weeklyGoal?, experience?, inviteCode? }` | `201 { user: StudyUser }`, session cookie | Staging invitation when enabled |
| `POST /api/auth/login` | `{ email, password }` | `{ user: StudyUser }`, new session cookie | No |
| `POST /api/auth/logout` | `{}` | `{ ok: true }`, cleared session cookie | Idempotent |
| `GET /api/dashboard` | — | `StudyDashboard` | Required |
| `GET /api/lesson` | — | `Lesson` | Required |
| `POST /api/lesson/complete` | `{ answer: 0 \| 1 \| 2 }` | `{ correct: boolean }` | Required |
| `GET /api/nlhe/range` | Query: `stack`, `hero`, `scenario`, optional `villain` | `NlheNode` with 169 classes | Required |
| `POST /api/nlhe/start` | `{ config, solutionVersion, clientId }` | `NlheSession` | Required |
| `GET /api/nlhe/session?id=<uuid>` | — | Owned `NlheSession` | Required |
| `POST /api/nlhe/session` | `{ id, command: "next" \| "finish" }` | Updated `NlheSession` | Required |
| `POST /api/nlhe/decision` | `{ sessionId, questionId, action }` | Session with saved feedback | Required |
| `GET /api/nlhe/progress` | — | `NlheProgress` | Required |
| `GET /api/trainer` | — | `{ spots: TrainingSpot[] }` | Required |
| `POST /api/trainer/decision` | `{ spotId, action, attemptId, solutionVersion }` | `Evaluation` | Required |
| `GET /api/solution` | — | `SolutionSummary` | Required |
| `PATCH /api/settings` | `{ name?, weeklyGoal?, experience? }` | `{ user: StudyUser }` | Required |
| `GET /api/account/export` | — | JSON download of own account and learning records | Required |
| `DELETE /api/account` | `{ password }` | `{ ok: true }`, cleared session cookie | Required + current password |
| `GET /api/health` | — | Database, solution storage, queue and worker status | No |
| `GET /api/live` | — | Database-free liveness | No |

## NLHE semantics

Configuration is `{ game: "nlhe", format: "6max-cash", stackBb, hero, villain, scenario }`. Stacks support 10–500 BB with two decimal places. Positions are UTG/HJ/CO/BTN/SB/BB. Scenarios are `rfi`, `vs-open`, `vs-3bet` and the fixed `flop-srp` (100 BB BTN vs BB, A♠ 7♦ 2♣). Impossible action histories are rejected. `raise` is contextual: open, 3-bet or 4-bet, with the node's exact total sizing; actions are bounded by the effective stack.

Starting a session snapshots the selected version, full combo strategy and any opponent range. The ten-question trainer samples physical Hold'em combos weighted by prior reach. It returns hole cards and legal actions before an answer; frequencies and policy feedback follow the answer. There is no estimated EV regret. The same `clientId` UUID retries a start idempotently; a deliberately new session requires a new UUID. Question IDs deduplicate answer retries, while conflicting answers are rejected. Reload resumes saved question/feedback. `finish` allows an early completion; completing all ten questions also requires the explicit completion action in the UI.

All session access is account-scoped. Missing or another user's session returns 404. Snapshots preserve existing training when the active library changes. Progress derives from persisted decisions and sessions; seeded examples are labelled explicitly. Export version 2 includes NLHE learning records but omits secret credentials and bulky internal range snapshots.

When `STAGING_MODE=true`, registration requires the private invitation. Missing or too-short server configuration fails closed with 503, and an invalid invitation returns 403. The invitation is never returned by the API or stored in the account. Its rotation leaves existing personal login unaffected. Local demo accounts are not permitted on hosted PostgreSQL.

## Shared account and legacy regression semantics

The following `attemptId`, computed EV and historical XP rules describe the retained `/api/trainer*` Kuhn endpoints. They are absent from primary product navigation. The main dashboard displays `StudyDashboard.nlhe` actual study counts and NLHE activity.

Names are trimmed and contain 1–80 characters. Emails are trimmed, lowercased, syntactically validated and limited to 254 characters. `weeklyGoal` is an integer from 1 to 7 learning days per week, default 3. `experience` is `beginner`, `intermediate` or `advanced`, default `beginner`. A settings update must supply at least one field.

`attemptId` must be a client-generated UUID, retained unchanged when retrying the same submitted decision. `solutionVersion` is required and must match the version displayed in the training spot. If a new attempt references an outdated strategy, the API returns 409 `SOLUTION_CHANGED`; reload the trainer and start a new attempt. `(user_id, attempt_id)` has a database uniqueness constraint. A matching retry returns the previously persisted evaluation without increasing decision count or XP, even if the current library has changed since that evaluation. Reusing an attempt ID with a different spot, action or solution version returns 409 `ATTEMPT_CONFLICT`, including concurrent submissions. A new exercise attempt needs a new UUID. The server validates the spot, version and legal action, reads the verified solver artifact, calculates feedback, and persists the whole evaluation with solution ID/version. Client-supplied scores, EVs and frequencies are rejected.

`GET /api/trainer` returns visible information and legal choices, without action frequencies, EVs, regret or an opponent card. The lesson response includes the question and options without a correct-answer field. A correct lesson submission inserts a unique completion record; repeats do not add XP. Dashboard XP is derived as 10 per stored decision plus 50 for completing the lesson. The best-decision counter uses regret ≤0.01. Daily activity is grouped by UTC date and covers the most recent 30 days; the response includes days with activity only. The UI may fill zero days. Recent history combines lesson completions and training decisions and is limited to eight entries.

The export includes account profile, lesson completions and stored decisions/evaluations. It excludes password hashes, session records and rate-limit counters. Deletion verifies the current password and atomically removes the user and all sessions, completions and decisions through cascading foreign keys. Hashed rate-limit keys remain only until their short expiration; deployment backups have a separately managed retention policy.

## Errors, limits and observability

Errors return `{ error: string, code: string, requestId: string }`. Common statuses are 400 for invalid input/actions, 401 for absent/expired sessions or incorrect credentials, 403 for an origin mismatch, 409 for duplicate accounts or attempt conflicts, 413 for an oversized body, 415 for a non-JSON mutation, 429 for rate limits and 503 for missing production origin configuration. Unanticipated failures return a generic 500 without database details. Every response is `Cache-Control: no-store` and includes `X-Request-Id` and `X-Content-Type-Options: nosniff`.

Rate limits use atomic PostgreSQL fixed-window counters. Keys are hashed; forwarded IP headers are deliberately ignored. Current limits are:

| Operation | Scope | Window and limit |
| --- | --- | --- |
| Registration | Global / email | 30 / 5 per hour |
| Login | Global / email | 120 / 12 per 15 minutes |
| Trainer decision | Account | 240 per 15 minutes |
| Lesson submission | Account | 60 per 15 minutes |
| Settings | Account | 30 per 15 minutes |
| Export | Account | 6 per hour |
| Account deletion | Account | 5 per hour |

429 responses include a conservative `Retry-After: 900`; an hourly quota may require a longer wait. Counters expire within two windows and expired rows are pruned during limit checks. These conservative global ceilings target personal use and a small pilot. A public multi-tenant release needs traffic-aware limits, trusted network ingress configuration, abuse monitoring and capacity planning; globally shared limits can otherwise be consumed by an attacker. There is no claim of comprehensive DoS protection.

Structured logs include generated request ID, method, route path, status and duration. Error logs contain only a coarse exception type. They never intentionally include passwords, cookies, bodies or database error details. Health performs a real SQL query and loads/checks the solution artifact; it fails if either is unavailable. The response explicitly marks the queue and worker inactive because the MVP computes solutions offline. Cloud compute is disabled.

## Storage and verification

Ordered SQL migrations run transactionally for PostgreSQL and PGlite and record their versions. `001_initial.sql` creates the learning schema; `002_development_accounts.sql` adds the `development_only` account marker. PostgreSQL startup takes an advisory lock to serialize schema initialization across replicas. Real PostgreSQL is selected with `DATABASE_URL`; there is no silent fallback if a configured database cannot connect. PostgreSQL TLS policy follows the connection URL and certificate verification is never explicitly disabled in code.

`StudyUser.developmentOnly` identifies seeded local sample accounts. They may authenticate and retain sessions only under `NODE_ENV=development` with no `DATABASE_URL`. The reserved demo email cannot register through the public API. Production session checks reject this account even if its database is copied. Personal account behavior is unchanged. In development, same-origin checks use the literal loopback `Host` authority to accommodate Next.js URL canonicalization; the submitted Origin must still match exactly and cross-site requests are rejected. Production retains its single configured origin.

PGlite local files are durable across application restart, but only one process may use a directory. They are not suitable for independent replicas or ephemeral/serverless filesystems. Filesystem close/reopen integration coverage verifies that sessions, lesson progress and decisions survive reopening. Additional integration tests cover session expiry/revocation, account isolation, durable decision deduplication, invalid actions, origin checks, password hashing, safe exports and cascading deletion. `TEST_DATABASE_URL` optionally runs the same lifecycle through the real `pg` driver; use a dedicated test database. The GitHub Actions integration job supplies PostgreSQL for full browser/API tests.

Email verification, password reset/delivery, MFA, pagination of very large exports, distributed abuse protection, backup automation, billing and background job execution are intentionally outside this initial slice. No email or paid cloud service is called by these endpoints.
