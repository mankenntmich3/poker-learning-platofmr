"""Independent full-information-set best response in the finite chance model.

No imports of the generator or regret kernel. Public-tree dynamic programming
aggregates ALL chance worlds at each information set before selecting an action.
This is not a physical NLHE upper certificate when boards are empirical.
"""
import numpy as np

def evaluate(model, data, profile, root=0, oracle=None):
    nodes=model['nodes'];offsets=[];size=0
    for n in nodes:
        offsets.append(size)
        if n['actor']>=0:size+=(169 if n['street']==0 else 9126)*len(n['edges'])
    if len(profile)!=size or not np.all(np.isfinite(profile)) or np.any(profile<0):raise ValueError('Invalid full profile')
    for i,n in enumerate(nodes):
        if n['actor']>=0:
            rows=profile[offsets[i]:offsets[i]+(169 if n['street']==0 else 9126)*len(n['edges'])].reshape(-1,len(n['edges']))
            if not np.allclose(rows.sum(axis=1),1,rtol=0,atol=1e-10):raise ValueError('Unnormalized profile')
    counts=np.bincount(data[:,0],minlength=169)
    if np.any(counts==0):raise ValueError('Missing root hand class')
    visits=0
    def walk(i, responder, opponent_reach):
        nonlocal visits
        visits+=len(data);n=nodes[i]
        if oracle is not None and i in oracle:return oracle[i]
        if n['actor']<0:return np.asarray(n['payoff'])[data[:,4]]
        p=n['actor'];code=data[:,p+2*n['street']].astype(np.int64)
        index=offsets[i]+code*len(n['edges'])
        probabilities=[profile[index+a] for a in range(len(n['edges']))]
        results=[walk(child,responder,opponent_reach if p==responder else opponent_reach*probabilities[a]) for a,child in enumerate(n['edges'])]
        if p!=responder:
            result=np.zeros(len(data))
            for prob,val in zip(probabilities,results):result+=prob*val
            return result
        # Optimize one shared legal action per information set, not per hidden world.
        cf=np.stack([np.bincount(code,weights=opponent_reach*v*(1 if p==0 else -1),minlength=169 if n['street']==0 else 9126) for v in results])
        choice=cf.argmax(axis=0)[code]
        result=np.empty(len(data))
        for a,v in enumerate(results):np.copyto(result,v,where=choice==a)
        return result
    weights=np.full(len(data),1/len(data))
    profile_world=walk(root,-1,weights)
    value=float(profile_world.mean())
    br0=float(walk(root,0,weights).mean());br1=-float(walk(root,1,weights).mean())
    improvements=[br0-value,br1+value]
    if min(improvements)<-1e-8:raise ValueError('Best response below profile value')
    return {'profileValues':[value,-value],'bestResponses':[br0,br1],
            'improvements':improvements,'nashConv':sum(improvements),'exploitability':sum(improvements)/2,
            'worldNodeVisits':visits,'scope':'COMPLETE_FINITE_MODEL_ONLY','publicationEligible':False},profile_world
