# ADR 0001: Complete a bounded learning loop before expanding coverage

Status: accepted for milestone 1, 2026-09-06.

The product specification spans a substantial SaaS and solver infrastructure. Building all modules at once would create superficial features and misleading strategy coverage. The first release therefore combines one original mixed-strategy lesson, a working account, persisted decisions and progress, a hand-class explorer, and a genuinely computed Kuhn solver dataset.

Kuhn poker has three cards, one card per player, ante one and fixed one-unit bets. It makes bluffing, bluff-catching and mixed strategies visible while allowing independent exhaustive exploitability checks. It does not teach an NLHE opening range, estimate Hold'em equity or replace a commercial NLHE solution.

Consequences: the solver-to-trainer pipeline can be verified now without third-party strategy data or cloud spend. The next milestone should add one explicitly scoped, validated Hold'em spot or properly licensed source before claiming NLHE strategy training. Broad analysis, AI coach, payments and GPUs remain future work.
