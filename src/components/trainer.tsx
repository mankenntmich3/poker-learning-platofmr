'use client';
import { useRef, useState } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import { configFromSearch, configSearch, DEFAULT_NLHE, spotLabel, type NlheAction, type NlheNode, type NlheSession } from '@/shared/nlhe';
import { SessionGate } from './auth-screen';
import { api, useResource } from './study-context';
import { ActionLink, ErrorNotice, LoadingPanel, number, PageHeader } from './ui';
import { Frequencies, HoldemCards, RangeProvenance } from './nlhe-ui';
export function Trainer() { return <SessionGate><TrainerContent /></SessionGate>; }
function TrainerContent() {
  const router = useRouter(); const search = useSearchParams(); const sessionId = search.get('session');
  let config = DEFAULT_NLHE; let invalid = '';
  try { if (!sessionId) config = configFromSearch(new URLSearchParams(search.toString())); } catch { invalid = 'Der Trainingslink enthält keinen gültigen NLHE-Spot.'; }
  const range = useResource<NlheNode>(`/api/nlhe/range?${configSearch(config)}`, !sessionId && !invalid);
  const resource = useResource<NlheSession>(`/api/nlhe/session?id=${sessionId}`, !!sessionId);
  const [updated, setUpdated] = useState<NlheSession | null>(null); const [busy, setBusy] = useState(false); const [error, setError] = useState('');
  const [pending, setPending] = useState<{ question: string; action: NlheAction } | null>(null);
  const client = useRef<{ key: string; id: string } | null>(null);
  const session = updated?.id === sessionId ? updated : resource.data;
  async function start() {
    if (!range.data || busy) return; setBusy(true); setError('');
    const key = configSearch(range.data.config); client.current = client.current?.key === key ? client.current : { key, id: crypto.randomUUID() };
    try { const result = await api<NlheSession>('/api/nlhe/start', { method: 'POST', body: JSON.stringify({ config: range.data.config, solutionVersion: range.data.provenance.solutionVersion, clientId: client.current.id }) }); setUpdated(result); router.replace(`/trainer?session=${result.id}`, { scroll: false }); }
    catch (cause) { setError(cause instanceof Error ? cause.message : 'Die Sitzung konnte nicht gestartet werden.'); } finally { setBusy(false); }
  }
  async function answer(action: NlheAction) {
    if (!session || busy || session.feedback) return; setBusy(true); setError(''); setPending({ question: session.question.id, action });
    try { setUpdated(await api<NlheSession>('/api/nlhe/decision', { method: 'POST', body: JSON.stringify({ sessionId: session.id, questionId: session.question.id, action }) })); setPending(null); }
    catch (cause) { setError(cause instanceof Error ? cause.message : 'Die Antwort konnte nicht bestätigt werden. Wiederhole dieselbe Aktion.'); } finally { setBusy(false); }
  }
  async function command(command: 'next' | 'finish') {
    if (!session || busy) return; setBusy(true); setError('');
    try { setUpdated(await api<NlheSession>('/api/nlhe/session', { method: 'POST', body: JSON.stringify({ id: session.id, command }) })); setPending(null); }
    catch (cause) { setError(cause instanceof Error ? cause.message : 'Bitte versuche es erneut.'); } finally { setBusy(false); }
  }
  if (invalid) return <ErrorNotice message={invalid} retry={() => router.replace('/ranges')} />;
  if (range.loading || resource.loading && !session) return <LoadingPanel label="Dein NLHE-Training wird geladen…" />;
  if (resource.error || range.error) return <><ErrorNotice message={resource.error || range.error} retry={sessionId ? resource.reload : range.reload} /><ActionLink href="/ranges">Neue Range wählen</ActionLink></>;
  if (!sessionId && range.data) return <><PageHeader title="NLHE Range-Trainer" description={spotLabel(range.data.config)} /><RangeProvenance provenance={range.data.provenance} /><section className="course-entry panel"><h2>Genau diese Range üben.</h2><p>{range.data.context}</p><p>Zehn Hold’em-Hände aus diesem Spot. Wähle eine Aktion und vergleiche sie mit der Lernrange. Auch eine unterbrochene Sitzung kannst du später fortsetzen.</p>{error ? <ErrorNotice message={error} /> : null}<button className="button button-primary" onClick={start} disabled={busy}>{busy ? 'Sitzung startet…' : 'Trainingssitzung starten'}</button><ActionLink href={range.data.board.length ? '/postflop' : `/ranges?${configSearch(range.data.config)}`} secondary>Range ansehen</ActionLink></section></>;
  if (!session) return null;
  if (session.complete) return <><PageHeader title="Training abgeschlossen." description={spotLabel(session.spot.config)} /><section className="course-entry panel"><h2>{session.answered} {session.answered === 1 ? 'Hold’em-Hand' : 'Hold’em-Hände'} trainiert</h2><p>Alle Entscheidungen sind gespeichert. Deine Vergleiche beziehen sich auf die gekennzeichnete Lernrange; es wurde kein EV-Verlust berechnet.</p><ActionLink href="/">Fortschritt ansehen</ActionLink><ActionLink href={`/trainer?${configSearch(session.spot.config)}`} secondary>Neue Sitzung starten</ActionLink></section></>;
  const { spot, question, feedback } = session;
  return <><PageHeader title={spot.board.length ? 'NLHE Flop-Trainer' : 'NLHE Range-Trainer'} description={spotLabel(spot.config)} aside={<span className="session-chip">Hand {question.ordinal} / {session.limit}</span>} /><RangeProvenance provenance={spot.provenance} />
    <div className="nlhe-training-layout"><section className="nlhe-table panel" aria-label="Deine Hold’em-Entscheidung"><p className="nlhe-opponent">{spot.config.villain ? `Gegner: ${spot.config.villain}` : 'Alle folden zu dir'}</p><div className="nlhe-felt"><span className="nlhe-pot">Pot <strong>{number(spot.potBb, 1)} BB</strong></span>{spot.board.length ? <HoldemCards cards={spot.board} small /> : <p>Preflop</p>}<HoldemCards cards={question.cards} /><strong>{spot.config.hero} · {question.handClass}</strong><span>{number(spot.config.stackBb - spot.investedBb, 1)} BB hinter dir</span></div><p>{spot.context}</p><h2>{feedback ? 'Deine Entscheidung ist gespeichert.' : 'Welche Aktion wählst du?'}</h2><div className="nlhe-action-buttons">{spot.actions.map(action => <button key={action.id} className={`button button-secondary${feedback?.chosenAction === action.id ? ' chosen-action' : ''}`} onClick={() => answer(action.id)} disabled={busy || !!feedback || !!(pending?.question === question.id && pending.action !== action.id)}>{action.label}{pending?.question === question.id && pending.action === action.id && !busy ? ' · Wiederholen' : ''}</button>)}</div>{error ? <ErrorNotice message={error} /> : null}</section>
    <aside className="nlhe-feedback panel" aria-label="Strategie-Feedback"><h2>{feedback ? 'Dein Range-Vergleich' : 'Erst entscheiden, dann vergleichen.'}</h2>{feedback ? <div aria-live="polite"><p className="feedback-observation">{feedback.inPolicy ? 'In dieser Lernrange vorgesehen' : 'Außerhalb dieser Lernrange'}</p><Frequencies frequencies={feedback.actions} actions={spot.actions} /><p>{feedback.explanation}</p><p className="nlhe-no-ev">EV-Verlust: nicht verfügbar</p><button className="button button-primary full-width" disabled={busy} onClick={() => command('next')}>{question.ordinal === session.limit ? 'Training abschließen' : 'Nächste Hand'}</button>{question.ordinal < session.limit ? <button className="text-button" disabled={busy} onClick={() => command('finish')}>Sitzung jetzt abschließen</button> : null}</div> : <p>Du siehst die Frequenzen nach deiner Antwort. Das Feedback nutzt exakt die gewählte Position, Stacktiefe und Vorgeschichte.</p>}<ActionLink href={spot.board.length ? '/postflop' : `/ranges?${configSearch(spot.config)}`} secondary>Zum Lernspot</ActionLink></aside></div>
    {question.villainRange ? <details className="nlhe-villain-range"><summary>BB-Calling-Range ansehen · deine Karten und der Flop sind entfernt</summary><p>Gewicht aus der approximierten BB-vs-BTN-Preflop-Calling-Range. Keine zusätzliche Verengung durch den Check.</p><div>{question.villainRange.map(row => <span key={row.handClass}>{row.handClass} · {row.combos} Combos × {number(row.weight * 100)} %</span>)}</div></details> : null}</>;
}
