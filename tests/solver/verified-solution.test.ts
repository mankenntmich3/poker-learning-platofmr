import { describe, expect, it } from 'vitest';
import { parameterChecksum, validateSolutionStructure } from '@/solver/verified-solution';
import { allCombos } from '@/domain/cards';
import { defaultTournamentContext } from '@/domain/strategy-context';
import { mayTrainAsGto, verifyForPublication } from '@/server/verify-solution';
import { resign, untrustedSolution } from '../fixtures/untrusted-solution';

describe('independent publication trust boundary',()=>{
  it('distinguishes complete structure from mathematical verification',()=>{
    const a=untrustedSolution();
    expect(validateSolutionStructure(a).status).toBe('STRUCTURALLY_VALID');
    expect(verifyForPublication(a)).toMatchObject({status:'FAILED_VALIDATION',quality:null,policyVersion:'rangeform-verification-v3-preflop1'});
    expect(mayTrainAsGto(a)).toBe(false);
  });
  it('ignores self-reported zero exploitability, loose thresholds and a forged VERIFIED flag',()=>{
    const a=untrustedSolution();a.status='VERIFIED';a.exploitabilityBbPerHand=0;a.convergence.threshold=1e12;
    expect(mayTrainAsGto(resign(a))).toBe(false);
    expect(verifyForPublication({...a,verificationReport:{nashConv:0,passed:true}}).status).toBe('FAILED_VALIDATION');
  });
  it('requires all 1326 preflop combos, including zero-reach hands',()=>{
    const a=untrustedSolution();a.strategies[0].reach=0;
    expect(validateSolutionStructure(resign(a)).status).toBe('STRUCTURALLY_VALID');
    a.strategies.pop();
    expect(validateSolutionStructure(resign(a)).errors.join(' ')).toContain('Incomplete expected physical-combo coverage');
    a.strategies=[];
    expect(validateSolutionStructure(resign(a)).status).toBe('FAILED_VALIDATION');
  });
  it('detects reversed duplicate combos, invalid frequencies and stale checksums',()=>{
    const a=untrustedSolution();a.strategies[1].combo=[...a.strategies[0].combo].reverse() as [string,string];
    expect(validateSolutionStructure(resign(a)).errors).toContain('Duplicate physical combo.');
    a.strategies[2].actions[0].frequency=.5;
    const result=validateSolutionStructure(a);
    expect(result.errors).toContain('Every supported combo must contain one normalized frequency per action; unsupported rows may explicitly omit strategy.');
    expect(result.errors).toContain('Checksum mismatch.');
  });
  it('rejects illegal node actions and incomplete public replay',()=>{
    const a=untrustedSolution();a.actions[1]={id:'raise-2',type:'RAISE',toBb:1.1};a.bettingTree.allowedActions=a.actions;
    expect(validateSolutionStructure(resign(a)).errors.join(' ')).toContain('Illegal raise');
    a.context.actionHistory=[];
    expect(validateSolutionStructure(resign(a)).errors.join(' ')).toContain('Hero must be the actor');
  });
  it('requires imports to carry immutable source, parameters and server-approved license evidence',()=>{
    const a=untrustedSolution();a.sourceType='IMPORTED_VERIFIED';a.provenance.origin='LICENSED_IMPORT';
    expect(validateSolutionStructure(resign(a)).status).toBe('STRUCTURALLY_VALID');
    expect(verifyForPublication(a).errors.join(' ')).toContain('No server-approved license/provenance');
    a.provenance.parametersSha256='0'.repeat(64);
    expect(validateSolutionStructure(resign(a)).errors).toContain('Provenance parameter identity mismatch.');
  });
  it('derives postflop coverage from the replayed board and known dead cards',()=>{
    const a=untrustedSolution(),c=defaultTournamentContext(2);
    c.hero='BB';c.actionHistory=[{actor:'BTN',type:'LIMP'},{actor:'BB',type:'CHECK'},{type:'DEAL',cards:['As','7d','2c']}];
    c.board=['As','7d','2c'];c.deadCards=['Kh'];
    a.context=c;a.positions=['BTN','BB'];a.actions=[{id:'check',type:'CHECK'},{id:'bet',type:'RAISE',toBb:1}];a.bettingTree.allowedActions=a.actions;
    a.fullProfile={flop:{check:1,bet:0}};
    a.provenance.parametersSha256=parameterChecksum(c,a.modelId,a.bettingTree.definitionSha256);
    a.strategies=allCombos([...c.board,...c.deadCards]).map(combo=>({combo:[...combo],reach:1,actions:[{actionId:'check',frequency:1},{actionId:'bet',frequency:0}]}));
    expect(a.strategies).toHaveLength(1128);
    expect(validateSolutionStructure(resign(a)).status).toBe('STRUCTURALLY_VALID');
    a.strategies[0].combo=['As','Ks'];
    expect(validateSolutionStructure(resign(a)).errors).toContain('Blocked or invalid combo.');
  });
  it.each([null,{},[],{schemaVersion:1},{schemaVersion:2,context:{players:99}}])('fails closed for malformed runtime data: %j',input=>{
    expect(()=>verifyForPublication(input)).not.toThrow();
    expect(mayTrainAsGto(input)).toBe(false);
  });
});
