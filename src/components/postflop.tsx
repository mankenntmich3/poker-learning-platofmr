'use client';
import { useState } from 'react';
import { combosForClass } from '@/domain/cards';
import { configSearch, POSTFLOP_CONFIG, type NlheNode } from '@/shared/nlhe';
import { SessionGate } from './auth-screen';
import { useResource } from './study-context';
import { ActionLink, ErrorNotice, LoadingPanel, number, PageHeader } from './ui';
import { Frequencies, HandMatrix, HoldemCards, RangeProvenance } from './nlhe-ui';

export function Postflop() { return <SessionGate><PostflopContent /></SessionGate>; }
function PostflopContent() {
  const range = useResource<NlheNode>(`/api/nlhe/range?${configSearch(POSTFLOP_CONFIG)}`);
  const defense = useResource<NlheNode>(`/api/nlhe/range?${configSearch({ ...POSTFLOP_CONFIG, hero: 'BB', villain: 'BTN', scenario: 'vs-open' })}`);
  const [selected, setSelected] = useState('AKs'); const [comboIndex, setComboIndex] = useState(0);
  if (range.loading || defense.loading) return <LoadingPanel label="Flop und Lernranges werden geladen…" />;
  if (range.error || defense.error || !range.data || !defense.data) return <ErrorNotice message={range.error || defense.error || 'Der Lernspot ist nicht verfügbar.'} retry={() => { range.reload(); defense.reload(); }} />;
  const node = range.data; const hand = node.classes.find(row => row.handClass === selected)!;
  const combos = combosForClass(selected, node.board); const cards = combos[Math.min(comboIndex, combos.length - 1)];
  const villain = defense.data.classes.map(row => ({ handClass: row.handClass, combos: combosForClass(row.handClass, [...node.board, ...cards]).length, weight: row.actions.find(a => a.action === 'call')!.frequency })).filter(row => row.combos && row.weight);
  return <><PageHeader title="Ein Flop. Eine klare Lernfrage." description="NLHE · 6-max Cash · 100 BB · BTN gegen BB · Single Raised Pot" />
    <RangeProvenance provenance={node.provenance} />
    <section className="postflop-brief panel"><div><span className="lesson-tag">Fester Lernspot · A-high, rainbow</span><h2>Wie oft setzt du nach dem Check?</h2><p>{node.context}</p><p>Wähle unten eine Starthand für den Strategievergleich. Der Trainer zieht anschließend zufällige Hände aus derselben BTN-Opening-Range, mit diesem Flop und genau diesen Aktionen.</p><ActionLink href={`/trainer?${configSearch(POSTFLOP_CONFIG)}`}>Diesen Flop trainieren</ActionLink></div><div className="postflop-board"><HoldemCards cards={node.board} /><p>Pot {number(node.potBb, 1)} BB · BB checkt</p></div></section>
    <div className="nlhe-study-layout"><section aria-label="BTN-Flop-Range"><div className="nlhe-legend">{node.actions.map(action => <span key={action.id}><i className={`action-dot action-${action.id}`} />{action.label}</span>)}</div><HandMatrix rows={node.classes} selected={selected} onSelect={hand => { setSelected(hand); setComboIndex(0); }} /><p className="matrix-help">Der Flop entfernt drei Karten: 1.176 mögliche Kombinationen bleiben. Nur Hände aus der BTN-Opening-Range werden trainiert. Das Modell unterscheidet hier Handstärke, aber keine Backdoor-Draws.</p></section>
    <aside className="nlhe-hand-detail panel" aria-label="Flop-Handdetails"><div className="selected-hand-title"><h2>{selected}</h2><span>{combos.length} Combos</span></div><HoldemCards cards={cards} /><label className="postflop-combo">Deine konkrete Hand<select aria-label="Deine konkrete Hand" value={comboIndex} onChange={event => setComboIndex(Number(event.target.value))}>{combos.map((combo, index) => <option key={combo.join('')} value={index}>{combo.join(' · ')}</option>)}</select></label>{hand.reach ? <><Frequencies frequencies={hand.actions} actions={node.actions} /><p>Die vorherige BTN-Range eröffnet diese Hand zu {number(hand.reach * 100)} %. Diese groben Check/Bet-Frequenzen gelten nur für dieses Board.</p></> : <p>Diese Hand erreicht den Flop in der vorherigen BTN-Opening-Range nicht und wird nicht trainiert.</p>}<p>EV-Verlust: nicht verfügbar. Keine echte Postflop-Solution vorhanden.</p></aside></div>
    <details className="nlhe-villain-range" open><summary>BB-Calling-Range · Flop und deine Karten sind entfernt</summary><p>Gewichte aus der approximierten BB-vs-BTN-Preflop-Range. Der Check verengt die Range in diesem Modell nicht weiter. Deine konkrete Hand verändert die verbleibenden Kombinationen.</p><div>{villain.map(row => <span key={row.handClass}>{row.handClass} · {row.combos} Combos × {number(row.weight * 100)} %</span>)}</div></details>
    <section className="nlhe-related"><h2>Die Vorgeschichte studieren</h2><div><ActionLink secondary href={`/ranges?${configSearch({ ...POSTFLOP_CONFIG, scenario: 'rfi', villain: null })}`}>BTN Opening-Range</ActionLink><ActionLink secondary href={`/ranges?${configSearch({ ...POSTFLOP_CONFIG, scenario: 'vs-open', hero: 'BB', villain: 'BTN' })}`}>BB gegen BTN-Open</ActionLink></div></section></>;
}
