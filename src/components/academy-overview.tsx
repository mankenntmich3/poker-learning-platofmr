"use client";

import Link from 'next/link';
import { SessionGate } from './auth-screen';
import { ActionLink, ErrorNotice, LoadingPanel, PageHeader } from './ui';
import { useResource } from './study-context';
import type { StudyDashboard } from '@/shared/contracts';
import { COURSE_PATH, LESSON_PATH } from '@/shared/navigation';

export function AcademyOverview({ course = false }: { course?: boolean }) {
  return <SessionGate><OverviewContent course={course} /></SessionGate>;
}
function OverviewContent({ course }: { course: boolean }) {
  const { data, loading, error, reload } = useResource<StudyDashboard>('/api/dashboard');
  if (loading) return <LoadingPanel label="Dein Lernweg wird geladen…" />;
  if (error || !data) return <ErrorNotice message={error || 'Dein Lernweg konnte nicht geladen werden.'} retry={reload} />;
  return <>
    <PageHeader title={course ? 'Grundlagen guter Entscheidungen' : 'Dein Einstieg in die Academy.'} description={course ? 'Ein Kurs · eine Lektion · eine praktische Übung' : 'Verstehen, ausprobieren und den Fortschritt behalten.'} />
    {course ? <Link className="inline-link" href="/academy">Zur Academy</Link> : null}
    <section className="course-entry panel">
      <span className="lesson-tag">{data.lessonCompleted ? 'Lektion abgeschlossen' : 'Für deinen Einstieg'}</span>
      <h2>{course ? 'Position, Stacks und Preflop-Ranges' : 'Grundlagen guter Entscheidungen'}</h2>
      <p>Lerne Positionen, effektive Stacks und gemischte Ranges für No-Limit Texas Hold’em.</p>
      <p>8 Minuten Lesezeit · Wissensfrage · zugehöriges NLHE-Training</p>
      <ActionLink href={course ? LESSON_PATH : COURSE_PATH}>{course ? 'Lektion öffnen' : 'Kurs öffnen'}</ActionLink>
    </section>
    {course ? <section className="course-entry panel"><h2>Am Tisch anwenden</h2><p>Wähle eine Preflop-Range und trainiere zehn konkrete Hold’em-Hände. Jede Entscheidung wird gespeichert.</p><ActionLink href="/trainer">Zur Trainingsübung</ActionLink></section> : null}
  </>;
}
