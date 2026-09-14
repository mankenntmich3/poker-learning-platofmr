"""Measured all-in payoff cost only. Does NOT emit strategies or VERIFIED data."""
import json
import math
import sys
import time
import numpy as np
from numba import njit
from preflop_equity import seven, oracle, card

@njit(cache=True)
def run(holes, independent):
    deck=[c for c in range(52) if c not in holes]
    size=len(deck);n=len(holes)//2;shares=np.zeros(n,np.int64);hands=np.zeros((n,7),np.int64);scores=np.zeros(n,np.int64)
    for i in range(n):hands[i,0],hands[i,1]=holes[2*i],holes[2*i+1]
    total=0;split=0
    for a in range(size-4):
        for b in range(a+1,size-3):
            for c in range(b+1,size-2):
                for d in range(c+1,size-1):
                    for e in range(d+1,size):
                        for i in range(n):
                            hands[i,2:]=np.array([deck[a],deck[b],deck[c],deck[d],deck[e]])
                            scores[i]=oracle(hands[i]) if independent else seven(hands[i])
                        best=max(scores);winners=np.sum(scores==best)
                        for i in range(n):
                            if scores[i]==best:shares[i]+=60//winners
                        split+=int(winners>1);total+=1
    return shares,total,split

records=[]
for n in [3,6]:
    hs=['As','Kh','Qc','Qd','Ah','5h','7c','6c','Jd','Td','9s','8s'][:n*2]
    pair=[]
    for independent in [False,True]:
        start=time.perf_counter();shares,total,splits=run(np.array([card(c) for c in hs]),independent);seconds=time.perf_counter()-start
        assert total==math.comb(52-2*n,5) and sum(shares)==60*total
        pair.append(shares.tolist())
        records.append({'players':n,'holes':hs,'method':'independent_best_five' if independent else 'direct_seven','boards':total,'splitBoards':splits,'shareUnits':shares.tolist(),'shareDenominator':60*total,'runtimeSeconds':seconds})
        print(json.dumps(records[-1]),file=sys.stderr,flush=True)
    assert pair[0]==pair[1]
full_deals={str(n):math.prod(math.comb(52-2*i,2) for i in range(n)) for n in [2,3,6]}
with open(sys.argv[1],'w') as f:json.dump({'scope':'PAYOFF_BENCHMARK_ONLY_NOT_SOLVER_OR_STRATEGY','uniformPhysicalOrderedDealsBeforeSuitSymmetry':full_deals,'benchmarks':records,'limitations':'Two-player security LP cannot solve a multiplayer constant-sum game (not two-player minimax). A multiway strategy algorithm and independent unilateral BR verifier are not implemented. Showdown evaluation alone is not a preflop solution.'},f,indent=2)
