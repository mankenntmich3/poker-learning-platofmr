'use client';
import { useRef } from 'react';
import type { Card } from '@/domain/cards';
import type { NlheActionInfo, NlheClassStrategy, NlheFrequency, NlheProvenance } from '@/shared/nlhe';
import { number } from './ui';
const symbols = { s: '♠', h: '♥', d: '♦', c: '♣' };
export function HoldemCards({ cards, small = false }: { cards: readonly Card[]; small?: boolean }) {
  return <div role="img" className={`nlhe-cards${small ? ' nlhe-cards-small' : ''}`} aria-label={cards.map(c => `${c[0]}${symbols[c[1] as keyof typeof symbols]}`).join(' ')}>{cards.map(card => <span className={`nlhe-card ${card[1] === 'h' || card[1] === 'd' ? 'red-card' : ''}`} key={card} aria-hidden="true"><b>{card[0]}</b><span>{symbols[card[1] as keyof typeof symbols]}</span></span>)}</div>;
}
export function RangeProvenance({ provenance, expanded = false }: { provenance: NlheProvenance; expanded?: boolean }) {
  return <details className="nlhe-provenance" open={expanded || undefined}><summary><strong>{provenance.sourceType}</strong><span>Lernrange · keine validierte GTO-Solution</span></summary><div><p>Grobe Lernregeln in 25-%-Schritten. Keine gemessene Solver-Genauigkeit und keine EV-Werte.</p><ul>{provenance.assumptions.map(text => <li key={text}>{text}</li>)}</ul><p>{provenance.limitations.join(' ')}</p><dl><dt>Methode</dt><dd>{provenance.method}</dd><dt>Version</dt><dd>{provenance.solutionVersion}</dd><dt>Solver / Genauigkeit</dt><dd>Kein Solver · nicht gemessen</dd><dt>Datenherkunft</dt><dd>{provenance.license}</dd></dl></div></details>;
}
export function Frequencies({ frequencies, actions }: { frequencies: NlheFrequency[]; actions: NlheActionInfo[] }) {
  return <div className="nlhe-frequencies">{actions.map(action => { const frequency = frequencies.find(f => f.action === action.id)?.frequency ?? 0; return <div key={action.id}><div><span><i className={`action-dot action-${action.id}`} />{action.label}</span><strong>{number(frequency * 100)} %</strong></div><div className="frequency-track"><span className={`action-${action.id}`} style={{ width: `${frequency * 100}%` }} /></div></div>; })}</div>;
}
export function HandMatrix({ rows, selected, onSelect }: { rows: NlheClassStrategy[]; selected: string; onSelect: (hand: string) => void }) {
  const grid = useRef<HTMLDivElement>(null);
  function move(index: number, key: string): boolean {
    let next: number;
    if (key === 'ArrowRight') next = Math.min(168, index + 1); else if (key === 'ArrowLeft') next = Math.max(0, index - 1);
    else if (key === 'ArrowDown') next = Math.min(168, index + 13); else if (key === 'ArrowUp') next = Math.max(0, index - 13);
    else if (key === 'Home') next = Math.floor(index / 13) * 13; else if (key === 'End') next = Math.floor(index / 13) * 13 + 12; else return false;
    onSelect(rows[next].handClass); grid.current?.querySelectorAll<HTMLButtonElement>('[role="gridcell"]')[next]?.focus(); return true;
  }
  return <div className="nlhe-matrix-scroll" role="region" aria-label="Hold’em-Handmatrix, horizontal scrollbar"><div className="nlhe-matrix" role="grid" aria-label="169 Hold’em-Starthände" ref={grid}>{Array.from({ length: 13 }, (_, rowIndex) => <div role="row" key={rowIndex}>{rows.slice(rowIndex * 13, rowIndex * 13 + 13).map((row, col) => <button type="button" role="gridcell" aria-selected={selected === row.handClass} tabIndex={selected === row.handClass ? 0 : -1} key={row.handClass} data-hand={row.handClass} className={`nlhe-cell${row.reach === 0 ? ' unreachable-hand' : ''}`} aria-label={`${row.handClass}: ${row.reach ? row.actions.map(a => `${a.action} ${number(a.frequency * 100)} Prozent`).join(', ') : 'nicht in der vorherigen Range'}`} onClick={() => onSelect(row.handClass)} onKeyDown={event => { if (move(rowIndex * 13 + col, event.key)) event.preventDefault(); }}><span className="cell-mixture" aria-hidden="true">{row.actions.map(action => <i key={action.action} className={`action-${action.action}`} style={{ width: `${action.frequency * 100}%` }} />)}</span><span>{row.handClass}</span>{row.reach > 0 && row.reach < 1 ? <small>{number(row.reach * 100)}%</small> : null}</button>)}</div>)}</div></div>;
}
