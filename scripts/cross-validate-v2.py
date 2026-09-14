"""Out-of-measure complete BR checks, not a physical NLHE upper certificate."""
import json,time,hashlib
from pathlib import Path
import numpy as np
from preflop_v2_verify import evaluate
model=json.loads(Path('output/preflop-model-v2.json').read_text())
results=[]
for source in [17,29,43]:
    profile=np.load(f'output/preflop-v2-sparse-2000-{source}.json.npy')
    for target in [17,29,43]:
        data=np.load(f'output/v2-worlds-seed-{target}.npy')
        start=time.perf_counter();result,_=evaluate(model,data,profile)
        results.append({'strategyChanceSeed':source,'evaluationChanceSeed':target,'verificationSeconds':time.perf_counter()-start,
                        'verification':result,'profileSha256':hashlib.sha256(profile.tobytes()).hexdigest(),
                        'chanceSha256':hashlib.sha256(data.tobytes()).hexdigest()})
        print(json.dumps({'source':source,'target':target,'nashConv':result['nashConv']}),flush=True)
Path('output/preflop-v2-cross-validation.json').write_text(json.dumps({'modelHash':model['sha256'],
    'note':'PILOT_2 makes global suit closure explicit; identical finite observation/payoff operators to PILOT_1; all model BRs recomputed',
    'runs':results,'publicationEligible':False},indent=2))
