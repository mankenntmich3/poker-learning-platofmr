"""Two independent security LPs for a one-decision-per-player river tree.

No pure-strategy enumeration: private BTN action simplices and BB behavioral
call variables give the exact sequence-form minimax solution of this tree.
Only generator terminal payoffs are inputs; server verification rebuilds them.
"""
import json
import sys
import time
import numpy as np
import scipy
from scipy.optimize import linprog
from scipy.optimize._highspy._core import _Highs

if scipy.__version__ != "1.16.2":
    raise RuntimeError("Install the pinned scripts/solver-requirements.txt")
request = json.load(sys.stdin)
start = time.perf_counter()
deals = request["root"]["branches"]
heroes = sorted({b["child"]["informationSet"] for b in deals})
defenders = sorted({a["child"]["informationSet"] for b in deals for a in b["child"]["actions"][1:]})
h_index = {key: i for i, key in enumerate(heroes)}
v_index = {key: i for i, key in enumerate(defenders)}
n, m = len(heroes), len(defenders)
check = np.zeros(n)
fold = np.zeros((n, 2, m))
call = np.zeros((n, 2, m))
for deal in deals:
    root, probability = deal["child"], deal["probability"]
    hi = h_index[root["informationSet"]]
    check[hi] += probability * root["actions"][0]["child"]["payoff"][0]
    for bi, action in enumerate(root["actions"][1:]):
        node = action["child"]
        vi = v_index[node["informationSet"]]
        fold[hi, bi, vi] += probability * node["actions"][0]["child"]["payoff"][0]
        call[hi, bi, vi] += probability * node["actions"][1]["child"]["payoff"][0]

# Maximize BTN's guaranteed payoff, with z_v <= each BB response payoff.
objective = np.zeros(3*n + m)
objective[np.arange(n)*3] = -check
objective[3*n:] = -1
eq = np.zeros((n, 3*n+m))
for hi in range(n):
    eq[hi, 3*hi:3*hi+3] = 1
ub = []
for vi in range(m):
    for outcomes in (fold, call):
        row = np.zeros(3*n+m)
        row[3*n+vi] = 1
        for hi in range(n):
            row[3*hi+1:3*hi+3] = -outcomes[hi, :, vi]
        ub.append(row)
options = {"dual_feasibility_tolerance": 1e-9, "primal_feasibility_tolerance": 1e-9}
primal = linprog(objective, A_ub=ub, b_ub=np.zeros(2*m), A_eq=eq, b_eq=np.ones(n),
                 bounds=[(0, 1)]*(3*n)+[(None, None)]*m, method="highs-ds", options=options)

# Minimize BTN's best response; t_h bounds each BTN action vs BB call policy.
objective2 = np.r_[np.zeros(m), np.ones(n)]
ub2, rhs = [], []
for hi in range(n):
    row = np.zeros(m+n)
    row[m+hi] = -1
    ub2.append(row)
    rhs.append(-check[hi])
    for bi in range(2):
        row = np.r_[call[hi, bi]-fold[hi, bi], np.zeros(n)]
        row[m+hi] = -1
        ub2.append(row)
        rhs.append(-fold[hi, bi].sum())
dual = linprog(objective2, A_ub=ub2, b_ub=rhs, bounds=[(0, 1)]*m+[(None, None)]*n,
               method="highs-ds", options=options)
if not primal.success or not dual.success:
    raise RuntimeError("Security LP failed")
profile = {key: primal.x[3*i:3*i+3].tolist() for i, key in enumerate(heroes)}
profile.update({key: [1-float(dual.x[i]), float(dual.x[i])] for i, key in enumerate(defenders)})
json.dump({"profile": profile, "runtimeMs": (time.perf_counter()-start)*1000,
           "engine": "SciPy 1.16.2 / HiGHS " + _Highs().version(),
           "iterations": int(primal.nit+dual.nit), "lowerValue": -primal.fun, "upperValue": dual.fun}, sys.stdout)
