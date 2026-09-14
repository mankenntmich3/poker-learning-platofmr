"""Execute pinned DCFR on a complete, explicit NLHE river game tree."""
import json
import pathlib
import sys
import time

sys.path.insert(0, str(pathlib.Path(__file__).resolve().parents[1] / "vendor"))
from poker_solver.dcfr import DCFRSolver


class IterationFrozenDCFR(DCFRSolver):
    """Use one behavioral profile for all hidden deals within an iteration.

    The pinned traversal updates regrets in place. Freezing regret-matching
    output until the next iteration prevents later hidden deals from observing
    different policies at the same information set. All regret/average updates
    and discounting still use the pinned engine unchanged.
    """
    def __init__(self, game):
        super().__init__(game, seed=0)
        self.policy_iteration = -1
        self.policies = {}

    def _get_strategy(self, info):
        if self.policy_iteration != self.iteration:
            self.policies = {}
            self.policy_iteration = self.iteration
        key = id(info)
        if key not in self.policies:
            self.policies[key] = super()._get_strategy(info)
        return self.policies[key]


class ExplicitGame:
    num_players = 2

    def __init__(self, root):
        self.root = root

    def initial_state(self):
        return self.root

    def is_terminal(self, state):
        return state["kind"] == "terminal"

    def utility(self, state):
        return state["payoff"]

    def current_player(self, state):
        return -1 if state["kind"] == "chance" else state["player"]

    def chance_outcomes(self, state):
        return [(i, b["probability"]) for i, b in enumerate(state["branches"])]

    def legal_actions(self, state):
        return list(range(len(state["actions"])))

    def apply(self, state, action):
        return state["branches" if state["kind"] == "chance" else "actions"][action]["child"]

    def infoset_key(self, state, player):
        return state["informationSet"]


request = json.load(sys.stdin)
start = time.perf_counter()
profile = IterationFrozenDCFR(ExplicitGame(request["root"])).solve(request["iterations"])
json.dump({"profile": profile, "runtimeMs": (time.perf_counter() - start) * 1000}, sys.stdout)
