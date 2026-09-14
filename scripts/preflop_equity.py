"""Exact conditional preflop runouts. Original Rangeform implementation.

Generator: direct seven-card rank histogram. Independent check: best of all
21 five-card subsets, with a separate rank classifier. Suit permutations and
player exchange only identify exact bijections; no rank/strength abstraction.
"""
import itertools
import json
import sys
import time
import numpy as np
from numba import njit

RANKS = "23456789TJQKA"
SUITS = "cdhs"

def card(s):
    return RANKS.index(s[0])*4 + SUITS.index(s[1])

def text(c):
    return RANKS[c//4]+SUITS[c%4]

def canonical(a, b):
    candidates = []
    for p in itertools.permutations(range(4)):
        x = tuple(sorted((c//4*4+p[c%4] for c in a)))
        y = tuple(sorted((c//4*4+p[c%4] for c in b)))
        candidates.append((x+y, False))
        candidates.append((y+x, True))
    return min(candidates)

@njit(cache=True)
def pack(category, ranks):
    score = category
    for i in range(5):
        score = score*15+(ranks[i] if i<len(ranks) else 0)
    return score

@njit(cache=True)
def seven(cards):
    counts = np.zeros(15, np.int64)
    suit_masks = np.zeros(4, np.int64)
    suit_counts = np.zeros(4, np.int64)
    mask = 0
    for c in cards:
        r, s = c//4+2, c%4
        counts[r] += 1
        mask |= 1 << r
        suit_masks[s] |= 1 << r
        suit_counts[s] += 1
    flush = -1
    for s in range(4):
        if suit_counts[s]>=5:
            flush=s
    masks = [mask, suit_masks[flush] if flush>=0 else 0]
    straights = [0,0]
    for i in range(2):
        m = masks[i] | (2 if masks[i] & (1<<14) else 0)
        for high in range(14,4,-1):
            if m & (31 << (high-4)) == 31 << (high-4):
                straights[i]=high
                break
    if straights[1]: return pack(8,[straights[1]])
    ranks = [r for r in range(14,1,-1) if counts[r]]
    quads = [r for r in ranks if counts[r]==4]
    trips = [r for r in ranks if counts[r]>=3]
    pairs = [r for r in ranks if counts[r]>=2]
    if len(quads): return pack(7,[quads[0]]+[r for r in ranks if r!=quads[0]][:1])
    if len(trips) and len(pairs)>1: return pack(6,[trips[0]]+[r for r in pairs if r!=trips[0]][:1])
    if flush>=0: return pack(5,[r for r in ranks if suit_masks[flush] & (1<<r)][:5])
    if straights[0]: return pack(4,[straights[0]])
    if len(trips): return pack(3,[trips[0]]+[r for r in ranks if r!=trips[0]][:2])
    if len(pairs)>=2: return pack(2,pairs[:2]+[r for r in ranks if r!=pairs[0] and r!=pairs[1]][:1])
    if len(pairs): return pack(1,[pairs[0]]+[r for r in ranks if r!=pairs[0]][:3])
    return pack(0,ranks[:5])

# This oracle does not call seven(), pack(), or its bit-mask straight logic.
@njit(cache=True)
def five(a,b,c,d,e):
    cards = [a,b,c,d,e]
    rs = sorted([v//4+2 for v in cards], reverse=True)
    flush = a%4==b%4 and a%4==c%4 and a%4==d%4 and a%4==e%4
    unique = sorted(set(rs), reverse=True)
    run = 0
    if len(unique)==5:
        if rs[0]-rs[4]==4: run=rs[0]
        elif rs==[14,5,4,3,2]: run=5
    groups = sorted([(rs.count(r),r) for r in unique], reverse=True)
    category, keys = 0, rs
    if flush and run: category,keys=8,[run]
    elif groups[0][0]==4: category,keys=7,[groups[0][1],groups[1][1]]
    elif groups[0][0]==3 and groups[1][0]==2: category,keys=6,[groups[0][1],groups[1][1]]
    elif flush: category=5
    elif run: category,keys=4,[run]
    elif groups[0][0]==3: category,keys=3,[g[1] for g in groups]
    elif groups[0][0]==2 and groups[1][0]==2: category,keys=2,[g[1] for g in groups]
    elif groups[0][0]==2: category,keys=1,[g[1] for g in groups]
    value=category
    for i in range(5): value=15*value+(keys[i] if i<len(keys) else 0)
    return value

@njit(cache=True)
def oracle(cards):
    best=0
    for a in range(3):
        for b in range(a+1,4):
            for c in range(b+1,5):
                for d in range(c+1,6):
                    for e in range(d+1,7):
                        best=max(best,five(cards[a],cards[b],cards[c],cards[d],cards[e]))
    return best

@njit(cache=True)
def enumerate_deal(hole, independent=False, limit=1712304):
    deck=[c for c in range(52) if c not in hole]
    h=np.zeros(7,np.int64); v=np.zeros(7,np.int64)
    h[0],h[1]=hole[0],hole[1];v[0],v[1]=hole[2],hole[3]
    wins,ties,total=0,0,0
    for a in range(44):
        for b in range(a+1,45):
            for c in range(b+1,46):
                for d in range(c+1,47):
                    for e in range(d+1,48):
                        h[2],h[3],h[4],h[5],h[6]=deck[a],deck[b],deck[c],deck[d],deck[e]
                        v[2:]=h[2:]
                        x=oracle(h) if independent else seven(h)
                        y=oracle(v) if independent else seven(v)
                        wins+=int(x>y);ties+=int(x==y);total+=1
                        if total>=limit:return wins,ties,total
    return wins,ties,total

def main():
    mode=sys.argv[1]
    combos=[(a,b) for a,b in itertools.combinations(range(52),2) if
            (a//4==b//4==10) or (a//4==11 and b//4==12 and a%4!=b%4) or
            (a//4==3 and b//4==12 and a%4==b%4) or (a//4==4 and b//4==5 and a%4==b%4)]
    keys=sorted({canonical(a,b)[0] for a in combos for b in combos if not set(a)&set(b)})
    result={"method":"EXHAUSTIVE_C_48_5", "combos":[[text(c) for c in h] for h in combos],"matchups":[]}
    start=time.perf_counter()
    for i,key in enumerate(keys):
        t=time.perf_counter()
        win,tie,total=enumerate_deal(np.array(key),mode=='verify',10000 if mode=='benchmark' else 1712304)
        result['matchups'].append({"cards":[text(c) for c in key],"wins":win,"ties":tie,"total":total})
        print(json.dumps({"done":i+1,"of":len(keys),"seconds":round(time.perf_counter()-t,2)}),file=sys.stderr,flush=True)
        if mode=='benchmark':break
    result['runtimeSeconds']=time.perf_counter()-start
    with open(sys.argv[2],'w') as f:json.dump(result,f,sort_keys=True)

if __name__=='__main__':main()


