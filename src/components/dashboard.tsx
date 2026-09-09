'use client';
import Link from 'next/link';
import { useState } from 'react';
import { LESSON_PATH } from '@/shared/navigation';
import { lastSevenDays } from '@/shared/calendar';
import type { StudyDashboard } from '@/shared/contracts';
import { SessionGate } from './auth-screen';
import { useResource } from './study-context';
import { ActionLink, ErrorNotice, LoadingPanel, PageHeader, number } from './ui';
import { HoldemCards } from './nlhe-ui';
export function Dashboard() { return <SessionGate><DashboardContent /></SessionGate>; }
function DashboardContent() {
  const [today] = useState(() => new Date().toISOString().slice(0, 10));
  const { data, loading, error, reload } = useResource<StudyDashboard>('/api/dashboard');
  if (loading) return <LoadingPanel />;
  if (error || !data) return <ErrorNotice message={error || 'Dein Fortschritt ist noch nicht verfügbar.'} retry={reload} />;
  const progress = data.nlhe; const daily = lastSevenDays(progress.daily, today);
  const max = Math.max(4, ...daily.map(day => day.decisions));
  return <><PageHeader title={`Dein Trainingsraum, ${data.user.name.split(' ')[0]}.`} description="No-Limit Texas Hold’em · Dein persönliches 6-max-Studium" aside={<Link className="goal-chip" href="/settings">{data.user.weeklyGoal} Lerntage pro Woche</Link>} />
    <section className="metrics-rail" aria-label="Dein NLHE-Lernfortschritt"><div className="metric"><span>NLHE-Entscheidungen</span><strong>{number(progress.decisions)}</strong><small>Deine gespeicherten Hände</small></div><div className="metric"><span>Preflop / Postflop</span><strong>{progress.preflop}<em>/ {progress.postflop}</em></strong><small>Entscheidungen je Lernbereich</small></div><div className="metric"><span>Sitzungen abgeschlossen</span><strong>{number(progress.completedSessions)}</strong><small>Vollständig oder bewusst beendet</small></div><div className="metric"><span>Lektion abgeschlossen</span><strong>{data.lessonCompleted ? '1' : '0'}<em>/ 1</em></strong><small>NLHE-Preflop-Grundlagen</small></div></section>
    <div className="dashboard-main"><section className="next-lesson panel"><div className="section-heading"><span className="lesson-tag">6-max NLHE Cash</span></div><div className="lesson-feature"><div className="lesson-feature-copy"><h2>Deine Position. Dein Stack. Deine Range.</h2><p>Wähle einen Preflop-Spot, lies die Handmatrix und trainiere genau diese Range mit echten Hold’em-Starthänden.</p><p>Der erste Datensatz enthält offen gekennzeichnete Lernregeln. Noch keine validierten GTO-Frequenzen oder EV-Werte.</p><ActionLink href="/ranges">Preflop entdecken</ActionLink><Link className="inline-link" href={LESSON_PATH}>Zuerst die Grundlagen lesen</Link></div><div className="lesson-art"><HoldemCards cards={['As', 'Ks']} /><small>Zwei Karten. Eine bewusste Entscheidung.</small></div></div></section>
    <section className="practice-panel panel"><div className="section-heading"><h2>Deine NLHE-Praxis</h2><span className="subtle-label">Letzte 7 Tage</span></div><div className="practice-total"><strong>{daily.reduce((sum, day) => sum + day.decisions, 0)}</strong><span>Entscheidungen</span></div><div className="practice-chart" role="img" aria-label={daily.map(day => `${day.date}: ${day.decisions} Entscheidungen`).join('; ')}>{daily.some(day => day.decisions) ? daily.map(day => <div className="chart-column" key={day.date}><div className="chart-track"><span style={{ height: `${day.decisions / max * 100}%` }} /></div><small>{new Intl.DateTimeFormat('de-DE', { weekday: 'short', timeZone: 'UTC' }).format(new Date(`${day.date}T12:00:00Z`))}</small></div>) : <p className="chart-empty">Hier erscheint deine erste Übung.</p>}</div></section></div>
    <section className="nlhe-related"><h2>Deine Trainingssitzungen</h2><div>{progress.sessions.length ? progress.sessions.map(session => <Link className="button button-secondary" key={session.id} href={`/trainer?session=${session.id}`}>{session.label} · {session.answered} Hände · {session.complete ? 'Ergebnis ansehen' : 'Fortsetzen'}</Link>) : <p>Starte eine Sitzung aus deiner ausgewählten Preflop-Range.</p>}</div></section>
    <section className="nlhe-related"><h2>Zuletzt trainiert</h2>{progress.recent.length ? <ul className="activity-list">{progress.recent.map(entry => <li key={entry.id}><div><strong>{entry.label}</strong><span>{entry.detail}</span></div><time dateTime={entry.createdAt}>{new Intl.DateTimeFormat('de-DE', { day: '2-digit', month: 'short' }).format(new Date(entry.createdAt))}</time></li>)}</ul> : <p>Dein Lernverlauf entsteht mit deiner ersten Hold’em-Entscheidung.</p>}</section></>;
}
