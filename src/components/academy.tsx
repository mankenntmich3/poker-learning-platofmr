"use client";

import { useState, type FormEvent } from "react";
import { BookOpen, Check, Clock3, Lightbulb } from "lucide-react";
import type { Lesson } from "@/shared/contracts";
import { SessionGate } from "./auth-screen";
import { api, useResource } from "./study-context";
import { ActionLink, ErrorNotice, LoadingPanel, MiniDeck, PageHeader } from "./ui";

export function Academy() { return <SessionGate><LessonContent /></SessionGate>; }
function LessonContent() {
  const { data: lesson, loading, error, reload } = useResource<Lesson>("/api/lesson");
  const [answer, setAnswer] = useState<number | null>(null);
  const [result, setResult] = useState<boolean | null>(null);
  const [saving, setSaving] = useState(false);
  const [saveError, setSaveError] = useState("");
  async function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault(); if (answer === null) return;
    setSaving(true); setSaveError("");
    try { const response = await api<{ correct: boolean }>("/api/lesson/complete", { method: "POST", body: JSON.stringify({ answer }) }); setResult(response.correct); }
    catch (cause) { setSaveError(cause instanceof Error ? cause.message : "Deine Antwort konnte nicht gespeichert werden. Versuche es erneut."); }
    finally { setSaving(false); }
  }
  if (loading) return <LoadingPanel label="Die Lektion wird geladen…" />;
  if (error || !lesson) return <ErrorNotice message={error || "Die Lektion ist nicht verfügbar."} retry={reload} />;
  return <><PageHeader title="Verstehen kommt vor Gewinnen." description="Academy / Grundlagen / Entscheidungen" /><div className="academy-layout"><article className="lesson-article"><div className="article-meta"><span className="lesson-tag">{lesson.category}</span><span><Clock3 size={14} aria-hidden="true" />{lesson.minutes} Minuten</span></div><h2 className="article-title">{lesson.title}</h2><p className="article-intro">{lesson.subtitle}</p>{lesson.sections.map((section, index) => <section className="article-section" id={`chapter-${index + 1}`} key={section.title}><h3>{section.title}</h3>{section.body.split("\n\n").map((paragraph, i) => <p key={i}>{paragraph}</p>)}</section>)}<aside className="takeaway"><Lightbulb size={22} aria-hidden="true" /><div><h3>Was du mitnimmst</h3><p>{lesson.takeaway}</p></div></aside><section className="quiz-section" id="quiz"><span className="subtle-label">Kurz überprüfen</span><h3>{lesson.quiz.question}</h3><form onSubmit={submit}><fieldset disabled={saving || result === true}><legend className="sr-only">Wähle eine Antwort</legend>{lesson.quiz.options.map((option, index) => <label className={`quiz-option${answer === index ? " selected" : ""}`} key={option}><input type="radio" name="answer" value={index} required checked={answer === index} onChange={() => { setAnswer(index); setResult(null); }} /><span>{option}</span></label>)}</fieldset>{saveError ? <ErrorNotice message={saveError} /> : null}<div aria-live="polite">{result === true ? <div className="quiz-success"><span><Check size={19} aria-hidden="true" />Richtig. Deine Lektion ist abgeschlossen und gespeichert.</span><ActionLink href="/trainer">Am Tisch anwenden</ActionLink></div> : <>{result === false ? <p className="quiz-correction">Noch nicht ganz. Lies den Abschnitt zum Erwartungswert und versuche es erneut.</p> : null}<button type="submit" className="button button-primary" disabled={saving}>{saving ? "Antwort wird geprüft…" : "Antwort überprüfen"}</button></>}</div></form></section></article><aside className="lesson-sidebar"><div className="lesson-outline panel"><span className="outline-icon"><BookOpen size={22} aria-hidden="true" /></span><h2>In dieser Lektion</h2><ol>{lesson.sections.map((section, index) => <li key={section.title}><a href={`#chapter-${index + 1}`}>{section.title}</a></li>)}<li><a href="#quiz">Dein Wissen überprüfen</a></li></ol></div><div className="lesson-to-practice"><MiniDeck /><h3>Vom Konzept an den Tisch.</h3><p>Übe anschließend im Kuhn-Trainer. Ein vereinfachtes Pokerspiel macht Erwartungswerte nachvollziehbar.</p></div></aside></div></>;
}
