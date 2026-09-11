'use client';
import { useState } from 'react';
import { studySizes } from '@/domain/study';
import type { NlheConfig } from '@/shared/nlhe';
export function PreflopSizing({config,onChange}:{config:NlheConfig;onChange:(change:Partial<NlheConfig>)=>void}){
  const [advanced,setAdvanced]=useState(false);
  const opener=config.scenario==='vs-open'?config.villain??'BTN':config.hero;
  const suggested=studySizes(config.stackBb,opener),open=config.openBb??(opener==='SB'?3:2.5);
  return <section className="nlhe-controls panel" aria-label="Preflop-Sizings"><label>Modus<select aria-label="Modus" value={advanced?'advanced':'simple'} onChange={e=>setAdvanced(e.target.value==='advanced')}><option value="simple">Simple</option><option value="advanced">Advanced</option></select></label><label>Open Size<select aria-label="Open Size" value={open} onChange={e=>onChange({openBb:Number(e.target.value),threeBetBb:undefined,fourBetBb:undefined})}>{[...new Set([...(advanced?[2,2.1,2.2,2.25,2.3,2.5,3]:suggested.opens),open])].sort((a,b)=>a-b).map(size=><option key={size} value={size}>{size} BB</option>)}</select></label>{advanced?<><label>3-Bet Size<input aria-label="3-Bet Size" type="number" min="2" max={config.stackBb} step="0.1" defaultValue={config.threeBetBb??Math.min(config.stackBb,open*4)} key={`three-${config.stackBb}-${open}`} onBlur={e=>onChange({openBb:open,threeBetBb:Number(e.target.value)})}/></label><label>4-Bet Size<input aria-label="4-Bet Size" type="number" min="2" max={config.stackBb} step="0.1" defaultValue={config.fourBetBb??Math.min(config.stackBb,(config.threeBetBb??open*4)*2.2)} key={`four-${config.stackBb}-${open}`} onBlur={e=>onChange({openBb:open,fourBetBb:Number(e.target.value)})}/></label></>:null}<p>Recommended Study Size: {suggested.recommended} BB. Pädagogische Lernannahme; keine Solver-Empfehlung.</p></section>;
}
