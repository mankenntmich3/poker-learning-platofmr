import json
import time
from pathlib import Path
import numpy as np
from preflop_v2_kernel import arrays,train
from preflop_v2_verify import evaluate

reports=[]
for case in json.loads(Path('output/v2-calibration-input.json').read_text()):
    model=case['model'];data=np.asarray(case['data'],np.int16)
    oracle={int(k):np.asarray(v) for k,v in case['oracle'].items()}
    baseline,_=evaluate(model,data,np.asarray(case['profile']),oracle=oracle)
    assert abs(baseline['nashConv']-case['expected']['nashConv'])<1e-10
    a=arrays(model);locked=np.full(len(model['nodes']),-1,np.int32)
    for j,node in enumerate(oracle):locked[node]=j
    values=np.asarray(list(oracle.values()))
    for algorithm in [0,1,2]:
        start=time.perf_counter()
        profile,visits,_,memory=train(data,*a,100000,len(data),37,algorithm,0,values,locked,True)
        result,_=evaluate(model,data,profile,oracle=oracle)
        reports.append({'case':case['name'],'algorithm':['FULL_CFR','FULL_CFR_PLUS_LINEAR','FULL_DCFR'][algorithm],
                        'seconds':time.perf_counter()-start,'verification':result,'knownLPVerification':baseline,
                        'iterations':100000,'worlds':len(data),'workingArrayBytes':memory})
        assert result['nashConv']<.02, 'Calibration accuracy regression; not a production acceptance threshold'
Path('output/v2-calibration-results.json').write_text(json.dumps(reports,indent=2))
print(json.dumps(reports))
