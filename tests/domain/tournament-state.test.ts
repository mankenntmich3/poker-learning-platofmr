import {describe,it,expect} from 'vitest';
import {canonicalStrategyContext,defaultTournamentContext,seatRoles,validateStrategyContext,type StrategyContext,type PublicEvent} from '@/domain/strategy-context';
import {initialTournamentState,applyPublicAction,applyPublicEvent,replayPublicHistory} from '@/domain/tournament-state';
import {exactContextKey} from '@/server/solution-registry';
import {TEST_TREE_SHA} from '../fixtures/untrusted-solution';

describe('MTT public replay and exact identity',()=>{
  it.each([2,3,4,5,6,7,8,9])('%i seats post one SB, BB and BBA without reducing stacks',players=>{
    const c=defaultTournamentContext(players),s=initialTournamentState(c);
    expect(s.pot).toBe(25000);
    expect(s.seats.filter(p=>p.streetCommitted===5000)).toHaveLength(1);
    expect(s.seats.filter(p=>p.ante===10000).map(p=>p.position)).toEqual(['BB']);
    expect(s.seats.reduce((n,p)=>n+p.remaining,0)+s.pot).toBe(players*150000);
    expect(()=>validateStrategyContext(c)).not.toThrow();
  });
  it('posts custom ante payers and handles a short BB according to the explicit order',()=>{
    const c=defaultTournamentContext(2);c.stacks[1].stackBb=1.5;
    expect(initialTournamentState(c).seats[1]).toMatchObject({streetCommitted:10000,ante:5000,remaining:0});
    c.postingOrder='ANTES_FIRST';
    expect(initialTournamentState(c).seats[1]).toMatchObject({streetCommitted:5000,ante:10000,remaining:0});
    c.ante={type:'CUSTOM',payments:[{position:'BTN',amountBb:.2},{position:'BB',amountBb:.3}]};
    expect(initialTournamentState(c).pot).toBe(20000);
    expect(()=>canonicalStrategyContext({...c,ante:{type:'CUSTOM',amountBb:1}})).toThrow();
  });
  it('models BTN/SB heads-up, then BB acts first after a legal flop deal',()=>{
    const c=defaultTournamentContext(2); let s=initialTournamentState(c);
    expect(seatRoles(2,'BTN')).toEqual({button:true,smallBlind:true,bigBlind:false});
    expect(s.actor).toBe('BTN');
    s=applyPublicAction(s,{actor:'BTN',type:'LIMP'});
    s=applyPublicAction(s,{actor:'BB',type:'CHECK'});
    expect(s.roundClosed).toBe(true);
    s=applyPublicEvent(s,{type:'DEAL',cards:['As','7d','2c']});
    expect(s.actor).toBe('BB');expect(s.pot).toBe(30000);
  });
  it('does not invent an uncallable wager against a BB all-in below the small blind',()=>{
    const c=defaultTournamentContext(2);c.stacks[1].stackBb=.2;
    const s=initialTournamentState(c);
    expect(s.actor).toBeNull();expect(s.roundClosed).toBe(true);expect(s.pot).toBe(7000);
    c.stacks[1].stackBb=.8;
    const facing=initialTournamentState(c);
    expect(facing.actor).toBe('BTN');expect(facing.currentBet).toBe(8000);
    expect(applyPublicAction(facing,{actor:'BTN',type:'CALL'}).pot).toBe(16000);
  });
  it('replays all streets and rejects out-of-turn, early dealing, board mismatch and actions after fold',()=>{
    const c=defaultTournamentContext(2);
    const history:PublicEvent[]=[
      {actor:'BTN',type:'LIMP'},{actor:'BB',type:'CHECK'},{type:'DEAL',cards:['As','7d','2c']},
      {actor:'BB',type:'CHECK'},{actor:'BTN',type:'CHECK'},{type:'DEAL',cards:['Kh']},
      {actor:'BB',type:'CHECK'},{actor:'BTN',type:'CHECK'},{type:'DEAL',cards:['Tc']},
    ];
    const full={...c,hero:'BB' as const,actionHistory:history,board:['As','7d','2c','Kh','Tc'] as StrategyContext['board']};
    expect(canonicalStrategyContext(full).board).toEqual(['2c','7d','As','Kh','Tc']);
    expect(replayPublicHistory(full).street).toBe('river');
    expect(()=>canonicalStrategyContext({...c,actionHistory:[{actor:'BB',type:'CHECK'}]})).toThrow(/out of turn/);
    expect(()=>canonicalStrategyContext({...c,actionHistory:[{type:'DEAL',cards:['As','7d','2c']}]})).toThrow(/street closure/);
    expect(()=>canonicalStrategyContext({...full,board:['As','7d','2c','Kh','9c']})).toThrow(/Board does not match/);
    expect(()=>canonicalStrategyContext({...c,actionHistory:[{actor:'BTN',type:'FOLD'},{actor:'BB',type:'CHECK'}]})).toThrow(/out of turn/);
    expect(()=>canonicalStrategyContext({...full,actionHistory:history.slice(0,-1)})).toThrow(/Board does not match/);
  });
  it('preserves flop-set identity and turn/river order separately',()=>{
    const c=defaultTournamentContext(2);
    c.hero='BB';c.actionHistory=[{actor:'BTN',type:'LIMP'},{actor:'BB',type:'CHECK'},{type:'DEAL',cards:['As','7d','2c']}];c.board=['As','7d','2c'];
    const d=structuredClone(c);d.board.reverse();d.actionHistory[2]={type:'DEAL',cards:['2c','As','7d']};
    expect(exactContextKey(c,TEST_TREE_SHA)).toBe(exactContextKey(d,TEST_TREE_SHA));
    expect(()=>canonicalStrategyContext({...c,board:['As','As','2c']})).toThrow();
    expect(()=>canonicalStrategyContext({...c,deadCards:['As']})).toThrow();
  });
  it('does not reopen a prior raise after a short all-in, but permits a call',()=>{
    const c=defaultTournamentContext(3,20);c.stacks[1].stackBb=3;
    let s=initialTournamentState(c);
    s=applyPublicAction(s,{actor:'BTN',type:'RAISE',toBb:2.5});
    s=applyPublicAction(s,{actor:'SB',type:'JAM'});
    s=applyPublicAction(s,{actor:'BB',type:'CALL'});
    expect(()=>applyPublicAction(s,{actor:'BTN',type:'RAISE',toBb:5})).toThrow(/not reopened/);
    expect(applyPublicAction(s,{actor:'BTN',type:'CALL'}).roundClosed).toBe(true);
  });
  it('reopens after cumulative short raises and conserves unequal multiway commitments',()=>{
    const c=defaultTournamentContext(4,100);c.stacks[1].stackBb=3.5;c.stacks[2].stackBb=4;
    let s=initialTournamentState(c);
    s=applyPublicAction(s,{actor:'CO',type:'RAISE',toBb:2.5});
    s=applyPublicAction(s,{actor:'BTN',type:'JAM'});
    s=applyPublicAction(s,{actor:'SB',type:'JAM'});
    s=applyPublicAction(s,{actor:'BB',type:'CALL'});
    expect(()=>applyPublicAction(s,{actor:'CO',type:'RAISE',toBb:6})).not.toThrow();
    expect(s.seats.map(p=>p.remaining)).toEqual([975000,0,0,950000]);
  });
  it('keys future rake and structured tournament state but refuses unsupported solving',()=>{
    const cash={...defaultTournamentContext(),gameType:'CASH' as const,ante:{type:'NONE' as const,amountBb:0 as const}};
    const raked={...cash,rake:{type:'PERCENTAGE' as const,ruleVersion:'example-v1',rate:.05,capBb:3,noFlopNoDrop:true,minPlayersDealt:2,rounding:'FLOOR' as const}};
    expect(exactContextKey(cash,TEST_TREE_SHA)).not.toBe(exactContextKey(raked,TEST_TREE_SHA));
    expect(()=>validateStrategyContext(raked)).toThrow(/Raked Cash/);
    const c=defaultTournamentContext(2), tournament={
      version:1 as const,playersRemaining:3,stage:'BUBBLE' as const,chipUnitBb:.01,currency:'EUR',
      allStacks:[{playerId:'a',chips:1500},{playerId:'b',chips:1500},{playerId:'c',chips:3000}],
      tableSeats:[{position:'BTN' as const,playerId:'a'},{position:'BB' as const,playerId:'b'}],payoutsMinor:[10000,6000,0],
    };
    const icm={...c,evaluationModel:'ICM' as const,evaluation:{model:'ICM' as const,tournament}};
    expect(()=>canonicalStrategyContext(icm)).not.toThrow();
    expect(()=>validateStrategyContext(icm)).toThrow(/Only ChipEV/);
    const changed=structuredClone(icm);changed.evaluation.tournament.allStacks[2].chips=4000;
    expect(exactContextKey(icm,TEST_TREE_SHA)).not.toBe(exactContextKey(changed,TEST_TREE_SHA));
    changed.evaluation.tournament.allStacks[0].chips=1600;
    expect(()=>canonicalStrategyContext(changed)).toThrow(/stacks disagree/);
    const pko={...c,evaluationModel:'PKO' as const,evaluation:{model:'PKO' as const,tournament,bounty:{version:1 as const,startingBountyMinor:100,progressiveShare:.5,cashValues:[{playerId:'a',bountyMinor:200},{playerId:'b',bountyMinor:100},{playerId:'c',bountyMinor:500}]}}};
    expect(()=>canonicalStrategyContext(pko)).not.toThrow();
    expect(exactContextKey(pko,TEST_TREE_SHA)).not.toBe(exactContextKey(icm,TEST_TREE_SHA));
  });
});
