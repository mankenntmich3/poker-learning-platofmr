"""Original indexed chance-sampled CFR experiments, no publication authority.

Finite board measure is an explicit model assumption, not an equity certificate.
Numba owns the hot loop; independent verification lives in another module.
"""
import numpy as np
from numba import njit
from preflop_equity import seven

@njit(cache=True)
def hand_class(a, b):
    x, y = 12-a//4, 12-b//4
    if x == y: return x*13+y
    hi, lo = min(x,y), max(x,y)
    return hi*13+lo if a%4 == b%4 else lo*13+hi

@njit(cache=True)
def worlds(seed):
    """Exactly 1326*1225 ordered legal physical deals, one sampled board each."""
    np.random.seed(seed)
    n = 1326*1225
    result = np.empty((n, 5), np.int16)
    row = 0
    for a in range(52):
      for b in range(a+1,52):
       for c in range(52):
        if c == a or c == b: continue
        for d in range(c+1,52):
         if d == a or d == b: continue
         deck = np.empty(48,np.int16); at=0
         for q in range(52):
          if q!=a and q!=b and q!=c and q!=d: deck[at]=q;at+=1
         for q in range(5):
          j=np.random.randint(q,48);deck[q],deck[j]=deck[j],deck[q]
         h=np.empty(7,np.int16);v=np.empty(7,np.int16)
         h[0]=a;h[1]=b;v[0]=c;v[1]=d
         for q in range(5):h[q+2]=deck[q];v[q+2]=deck[q]
         paired=int(deck[0]//4==deck[1]//4 or deck[0]//4==deck[2]//4 or deck[1]//4==deck[2]//4)
         suits=1+int(deck[1]%4!=deck[0]%4)+int(deck[2]%4!=deck[0]%4 and deck[2]%4!=deck[1]%4)
         texture=paired*3+suits-1
         hc,vc=hand_class(a,b),hand_class(c,d)
         result[row,0]=hc;result[row,1]=vc
         result[row,2]=hc*54+texture*9+seven(h[:5])//759375
         result[row,3]=vc*54+texture*9+seven(v[:5])//759375
         hs,vs=seven(h),seven(v)
         result[row,4]=2 if hs>vs else 1 if hs==vs else 0
         row+=1
    assert row==n
    return result

def arrays(model):
    nodes=model['nodes'];n=len(nodes)
    actor=np.array([x['actor'] for x in nodes],np.int32)
    street=np.array([x['street'] for x in nodes],np.int32)
    children=np.full((n,5),-1,np.int32)
    count=np.array([len(x['edges']) for x in nodes],np.int32)
    offsets=np.zeros(n,np.int64);size=0
    for i,x in enumerate(nodes):
        children[i,:len(x['edges'])]=x['edges'];offsets[i]=size
        if actor[i]>=0:size+=(169 if street[i]==0 else 169*54)*count[i]
    payoff=np.zeros((n,3))
    for i,x in enumerate(nodes):
        if actor[i]<0:payoff[i]=x['payoff']
    return actor,street,children,count,offsets,payoff,int(size)

@njit(cache=True)
def normalize(regret, offsets, count, actor, street):
    policy=np.zeros_like(regret)
    for i in range(len(actor)):
      if actor[i]<0:continue
      for k in range(169 if street[i]==0 else 169*54):
       start=offsets[i]+k*count[i];total=0.
       for a in range(count[i]):total+=max(regret[start+a],0.)
       for a in range(count[i]):policy[start+a]=max(regret[start+a],0.)/total if total>0 else 1./count[i]
    return policy

@njit(cache=True)
def train(data, actor, street, children, count, offsets, payoff, size,
          iterations, batch, seed, algorithm, root, oracle, locked):
    np.random.seed(seed)
    regret=np.zeros(size);sums=np.zeros(size);updates=np.zeros(size,np.int64)
    n=len(actor);values=np.zeros(n);reach=np.zeros((2,n));indexes=np.zeros(n,np.int64)
    visits=0
    for iteration in range(1,iterations+1):
      policy=normalize(regret,offsets,count,actor,street)
      delta=np.zeros(size)
      for sample in range(batch):
        w=np.random.randint(len(data))
        reach[:]=0.;reach[0,root]=1.;reach[1,root]=1.
        for i in range(n):
          if actor[i]<0:values[i]=payoff[i,data[w,4]];continue
          if locked[i]>=0:values[i]=oracle[locked[i],w];continue
          if reach[0,i]==0 and reach[1,i]==0:continue
          player=actor[i];code=data[w,player+2*street[i]]
          start=offsets[i]+code*count[i];indexes[i]=start
          for a in range(count[i]):
            child=children[i,a]
            reach[player,child]=reach[player,i]*policy[start+a]
            reach[1-player,child]=reach[1-player,i]
        for i in range(n-1,-1,-1):
          if actor[i]<0 or locked[i]>=0:continue
          start=indexes[i];value=0.
          for a in range(count[i]):value+=policy[start+a]*values[children[i,a]]
          values[i]=value
          player=actor[i]
          if reach[0,i]==0 and reach[1,i]==0:continue
          visits+=1
          weight=iteration if algorithm==1 else 1.
          for a in range(count[i]):
            delta[start+a]+=reach[1-player,i]*(values[children[i,a]]-value)*(1 if player==0 else -1)/batch
            sums[start+a]+=weight*reach[player,i]*policy[start+a]/batch
            updates[start+a]+=1
      for k in range(size):
        if algorithm==2:
          factor=iteration**1.5/(iteration**1.5+1) if regret[k]>0 else .5
          regret[k]*=factor
          sums[k]*=(iteration/(iteration+1))**2
        regret[k]+=delta[k]
        if algorithm==1:regret[k]=max(0.,regret[k])
    average=np.zeros(size)
    for i in range(n):
      if actor[i]<0:continue
      for k in range(169 if street[i]==0 else 169*54):
        at=offsets[i]+k*count[i];total=0.
        for a in range(count[i]):total+=sums[at+a]
        for a in range(count[i]):average[at+a]=sums[at+a]/total if total>0 else 1./count[i]
    return average,visits,np.count_nonzero(updates),regret.nbytes+sums.nbytes+updates.nbytes+delta.nbytes+policy.nbytes+average.nbytes
