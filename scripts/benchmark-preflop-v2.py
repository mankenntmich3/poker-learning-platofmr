"""Offline architecture comparison. Deliberately cannot publish to Rangeform."""
import os
import sys
import json
import time
import hashlib
import platform
from pathlib import Path
import numpy as np
from preflop_v2_kernel import worlds,arrays,train
from preflop_v2_verify import evaluate

def main():
    model=json.loads(Path(sys.argv[1]).read_text())
    output=Path(sys.argv[2]);iterations=int(sys.argv[3]) if len(sys.argv)>3 else 1000
    if not 1<=iterations<=50000:raise ValueError('Bounded iteration count required')
    output.parent.mkdir(parents=True,exist_ok=True)
    files=['scripts/build-preflop-model-v2.ts','scripts/preflop_v2_kernel.py','scripts/preflop_v2_verify.py','scripts/preflop_equity.py','scripts/benchmark-preflop-v2.py']
    hashes={p:hashlib.sha256(Path(p).read_bytes().replace(b'\r\n',b'\n')).hexdigest() for p in files}
    cache=Path('output/v2-worlds-seed-20260913.npy')
    start=time.perf_counter()
    if cache.exists():data=np.load(cache)
    else:
        data=worlds(20260913);np.save(cache,data)
    chance_seconds=time.perf_counter()-start
    if data.shape!=(1326*1225,5):raise ValueError('Incomplete physical hole prior')
    a=arrays(model);actor,street,children,count,offsets,payoff,size=a
    locked=np.full(len(actor),-1,np.int32);empty=np.zeros((1,1))
    # Compile before timing and seed every actual run independently.
    train(data,*a,1,1,1,0,0,empty,locked)
    reports=[];profiles=[]
    for algorithm in [0,1,2]:
      for seed in ([17,29,43] if algorithm==0 else [17]):
        t=time.perf_counter()
        profile,visits,updated,memory=train(data,*a,iterations,256,seed,algorithm,0,empty,locked)
        duration=time.perf_counter()-t
        print(json.dumps({'phase':'trained','algorithm':algorithm,'seed':seed,'seconds':duration}),flush=True)
        t=time.perf_counter();verification,_=evaluate(model,data,profile);verify_seconds=time.perf_counter()-t
        np.save(output.with_name(output.stem+f'-A-{algorithm}-{seed}.npy'),profile)
        row={'variant':'A_FLOP_ABSTRACT_CFR','algorithm':['CHANCE_SAMPLED_CFR','CHANCE_SAMPLED_PLUS_LINEAR','CHANCE_SAMPLED_DCFR'][algorithm],
             'seed':seed,'iterations':iterations,'chanceBatch':256,'seconds':duration,'visitedDecisionNodes':visits,'nodesPerSecond':visits/duration,
             'arrayWorkingBytes':memory,'allocatedActionEntries':size,'updatedActionEntries':updated,
             'verificationSeconds':verify_seconds,'verification':verification}
        reports.append(row);profiles.append(profile)
        print(json.dumps(row),flush=True)
    # B: separately solve each continuation under the declared unconditional prior.
    # This is a frozen-policy oracle, NOT a universal range-conditioned value function.
    boundaries=[i for i,n in enumerate(model['nodes']) if n['boundary']]
    oracle_values=[];subreports=[];subprofiles=[]
    t=time.perf_counter()
    for root in boundaries:
        sub,visits,_,_=train(data,*a,iterations,256,101+root,0,root,empty,locked)
        result,values=evaluate(model,data,sub,root=root)
        oracle_values.append(values);subprofiles.append(sub);subreports.append({'root':root,'verification':result})
        print(json.dumps({'phase':'oracle','root':root,'nashConv':result['nashConv']}),flush=True)
    oracle_seconds=time.perf_counter()-t
    oracle=np.asarray(oracle_values)
    for index,root in enumerate(boundaries):locked[root]=index
    t=time.perf_counter()
    profile,visits,updated,memory=train(data,*a,iterations,256,59,0,0,oracle,locked)
    duration=time.perf_counter()-t
    result,_=evaluate(model,data,profile,oracle=dict(zip(boundaries,oracle_values)))
    # Expand the frozen continuation policies and test unrestricted deviations
    # in model A. This detects invalid use of uniform-prior subgame values.
    expanded=profile.copy()
    def copy_subtree(node,sub):
        if actor[node]<0:return
        start=offsets[node];end=start+(169 if street[node]==0 else 9126)*count[node]
        expanded[start:end]=sub[start:end]
        for child in model['nodes'][node]['edges']:copy_subtree(child,sub)
    for root,sub in zip(boundaries,subprofiles):copy_subtree(root,sub)
    unlocked_result,_=evaluate(model,data,expanded)
    reports.append({'variant':'B_FROZEN_UNCONDITIONAL_SUBGAME_ORACLE','seed':59,'seconds':duration,
                    'oracleConstructionSeconds':oracle_seconds,'oracleBytes':oracle.nbytes,
                    'arrayWorkingBytes':memory,'nodesPerSecond':visits/duration,'verification':result,'subgames':subreports,'unlockedModelADeviation':unlocked_result,
                    'limitation':'Continuation priors frozen; not counterfactual range-conditioned NLHE continuation values'})
    roots=[p[:169*count[0]].reshape(169,count[0]) for p in profiles[:3]]
    stability=[{'seeds':[x,y],'maxRootL1':float(np.abs(roots[i]-roots[j]).sum(axis=1).max()),
                'meanRootL1':float(np.abs(roots[i]-roots[j]).sum(axis=1).mean())}
               for i,x in enumerate([17,29,43]) for j,y in enumerate([17,29,43]) if i<j]
    report={'model':model['contract'],'modelHash':model['sha256'],'sources':hashes,'platform':platform.platform(),
            'python':sys.version,'chanceWorlds':len(data),'chanceBytes':data.nbytes,'chancePreparationSeconds':chance_seconds,
            'chanceSeed':20260913,'chanceHash':hashlib.sha256(data.tobytes()).hexdigest(),
            'physicalRootCombos':1326,'physicalJointHolePrior':'ALL_1624350_ORDERED_COMPATIBLE_DEALS_EQUAL_WEIGHT',
            'publicNodes':len(actor),'runs':reports,'rootStability':stability,'publicationEligible':False,
            'status':'EXPERIMENTAL_MODEL_NOT_SERVER_APPROVED','physicalDeviationTest':'NOT_YET_IMPLEMENTED_FOR_V2_MAPPING'}
    if hashes!={p:hashlib.sha256(Path(p).read_bytes().replace(b'\r\n',b'\n')).hexdigest() for p in files}:raise RuntimeError('Source changed during run')
    output.write_text(json.dumps(report,indent=2))
    print(json.dumps({'output':str(output),'publicationEligible':False}),flush=True)

if __name__=='__main__':main()
