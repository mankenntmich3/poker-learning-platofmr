# Vendored reference engine

`dcfr.py` is copied without code modification (canonical LF line endings) from `amaster97/poker_solver`,
commit `f78f1b2bc338dd8cbb5226ecb8398bbdb3635676`, package version 1.11.
MIT license and copyright are retained in LICENSE. Only the engine is reused;
the upstream HUNL configuration and preflop charts are **not** our game model.
`games.py` is a Rangeform typing shim; `__init__.py` avoids optional UI/Rust imports.

Requires Python >=3.9 and NumPy >=1.24. The executable adapter is
`scripts/solve-river.py`. Verification does not import this engine or trust its
convergence claims. The pinned engine hash is checked before execution.
