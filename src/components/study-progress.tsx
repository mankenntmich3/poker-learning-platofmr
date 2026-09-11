'use client';
import type { studyMetrics } from '@/server/study-metrics';
import { useResource } from './study-context';
import { ErrorNotice,number } from './ui';
export function StudyProgress(){
  const resource=useResource<Awaited<ReturnType<typeof studyMetrics>>>('/api/study/metrics'),data=resource.data;
  if(resource.error)return <ErrorNotice message={resource.error} retry={resource.reload}/>;if(!data)return null;
  const percent=(value:string|null)=>value===null?'Noch keine Daten':`${number(Number(value)*100,1)} %`;
  return <section className="engine-library panel"><h2>Dein Strategievergleich</h2><p>Übereinstimmung = gewählte Action hatte eine positive Lernfrequenz. Das ist keine GTO-Accuracy. Seltene Mischaktionen werden nicht als Fehler bewertet.</p><div className="engine-toolbar"><p>Preflop: <strong>{percent(data.preflop.agreement)}</strong> · {data.preflop.decisions} Entscheidungen</p><p>Study Postflop: <strong>{percent(data.postflop.agreement)}</strong> · {data.postflop.decisions} Entscheidungen</p><p>Ø EV Loss: {data.postflop.ev_loss===null?'EV data unavailable':`${number(Number(data.postflop.ev_loss),3)} BB (${data.postflop.ev_samples} Messwerte)`}</p></div><details><summary>Positionen und Boardtypen</summary><ul>{data.positions.map(row=><li key={row.position}>{row.position}: {percent(row.agreement)} aus {row.decisions} Entscheidungen</li>)}{data.boards.map(row=><li key={row.texture}>{row.texture}: {percent(row.agreement)} aus {row.decisions} Entscheidungen</li>)}</ul><p>Sortiert nach geringster Übereinstimmung. Mehrere Boardtags können zur selben Entscheidung gehören.</p></details><details><summary>Häufigste Abweichungen und schwierige Spots</summary>{data.mistakes.length?<ul>{data.mistakes.map(row=><li key={`${row.node_id}-${row.chosen_action}`}>{row.position} · {row.street} · {row.chosen_action}: {row.decisions} Entscheidungen außerhalb der Lernstrategie</li>)}</ul>:<p>Noch keine gespeicherten Actions mit Lernfrequenz 0.</p>}</details></section>;
}
