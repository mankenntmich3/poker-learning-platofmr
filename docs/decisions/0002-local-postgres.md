# ADR 0002: PostgreSQL with an embedded local development adapter

Status: accepted for local development, 2026-09-06.

The environment has Node.js but no configured PostgreSQL service or Docker. Hosted PostgreSQL would require credentials, ownership and potentially spend. Use PGlite for a zero-service local setup with durable filesystem persistence; retain portable PostgreSQL SQL and a `pg` driver for hosted deployment.

PGlite is PostgreSQL compiled to WebAssembly, not a JSON/localStorage emulation. It is a single-process development convenience. Do not run multiple Next servers against the same embedded data directory. Tests use isolated in-memory instances. A local production build preview must deliberately enable the local database override. Hosted production fails closed without database and canonical-origin configuration.

No cloud service was provisioned. Before deployment, validate migrations and core flows against the target PostgreSQL version, configure TLS and backups, and run restore and concurrency tests.
