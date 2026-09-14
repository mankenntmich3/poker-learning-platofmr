import { randomUUID } from 'node:crypto';
import { allCombos } from '@/domain/cards';
import { defaultTournamentContext, positionsFor } from '@/domain/strategy-context';
import { parameterChecksum, solutionChecksum, type VerifiedSolutionArtifact, type SolverAction } from '@/solver/verified-solution';

export const TEST_TREE_SHA = '1'.repeat(64);
/** Synthetic all-fold data: schema/adversarial tests only, NEVER a poker solution. */
export function untrustedSolution():VerifiedSolutionArtifact {
  const context=defaultTournamentContext(), modelId='unapproved-fixture';
  const actions:SolverAction[]=[{id:'fold',type:'FOLD'},{id:'raise-2',type:'RAISE',toBb:2},{id:'jam',type:'JAM'}];
  const unsigned:Omit<VerifiedSolutionArtifact,'checksum'>={
    schemaVersion:2,id:'untrusted-'+randomUUID(),sourceType:'VERIFIED_SOLVER',status:'PENDING_VALIDATION',context,modelId,
    positions:[...positionsFor(8)],actions,
    strategies:allCombos().map(combo=>({combo:[...combo],reach:1,actions:actions.map(a=>({actionId:a.id,frequency:a.id==='fold'?1:0}))})),
    fullProfile:{'fixture-root':{fold:1,'raise-2':0,jam:0}},
    solver:{name:'UNTRUSTED TEST GENERATOR',version:'1',algorithm:'no solver',buildSha256:'2'.repeat(64)},
    bettingTree:{id:'fixture',description:'No NLHE solution',definitionSha256:TEST_TREE_SHA,allowedActions:actions},
    convergence:{metric:'NASH_CONV',value:0,threshold:1e9,unit:'BB_PER_HAND',passed:true},
    iterations:1,runtimeMs:0,abstraction:{card:'none',action:'fixture',chance:'none'},
    generatedAt:'2026-09-12T00:00:00.000Z',source:'Synthetic adversarial input',license:'No dataset license approval',
    provenance:{datasetId:'fixture',revision:'1',origin:'ORIGINAL_COMPUTATION',sourceSha256:'3'.repeat(64),
      licenseEvidenceSha256:'4'.repeat(64),parametersSha256:parameterChecksum(context,modelId,TEST_TREE_SHA)},
  };
  return {...unsigned,checksum:solutionChecksum(unsigned)};
}
export function resign(a:VerifiedSolutionArtifact) {
  const {checksum,...unsigned}=a; void checksum;
  a.checksum=solutionChecksum(unsigned);
  return a;
}
