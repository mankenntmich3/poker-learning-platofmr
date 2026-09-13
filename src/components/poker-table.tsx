'use client';
import type { CSSProperties } from 'react';
import type { TournamentState } from '@/domain/tournament-state';
import type { StrategyContext } from '@/domain/strategy-context';
import type { VerifiedQuestion } from '@/shared/verified-training';
import { seatRoles } from '@/domain/positions';
import { HoldemCards } from './nlhe-ui';

const bb=(n:number)=>new Intl.NumberFormat('de-DE',{minimumFractionDigits:2,maximumFractionDigits:3}).format(n)+' BB';
/** Shared premium table. Seats come from the replayed state, never a fixed
 * six-seat template. HU uses one BTN/SB seat and one BB seat. */
export function PokerTable({state,context,question,names}:{state:TournamentState;context:StrategyContext;question:VerifiedQuestion;names:Record<string,string>}){
  const hero=context.hero,hi=state.seats.findIndex(s=>s.position===hero),positions=state.seats;
  const ante=context.ante.type==='BBA'?`BBA ${context.ante.amountBb}`:context.ante.type==='NONE'?'keine Ante':context.ante.type;
  return <section className="verified-table-wrap" aria-label="NLHE Trainingstisch"><div className={`verified-poker-table verified-seats-${positions.length}`}><div className="verified-felt"><span>{state.street==='preflop'?'Preflop':state.street==='river'?'River':state.street}</span>{state.board.length?<HoldemCards cards={state.board}/>:null}<strong>Pot {bb(state.pot/10000)}</strong><small>{positions.length}-handed · MTT ChipEV · {ante}</small></div>{positions.map((s,i)=>{
    const angle=(i-hi)/positions.length*2*Math.PI,roles=seatRoles(positions.length,s.position),last=[...context.actionHistory].reverse().find(e=>e.type!=='DEAL'&&e.actor===s.position),action=s.position===hero&&question.action?names[question.action]:last&&last.type!=='DEAL'?last.type.toLowerCase():'';
    return <div key={s.position} className={`verified-seat ${s.folded?'folded':''} ${s.position===hero?'hero':''} ${state.actor===s.position?'acting':''}`} style={{left:`${50+41*Math.sin(angle)}%`,top:`${50+39*Math.cos(angle)}%`} as CSSProperties}><span className="verified-seat-position">{s.position}{roles.smallBlind&&s.position==='BTN'?' / SB':''}{roles.button?<i className="verified-dealer" aria-label="Dealer Button">D</i>:null}</span><strong>{bb(s.remaining/10000)}</strong><span className={action.includes('Jam')?'verified-all-in':''}>{action.includes('Jam')?'ALL-IN':action || (roles.bigBlind?'Big Blind':roles.smallBlind?'Small Blind':'')}</span>{s.position===hero?<div className="verified-hole"><small>Deine Hand</small><HoldemCards cards={question.combo} small/></div>:!s.folded?<div className="verified-card-backs" role="img" aria-label="Zwei verdeckte Hole Cards"><i/><i/></div>:null}</div>;
  })}</div></section>;
}
