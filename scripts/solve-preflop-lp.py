"""Exact security LPs for a conditional physical-combo HU push/fold tree.

Independent of the TypeScript verifier. Uses generator-enumerated equity counts.
No equity-realization model, postflop proxy, sampling, or estimated chart.
"""
import hashlib
import json
import sys
import time
import numpy as np
import scipy
from scipy.optimize import linprog
from scipy.optimize._highspy._core import _Highs
from preflop_equity import canonical, card

if scipy.__version__!='1.16.2':raise RuntimeError('Pinned SciPy required')
request=json.load(sys.stdin)
start=time.perf_counter()
with open(request['equityFile']) as f:data=json.load(f)
counts={tuple(card(c) for c in r['cards']):r for r in data['matchups']}
combos=request['combos'];n=len(combos)
compatible=np.array([[not set(h)&set(v) for v in combos] for h in combos])
prob=compatible/compatible.sum()
stack,ante=request['stack'],request['ante']
fold=-0.5;win=1+ante
pay=np.zeros((n,n))
for i,h in enumerate(combos):
    for j,v in enumerate(combos):
        if not compatible[i,j]:continue
        key,swap=canonical(tuple(card(c) for c in h),tuple(card(c) for c in v))
        r=counts[key]
        if r['total']!=1712304:raise RuntimeError('Incomplete runouts')
        equity=(r['wins']+r['ties']/2)/r['total']
        if swap:equity=1-equity
        pay[i,j]=(2*stack-ante)*equity-(stack-ante)
# BTN jam probability x; each z_j <= BB fold or call utility to BTN.
# Root fold contributes constant fold + sum_i(-fold*mass_i*x_i).
objective=np.r_[fold*prob.sum(axis=1),-np.ones(n)]
ub=[]
for j in range(n):
    for values in (np.full(n,win),pay[:,j]):
        row=np.zeros(2*n);row[:n]=-prob[:,j]*values;row[n+j]=1;ub.append(row)
options={'dual_feasibility_tolerance':1e-9,'primal_feasibility_tolerance':1e-9}
primal=linprog(objective,A_ub=ub,b_ub=np.zeros(2*n),bounds=[(0,1)]*n+[(None,None)]*n,method='highs-ds',options=options)
# BB call probabilities y, t_i >= BTN fold or jam payoff.
ub2=[];rhs=[]
for i in range(n):
    row=np.zeros(2*n);row[n+i]=-1;ub2.append(row);rhs.append(-fold*prob[i].sum())
    row=np.r_[prob[i]*(pay[i]-win),np.zeros(n)];row[n+i]=-1;ub2.append(row);rhs.append(-win*prob[i].sum())
dual=linprog(np.r_[np.zeros(n),np.ones(n)],A_ub=ub2,b_ub=rhs,bounds=[(0,1)]*n+[(None,None)]*n,method='highs-ds',options=options)
if not primal.success or not dual.success:raise RuntimeError('Security LP failed')
profile={}
rows=[]
for i,h in enumerate(combos):
    profile['BTN:'+''.join(h)]={'fold':1-float(primal.x[i]),'jam':float(primal.x[i])}
    profile['BB:'+''.join(h)]={'fold':1-float(dual.x[i]),'call':float(dual.x[i])}
    mass=prob[i].sum()
    rows.append({'combo':h,'reach':float(mass),'actions':[{'actionId':'fold','frequency':1-float(primal.x[i]),'evBb':fold},{'actionId':'jam','frequency':float(primal.x[i]),'evBb':float((prob[i]*(win*(1-dual.x[:n])+pay[i]*dual.x[:n])).sum()/mass)}]})
json.dump({'profile':profile,'rows':rows,'runtimeMs':(time.perf_counter()-start)*1000,'iterations':int(primal.nit+dual.nit),'lowerValue':fold-primal.fun,'upperValue':dual.fun,'engine':'SciPy 1.16.2 / HiGHS '+_Highs().version(),'compatibleDeals':int(compatible.sum())},sys.stdout)
