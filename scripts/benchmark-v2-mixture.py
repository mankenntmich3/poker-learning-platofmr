"""Refine the uncertain board measure with fixed public/observation state space."""
import sys,json,time,hashlib
from pathlib import Path
import numpy as np
from preflop_v2_kernel import worlds
from preflop_v2_sparse import solve
from preflop_v2_operator_verify import verify

seeds=[17,29,43,101,103,107,109,113]
holdouts=[127,131,137]
output=Path(sys.argv[1] if len(sys.argv)>1 else 'output/preflop-v2-mixture.json')
iterations=int(sys.argv[2]) if len(sys.argv)>2 else 2000
if not 1<=iterations<=2000:raise ValueError('Bounded mixture run required')
sources=['scripts/benchmark-v2-mixture.py','scripts/preflop_v2_kernel.py','scripts/preflop_v2_sparse.py','scripts/preflop_v2_operator_verify.py','scripts/preflop_equity.py']
hashes=lambda:{p:hashlib.sha256(Path(p).read_bytes().replace(b'\r\n',b'\n')).hexdigest() for p in sources}
before=hashes()
model=json.loads(Path('output/preflop-model-v2.json').read_text());model.pop('sha256',None)
model['contract']['id']='PREFLOP_MODEL_V2_PILOT_3'
model['contract']['chance']='UNIFORM_MIXTURE_OF_COMPLETE_HOLE_PRIORS_WITH_ONE_RUNOUT_PER_PAIR_PER_SEED_AND_GLOBAL_SUIT_CLOSURE'
model['contract']['chanceSeeds']=seeds
model['sha256']=hashlib.sha256(json.dumps(model,sort_keys=True,separators=(',',':')).encode()).hexdigest()
output.with_suffix('.model.json').write_text(json.dumps(model))
def data(seed):
    p=Path(f'output/v2-worlds-seed-{seed}.npy')
    if not p.exists():
        t=time.perf_counter();np.save(p,worlds(seed));print(json.dumps({'chanceSeed':seed,'generationSeconds':time.perf_counter()-t}),flush=True)
    return np.load(p)
for seed in seeds+holdouts:data(seed)
start=time.perf_counter();profile,result=solve(model,(data(seed) for seed in seeds),iterations)
result['totalSolveAndOperatorSeconds']=time.perf_counter()-start
np.save(output.with_suffix('.npy'),profile)
start=time.perf_counter();result['verification']=verify(model,(data(seed) for seed in seeds),profile)
result['verificationSeconds']=time.perf_counter()-start
result['holdouts']=[]
for seed in holdouts:
    check=verify(model,data(seed),profile)
    result['holdouts'].append({'seed':seed,'verification':check})
start=time.perf_counter();result['jointHoldout']=verify(model,(data(seed) for seed in holdouts),profile)
result['jointHoldoutSeconds']=time.perf_counter()-start
result.update({'modelHash':model['sha256'],'sources':before,'chanceSeeds':seeds,'holdoutSeeds':holdouts,
               'physicalRootCombos':1326,'rootClasses':169,'publicNodes':len(model['nodes']),
               'publicationEligible':False,'status':'MODEL_QUALITY_NOT_APPROVED'})
if before!=hashes():raise RuntimeError('Sources changed during experiment')
output.write_text(json.dumps(result,indent=2))
print(json.dumps({k:v for k,v in result.items() if k not in ['verification','holdouts','jointHoldout','sources']}),flush=True)
print(json.dumps({'trainingNashConv':result['verification']['nashConv'],'jointHoldoutNashConv':result['jointHoldout']['nashConv']}),flush=True)
