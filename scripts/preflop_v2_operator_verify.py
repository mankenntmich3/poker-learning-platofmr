"""Separate chance-operator BR implementation, cross-checked against world BR.

Rebuilds three outcome-mass matrices from chance observations, not generator
operators/EVs. No solver imports. Information-set maximization precedes hidden
signal expansion at preflop. Only certifies the finite empirical model.
"""
import numpy as np
from scipy.sparse import coo_matrix

def verify(model,data,profile):
    if not len(data) or not np.all(np.isfinite(profile)):raise ValueError('Invalid finite input')
    left=54*data[:,0].astype(np.int32)+data[:,2]%54
    right=54*data[:,1].astype(np.int32)+data[:,3]%54
    outcome=[]
    for k in range(3):
        selected=data[:,4]==k
        outcome.append(coo_matrix((np.full(int(selected.sum()),1/len(data)),(left[selected],right[selected])),shape=(9126,9126)).tocsr())
    transposed=[x.T.tocsr() for x in outcome]
    policies={};offset=0
    for i,n in enumerate(model['nodes']):
        if n['actor']<0:continue
        rows=169 if n['street']==0 else 9126;actions=len(n['edges'])
        p=profile[offset:offset+rows*actions].reshape(rows,actions);offset+=rows*actions
        if np.any(p<0) or not np.allclose(p.sum(axis=1),1,rtol=0,atol=1e-10):raise ValueError('Invalid behavioral strategy')
        policies[i]=np.repeat(p,54,axis=0) if n['street']==0 else p
    if offset!=len(profile):raise ValueError('Extra/missing policy entries')
    root_action_values=[]
    def utility(player,best_response):
        matrices=outcome if player==0 else transposed
        def walk(i,opponent):
            n=model['nodes'][i]
            if n['actor']<0:
                value=np.zeros(9126)
                for coefficient,matrix in zip(n['payoff'],matrices):
                    if coefficient:value+=coefficient*(matrix@opponent)
                return value if player==0 else -value
            if n['actor']!=player:
                result=np.zeros(9126)
                for a,child in enumerate(n['edges']):result+=walk(child,opponent*policies[i][:,a])
                return result
            actions=np.column_stack([walk(child,opponent) for child in n['edges']])
            if i==0 and player==0 and not best_response:
                probabilities=np.bincount(data[:,0],minlength=169)/len(data)
                conditional=actions.reshape(169,54,-1).sum(axis=1)/probabilities[:,None]
                root_action_values.extend(conditional.tolist())
            if not best_response:return np.sum(actions*policies[i],axis=1)
            if n['street']==0:
                values=actions.reshape(169,54,-1).sum(axis=1)
                chosen=np.repeat(values.argmax(axis=1),54)
            else:chosen=actions.argmax(axis=1)
            return actions[np.arange(9126),chosen]
        return float(walk(0,np.ones(9126)).sum())
    values=[utility(0,False),utility(1,False)]
    br=[utility(0,True),utility(1,True)]
    if abs(sum(values))>1e-9 or any(b-v < -1e-9 for b,v in zip(br,values)):raise ValueError('Conservation / BR consistency failed')
    improvements=[b-v for b,v in zip(br,values)]
    return {'profileValues':values,'bestResponses':br,'nashConv':sum(improvements),'exploitability':sum(improvements)/2,
            'improvements':improvements,'scope':'COMPLETE_FINITE_MODEL_ONLY','publicationEligible':False,
            'method':'INDEPENDENT_THREE_OUTCOME_CSR_INFORMATION_SET_BR_V1',
            'rootActionEVsBb':root_action_values,
            'operatorBytes':sum(x.data.nbytes+x.indices.nbytes+x.indptr.nbytes for x in outcome+transposed)}
