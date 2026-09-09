'use client';
import { useState } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import Link from 'next/link';
import { combosForClass } from '@/domain/cards';
import { SIX_MAX_POSITIONS, type Position } from '@/domain/chips';
import { configFromSearch, configSearch, DEFAULT_NLHE, possibleVillains, SCENARIO_LABELS, STACK_DEPTHS, spotLabel, validNlheConfig, type NlheConfig, type NlheNode, type NlheScenario } from '@/shared/nlhe';
import { SessionGate } from './auth-screen';
import { useResource } from './study-context';
import { ActionLink, ErrorNotice, LoadingPanel, number, PageHeader } from './ui';
import { Frequencies, HandMatrix, HoldemCards, RangeProvenance } from './nlhe-ui';
export function RangeExplorer() { return <SessionGate><RangeContent /></SessionGate>; }
function RangeContent() {
  const router = useRouter(); const search = useSearchParams();
  let config: NlheConfig; let configError = '';
  try { config = configFromSearch(new URLSearchParams(search.toString())); if (config.scenario === 'flop-srp') throw new Error('Nutze den Postflop-Lernspot.'); }
  catch (error) { config = DEFAULT_NLHE; configError = error instanceof Error ? error.message : 'Ungültiger Spot'; }
  const resource = useResource<NlheNode>(`/api/nlhe/range?${configSearch(config)}`, !configError);
  const [selected, setSelected] = useState('AKs'); const [custom, setCustom] = useState(false); const [inputError, setInputError] = useState('');
  function choose(change: Partial<NlheConfig>) {
    // Read the latest URL synchronously: successive controls must not reuse a pending navigation's old props.
    let current = config;
    try { current = configFromSearch(new URLSearchParams(window.location.search)); } catch { /* Recover from the displayed invalid URL. */ }
    const next = { ...current, ...change };
    setInputError('');
    if (next.scenario === 'rfi') { next.villain = null; if (next.hero === 'BB') { next.scenario = 'vs-open'; next.villain = 'BTN'; } }
    else { let opponents = possibleVillains(next); if (!opponents.length) { next.scenario = next.hero === 'UTG' ? 'rfi' : 'vs-open'; opponents = possibleVillains(next); } next.villain = opponents.includes(next.villain!) ? next.villain : opponents.at(-1) || null; }
    if (!validNlheConfig(next)) { setInputError('Wähle 10 bis 500 BB mit höchstens zwei Nachkommastellen.'); return; }
    // This page loads strategy through its API; a server-component navigation is unnecessary.
    window.history.replaceState(null, '', `/ranges?${configSearch(next)}`);
  }
  const node = resource.data; const hand = node?.classes.find(row => row.handClass === selected);
  const combos = hand ? combosForClass(hand.handClass, node!.board) : [];
  return <><PageHeader title="NLHE Preflop-Ranges" description="No-Limit Texas Hold’em · 6-max Cash" />
    <section className="nlhe-controls panel" aria-label="Preflop-Spot wählen"><label>Effektiver Stack<select aria-label="Effektiver Stack" value={STACK_DEPTHS.some(n => n === config.stackBb) ? config.stackBb : 'custom'} onChange={event => { if (event.target.value === 'custom') setCustom(true); else choose({ stackBb: Number(event.target.value) }); }}>{STACK_DEPTHS.map(stack => <option key={stack} value={stack}>{stack} BB</option>)}<option value="custom">Eigener Stack</option></select></label>
      <label>Deine Position<select aria-label="Deine Position" value={config.hero} onChange={event => choose({ hero: event.target.value as Position })}>{SIX_MAX_POSITIONS.map(position => <option key={position}>{position}</option>)}</select></label>
      <label>Vorgeschichte<select aria-label="Vorgeschichte" value={config.scenario} onChange={event => choose({ scenario: event.target.value as NlheScenario })}><option value="rfi" disabled={config.hero === 'BB'}>{SCENARIO_LABELS.rfi}</option><option value="vs-open" disabled={config.hero === 'UTG'}>{SCENARIO_LABELS['vs-open']}</option><option value="vs-3bet" disabled={config.hero === 'BB'}>{SCENARIO_LABELS['vs-3bet']}</option></select></label>
      {config.scenario !== 'rfi' ? <label>Gegnerposition<select aria-label="Gegnerposition" value={config.villain || ''} onChange={event => choose({ villain: event.target.value as Position })}>{possibleVillains(config).map(position => <option key={position}>{position}</option>)}</select></label> : <div className="nlhe-controls-note">RFI = Raise First In.<br />BB kann einen ungeöffneten Pot nicht mehr eröffnen.</div>}
      {custom ? <form className="custom-stack" onSubmit={event => { event.preventDefault(); const value = Number(new FormData(event.currentTarget).get('stack')); if (Number.isFinite(value)) choose({ stackBb: value }); }}><label>Eigener Stack in BB<input name="stack" type="number" min="10" max="500" step="0.01" defaultValue={config.stackBb} required /></label><button className="button button-secondary">Stack anwenden</button></form> : null}</section>
    {configError ? <ErrorNotice message={configError} retry={() => router.replace('/ranges')} /> : inputError ? <ErrorNotice message={inputError} /> : null}
    {resource.loading ? <LoadingPanel label="Genau diese NLHE-Range wird geladen…" /> : resource.error ? <ErrorNotice message={resource.error} retry={resource.reload} /> : node && hand ? <><RangeProvenance provenance={node.provenance} /><div className="nlhe-context"><h2>{spotLabel(node.config)}</h2><p>{node.context}</p><p>Pot {number(node.potBb, 1)} BB · bereits investiert {number(node.investedBb, 1)} BB · Rake 0</p></div>
      <div className="nlhe-study-layout"><section aria-label="Range-Matrix"><div className="nlhe-legend" aria-label="Aktionslegende">{node.actions.map(action => <span key={action.id}><i className={`action-dot action-${action.id}`} />{action.label}</span>)}</div><HandMatrix rows={node.classes} selected={selected} onSelect={setSelected} /><p className="matrix-help">169 Handklassen · 1.326 Kombinationen. Mit Pfeiltasten navigieren oder eine Hand antippen. Farben zeigen Mischungen; abgedunkelte Hände erreichen diesen Spot nicht.</p></section>
      <aside className="nlhe-hand-detail panel" aria-label="Handdetails"><div className="selected-hand-title"><h2>{selected}</h2><span>{combos.length} Combos</span></div>{hand.reach > 0 ? <><Frequencies frequencies={hand.actions} actions={node.actions} />{hand.reach < 1 ? <p>Diese Hand eröffnet in der vorherigen Lernrange zu {number(hand.reach * 100)} %. Die Antwortfrequenzen gelten, wenn sie den Spot erreicht.</p> : null}</> : <p>Diese Hand ist nicht in deiner vorherigen Opening-Range und wird hier nicht trainiert.</p>}<details><summary>Konkrete Kombinationen</summary><div className="nlhe-combo-list">{combos.map(combo => <HoldemCards key={combo.join('')} cards={combo} small />)}</div></details><p className="nlhe-detail-note">Die Frequenzen gelten preflop für jede Kombination dieser Klasse. Sie sind Lernregeln, keine gemessenen GTO-Werte.</p><ActionLink href={`/trainer?${configSearch(node.config)}`}>Diese Range trainieren</ActionLink><p>Der Trainer zieht Hände aus genau diesem Spot. Deine Fortschritte werden gespeichert.</p></aside></div>
      <section className="nlhe-related"><h2>Verwandte Spots</h2><div>{node.related.map(next => <Link className="button button-secondary" key={configSearch(next)} href={`/ranges?${configSearch(next)}`}>{spotLabel(next)}</Link>)}</div></section></> : null}</>;
}
