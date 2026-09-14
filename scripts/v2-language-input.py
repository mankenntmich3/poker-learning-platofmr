import json,struct,sys,time
from pathlib import Path
import numpy as np
from preflop_v2_kernel import arrays,worlds,train
from preflop_v2_operator_verify import verify
model=json.loads(Path('output/preflop-model-v2.json').read_text())
cache=Path('output/v2-worlds-seed-20260913.npy')
if not cache.exists():np.save(cache,worlds(20260913))
data=np.load(cache);actor,street,children,count,offsets,payoff,size=arrays(model)
if sys.argv[1]=='prepare':
    with open('output/v2-language-input.bin','wb') as f:
        f.write(struct.pack('<4I',0x32564652,len(actor),len(data),size))
        for i in range(len(actor)):f.write(struct.pack('<9i3d',actor[i],street[i],count[i],offsets[i],*children[i],*payoff[i]))
        f.write(data.astype('<i2').tobytes())
elif sys.argv[1]=='numba':
    a=arrays(model);lock=np.full(len(actor),-1,np.int32);empty=np.zeros((1,1))
    train(data,*a,1,1,17,0,0,empty,lock)
    t=time.perf_counter();profile,visits,_,memory=train(data,*a,1000,256,17,0,0,empty,lock)
    seconds=time.perf_counter()-t
    result=verify(model,data,profile);result.pop('rootActionEVsBb')
    report={'language':'Python/Numba','seconds':seconds,'nodesPerSecond':visits/seconds,'visitedDecisionNodes':visits,
            'numericWorkingBytesIncludingUpdateCounters':memory,'randomStream':'NumPy MT19937, differs from TS/C++ xorshift stream',
            'verification':result,'publicationEligible':False}
    Path('output/v2-numba-language.json').write_text(json.dumps(report,indent=2));print(json.dumps(report))
elif sys.argv[1]=='verify':
    ts=np.fromfile('output/v2-ts-profile.bin',dtype='<f8');cpp=np.fromfile('output/v2-cpp-profile.bin',dtype='<f8')
    np.testing.assert_allclose(ts,cpp,rtol=0,atol=1e-10)
    result=verify(model,data,cpp);result.pop('rootActionEVsBb')
    result['maxLanguageProfileDifference']=float(np.abs(ts-cpp).max())
    Path('output/v2-language-verification.json').write_text(json.dumps(result,indent=2))
    print(json.dumps(result))
else:raise ValueError('prepare, numba or verify required')
