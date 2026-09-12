# Executed solver dependencies

Production artifact: SciPy **1.16.2**, its bundled HiGHS (actual runtime version
recorded in the artifact), called through `scripts/solve-river-lp.py`.
SciPy is BSD-3-Clause; HiGHS is MIT. License texts retained here. The pinned
Python requirements are in `scripts/solver-requirements.txt`; no paid service,
external strategy database or third-party poker chart is used.

The game, explicit range assumptions, projection and study data are original
Rangeform work. The solver's optimization status is never a verification
certificate. Independent TypeScript best responses determine acceptance.

Separate DCFR cross-check: see `../poker_solver/UPSTREAM.md`.
