'use client';
import { useRef } from 'react';
import type { StudyClass } from '@/strategy/study-provider';
import { createDeck, type Card } from '@/domain/cards';
import { number } from './ui';
export const cardLabel=(card:Card)=>`${card[0]}${({s:'♠',h:'♥',d:'♦',c:'♣'})[card[1]]}`;
const actionColor=(id:string)=>id==='fold'?'#58667d':id==='check'?'#627faf':id==='call'?'#629886':id==='all-in'?'#c586b6':id.startsWith('raise')?'#bd8476':'#b49361';
export function CardPicker({blocked,onPick,onClose}:{blocked:Card[];onPick:(card:Card)=>void;onClose:()=>void}){
  return <section className="engine-picker" aria-label="52-Karten-Picker"><h3>Karte wählen</h3><div>{createDeck().map(card=><button key={card} aria-label={cardLabel(card)} disabled={blocked.includes(card)} className={card[1]==='h'||card[1]==='d'?'engine-red':''} onClick={()=>onPick(card)}>{cardLabel(card)}</button>)}</div><button className="text-button" onClick={onClose}>Kartenauswahl schließen</button></section>;
}
export function StudyMatrix({rows,selected,onSelect,label}:{rows:StudyClass[];selected:string;onSelect:(hand:string)=>void;label:string}){
  const ref=useRef<HTMLDivElement>(null);
  return <section className="engine-range"><h3>{label}</h3><div className="engine-grid" role="grid" aria-label={label} ref={ref}>{Array.from({length:13},(_,i)=><div role="row" key={i}>{rows.slice(i*13,i*13+13).map((row,j)=><button key={row.handClass} role="gridcell" tabIndex={selected===row.handClass?0:-1} aria-selected={selected===row.handClass} aria-label={`${row.handClass}, ${row.combos} Combos, Reach ${number(row.reach*100)} Prozent`} title={`${row.handClass}: ${row.combos} Combos, ${number(row.weightedCombos,2)} gewichtet, Reach ${number(row.reach*100)}%. ${row.actions.map(a=>`${a.action} ${number(a.frequency*100)}%`).join('; ')}`} onClick={()=>onSelect(row.handClass)} onKeyDown={event=>{const delta:Record<string,number>={ArrowRight:1,ArrowLeft:-1,ArrowDown:13,ArrowUp:-13};if(delta[event.key]){event.preventDefault();const index=Math.max(0,Math.min(168,i*13+j+delta[event.key]));onSelect(rows[index].handClass);ref.current?.querySelectorAll<HTMLButtonElement>('[role=gridcell]')[index]?.focus();}}} className={row.reach ? "" : "engine-unreachable"}><span className="engine-mixture" aria-hidden="true">{row.actions.length?row.actions.map(a=><i key={a.action} style={{width:`${a.frequency*100}%`,background:actionColor(a.action)}}/>):<i style={{width:`${row.reach*100}%`,background:'#627faf'}}/>}</span><span>{row.handClass}</span></button>)}</div>)}</div></section>;
}
