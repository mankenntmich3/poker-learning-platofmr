"""Analytic information-set calibration of the new numeric hot loop and BR."""
import unittest
import itertools
import numpy as np
from preflop_v2_kernel import arrays,train,hand_class,seven
from preflop_v2_verify import evaluate
from preflop_v2_sparse import solve
from preflop_v2_operator_verify import verify

class Calibration(unittest.TestCase):
    def setUp(self):
        # Each private type sees the same 3:1 hidden outcome law. BR must not
        # select an action separately for the hidden outcomes (+1 would be cheating).
        self.model={'nodes':[
            {'actor':0,'street':0,'edges':[1,2],'payoff':[]},
            {'actor':-1,'street':0,'edges':[],'payoff':[-1,0,1]},
            {'actor':-1,'street':0,'edges':[],'payoff':[1,0,-1]}]}
        self.data=np.array([[i,i,i*54+outcome,i*54+outcome,outcome] for i in range(169) for outcome in [0,2,2,2]],np.int16)
    def test_independent_best_response_preserves_hidden_information(self):
        result,_=evaluate(self.model,self.data,np.full(338,.5))
        self.assertAlmostEqual(result['profileValues'][0],0)
        self.assertAlmostEqual(result['bestResponses'][0],.5)
        self.assertAlmostEqual(result['nashConv'],.5)
        self.assertFalse(result['publicationEligible'])
        operator=verify(self.model,self.data,np.full(338,.5))
        self.assertAlmostEqual(operator['nashConv'],result['nashConv'])
    def test_solver_algorithms_recover_analytic_optimum(self):
        a=arrays(self.model)
        for algorithm in [0,1,2]:
            policy,_,_,_=train(self.data,*a,2000,len(self.data),13,algorithm,0,np.zeros((1,1)),np.full(3,-1,np.int32),True)
            result,_=evaluate(self.model,self.data,policy)
            self.assertGreater(result['profileValues'][0],.49)
            self.assertLess(result['nashConv'],.01)
    def test_invalid_profile_rejected(self):
        for p in [np.zeros(338),np.full(338,np.nan),np.full(338,-.5)]:
            with self.assertRaises(ValueError):evaluate(self.model,self.data,p)
    def test_sparse_chance_operator_matches_full_world_updates_without_future_leak(self):
        expected=train(self.data,*arrays(self.model),5,len(self.data),13,1,0,np.zeros((1,1)),np.full(3,-1,np.int32),True)[0]
        actual,_=solve(self.model,self.data,5,1)
        np.testing.assert_allclose(actual,expected,atol=1e-12,rtol=0)
        result,_=evaluate(self.model,self.data,actual)
        self.assertLessEqual(result['profileValues'][0],.5+1e-12)
    def test_global_suit_closure_preserves_all_stored_observations(self):
        hole=[48,45];board=[40,36,1,14,31]
        def observation(h,b):
            texture=(len(set(c//4 for c in b[:3]))<3)*3+len(set(c%4 for c in b[:3]))-1
            return hand_class(*h),texture,seven(np.asarray(h+b[:3]))//759375,seven(np.asarray(h+b))
        expected=observation(hole,board)
        for permutation in itertools.permutations(range(4)):
            rename=lambda c:(c//4)*4+permutation[c%4]
            self.assertEqual(observation(list(map(rename,hole)),list(map(rename,board))),expected)
        counts=np.bincount([hand_class(a,b) for a,b in itertools.combinations(range(52),2)],minlength=169)
        self.assertEqual(counts.sum(),1326)
        for i in range(13):
            for j in range(13):self.assertEqual(counts[i*13+j],6 if i==j else 4 if i<j else 12)
    def test_streamed_chance_mixture_matches_full_world_reference(self):
        other=self.data.copy();other[:,4]=2-other[:,4]
        profile=np.full(338,.5)
        full,_=evaluate(self.model,np.concatenate([self.data,other]),profile)
        streamed=verify(self.model,iter([self.data,other]),profile)
        self.assertAlmostEqual(full['nashConv'],streamed['nashConv'])
        first,_=solve(self.model,np.concatenate([self.data,other]),5)
        second,_=solve(self.model,iter([self.data,other]),5)
        np.testing.assert_allclose(first,second,atol=1e-12,rtol=0)

if __name__=='__main__':unittest.main()
