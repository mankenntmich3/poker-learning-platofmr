"""Exact chance-operator CFR for the finite V2 model, not physical NLHE.

Compress all chance worlds into joint private-observation mass and showdown
pot-share CSR operators. Terminal payoffs are affine in pot share. This retains
the finite model exactly; preflop decisions sum over still-hidden flop signals.
Independent verification continues to enumerate worlds with separate NumPy BR.
"""
import sys,json,time,hashlib,platform,os
from pathlib import Path
import numpy as np
from scipy.sparse import coo_matrix
from preflop_v2_kernel import arrays,worlds
from preflop_v2_verify import evaluate

def solve(model,data,iterations,algorithm=1):
    nodes=model['nodes'];nobs=9126
    # Each block is an equal-weight complete hole prior; build a finite mixture
    # without materializing its combined world-by-public-node tree.
    blocks=[data] if isinstance(data,np.ndarray) else data
    mass=None;share=None;block_count=0
    for block in blocks:
        h=block[:,2].astype(np.int32);v=block[:,3].astype(np.int32)
        p=coo_matrix((np.full(len(block),1/len(block)),(h,v)),shape=(nobs,nobs)).tocsr()
        e=coo_matrix((block[:,4]/(2.*len(block)),(h,v)),shape=(nobs,nobs)).tocsr()
        mass=p if mass is None else mass+p;share=e if share is None else share+e;block_count+=1
    if not block_count:raise ValueError('Empty chance measure')
    mass/=block_count;share/=block_count
    operators=[(mass,share),(mass.T.tocsr(),share.T.tocsr())]
    marginal=[np.asarray(mass.sum(axis=1)).ravel(),np.asarray(mass.sum(axis=0)).ravel()]
    regrets={i:np.zeros((169 if n['street']==0 else nobs,len(n['edges']))) for i,n in enumerate(nodes) if n['actor']>=0}
    sums={i:np.zeros_like(x) for i,x in regrets.items()}
    started=time.perf_counter();visits=0
    for iteration in range(1,iterations+1):
        policy={}
        for i,r in regrets.items():
            positive=np.maximum(r,0);total=positive.sum(axis=1,keepdims=True)
            policy[i]=np.divide(positive,total,out=np.full_like(r,1/r.shape[1]),where=total>0)
        delta={i:np.zeros_like(r) for i,r in regrets.items()}
        for player in [0,1]:
            probability,equity=operators[player]
            def visit(i,own_reach,opponent_reach):
                nonlocal visits
                visits+=1;n=nodes[i]
                if n['actor']<0:
                    loss,tie,win=n['payoff']
                    if abs(tie-(loss+win)/2)>1e-10:raise ValueError('Non-affine terminal payoff')
                    # Transposed operator still stores BTN share for BB utilities.
                    value=loss*(probability@opponent_reach)+(win-loss)*(equity@opponent_reach)
                    return value if player==0 else -value
                strategy=policy[i] if n['street'] else np.repeat(policy[i],54,axis=0)
                if n['actor']!=player:
                    result=np.zeros(nobs)
                    for a,child in enumerate(n['edges']):result+=visit(child,own_reach,opponent_reach*strategy[:,a])
                    return result
                children=np.column_stack([visit(child,own_reach*strategy[:,a],opponent_reach) for a,child in enumerate(n['edges'])])
                value=np.sum(children*strategy,axis=1)
                differences=children-value[:,None]
                averaging=own_reach[:,None]*marginal[player][:,None]*strategy
                if n['street']==0:
                    differences=differences.reshape(169,54,-1).sum(axis=1)
                    averaging=averaging.reshape(169,54,-1).sum(axis=1)
                delta[i]+=differences
                sums[i]+=averaging*(iteration if algorithm==1 else 1)
                return value
            visit(0,np.ones(nobs),np.ones(nobs))
        for i,r in regrets.items():
            if algorithm==2:
                r*=np.where(r>0,iteration**1.5/(iteration**1.5+1),.5)
                sums[i]*=(iteration/(iteration+1))**2
            r+=delta[i]
            if algorithm==1:np.maximum(r,0,out=r)
    profile=np.empty(arrays(model)[-1]);offset=0
    for i,n in enumerate(nodes):
        if n['actor']<0:continue
        total=sums[i].sum(axis=1,keepdims=True)
        p=np.divide(sums[i],total,out=np.full_like(sums[i],1/sums[i].shape[1]),where=total>0).ravel()
        profile[offset:offset+len(p)]=p;offset+=len(p)
    seconds=time.perf_counter()-started
    operator_bytes=sum(x.data.nbytes+x.indices.nbytes+x.indptr.nbytes for pair in operators for x in pair)
    return profile,{'algorithm':['FULL_CFR','FULL_CFR_PLUS_LINEAR','FULL_DCFR'][algorithm],
                    'iterations':iterations,'seconds':seconds,'publicNodeVisits':visits,'publicNodesPerSecond':visits/seconds,
                    'chanceOperatorNonzeros':mass.nnz,'chanceOperatorBytes':operator_bytes,
                    'chanceBlocks':block_count,
                    'regretAndAverageBytes':sum(x.nbytes for x in regrets.values())*2,
                    'scope':'EXACT_OPERATOR_COMPRESSION_OF_FINITE_BOARD_MODEL','publicationEligible':False}

if __name__=='__main__':
    sources=['scripts/preflop_v2_sparse.py','scripts/preflop_v2_kernel.py','scripts/preflop_v2_verify.py','scripts/preflop_equity.py','scripts/build-preflop-model-v2.ts']
    hashes=lambda:{p:hashlib.sha256(Path(p).read_bytes().replace(b'\r\n',b'\n')).hexdigest() for p in sources}
    before=hashes()
    model=json.loads(Path(sys.argv[1]).read_text())
    seed=int(sys.argv[4]) if len(sys.argv)>4 else 20260913
    if not 0<seed<2**32:raise ValueError('uint32 chance seed required')
    cache=Path(f'output/v2-worlds-seed-{seed}.npy')
    if cache.exists():data=np.load(cache)
    else:data=worlds(seed);np.save(cache,data)
    iterations=int(sys.argv[3]) if len(sys.argv)>3 else 100
    if not 1<=iterations<=2000:raise ValueError('Bounded operator benchmark required')
    profile,report=solve(model,data,iterations)
    start=time.perf_counter();verification,_=evaluate(model,data,profile)
    report['verificationSeconds']=time.perf_counter()-start;report['verification']=verification
    report.update({'modelHash':model['sha256'],'sources':before,'chanceSeed':seed,'chanceWorlds':len(data),
                   'chanceSha256':hashlib.sha256(data.tobytes()).hexdigest(),'platform':platform.platform(),'cpus':os.cpu_count(),
                   'physicalRootCombos':1326,'physicalHolePrior':'ALL_ORDERED_COMPATIBLE_PAIRS',
                   'physicalBoardLaw':'ONE_SAMPLED_RUNOUT_PER_PAIR_NOT_EXACT_NLHE',
                   'rootFrequencies':profile[:169*len(model['nodes'][0]['edges'])].reshape(169,-1).tolist()})
    if before!=hashes():raise RuntimeError('Source changed during solve/verification')
    Path(sys.argv[2]).write_text(json.dumps(report,indent=2));np.save(str(sys.argv[2])+'.npy',profile)
    print(json.dumps(report),flush=True)
