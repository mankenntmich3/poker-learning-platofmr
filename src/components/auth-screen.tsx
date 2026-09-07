"use client";

import { useEffect, useState, type FormEvent, type ReactNode } from "react";
import { useRouter } from "next/navigation";
import { ArrowRight, BookOpen, Check, Eye, EyeOff, LockKeyhole, Target } from "lucide-react";
import type { StudyUser } from "@/shared/contracts";
import { api, useSession } from "./study-context";
import { ErrorNotice, LoadingPanel, MiniDeck } from "./ui";

export function SessionGate({ children }: { children: ReactNode }) {
  const { user, loading, error, reload } = useSession();
  if (loading) return <LoadingPanel />;
  if (error) return <ErrorNotice message={error} retry={reload} />;
  if (!user) return <AuthScreen />;
  return children;
}

export function AuthScreen() {
  const { user, setUser } = useSession();
  const router = useRouter();
  const [mode, setMode] = useState<"register" | "login">("register");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  const [visible, setVisible] = useState(false);
  useEffect(() => { if (user) router.replace("/"); }, [user, router]);
  async function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setBusy(true); setError("");
    const form = new FormData(event.currentTarget);
    try {
      const credentials = { email: form.get("email"), password: form.get("password") };
      const payload = mode === "login" ? credentials : { ...credentials, name: form.get("name"), weeklyGoal: Number(form.get("weeklyGoal") ?? 3), experience: form.get("experience") ?? "beginner" };
      const result = await api<{ user: StudyUser }>(`/api/auth/${mode}`, { method: "POST", body: JSON.stringify(payload) });
      setUser(result.user); router.push("/");
    } catch (cause) { setError(cause instanceof Error ? cause.message : "Die Anmeldung ist fehlgeschlagen. Versuche es erneut."); }
    finally { setBusy(false); }
  }
  return <div className="auth-layout"><section className="auth-introduction"><span className="context-label"><span className="small-rule" />Dein persönlicher Poker-Trainingsraum</span><h1>Verstehe die Hand.<br />Verbessere die Entscheidung.</h1><p>Ein klarer Lernweg von der Theorie an den Tisch. Mit nachvollziehbarem Feedback und Fortschritt, der bei dir beginnt.</p><div className="auth-table"><div className="auth-table-oval"><MiniDeck /><span className="table-wordmark" aria-hidden="true">rangeform</span></div><span className="illustration-caption">Ein kleines Spiel. Große strategische Fragen.</span></div><div className="auth-promises"><span><BookOpen size={18} aria-hidden="true" />Konzepte verstehen</span><span><Target size={18} aria-hidden="true" />Entscheidungen üben</span><span><Check size={18} aria-hidden="true" />Fortschritt festhalten</span></div></section><section className="auth-form-panel" aria-labelledby="auth-title"><div className="auth-tabs" role="group" aria-label="Konto auswählen"><button type="button" className={mode === "register" ? "selected" : ""} aria-pressed={mode === "register"} onClick={() => { setMode("register"); setError(""); }}>Konto erstellen</button><button type="button" className={mode === "login" ? "selected" : ""} aria-pressed={mode === "login"} onClick={() => { setMode("login"); setError(""); }}>Anmelden</button></div><h2 id="auth-title">{mode === "register" ? "Dein nächster Schritt." : "Zurück an deinen Tisch."}</h2><p>{mode === "register" ? "Richte dein Studium ein. Du kannst deine Ziele jederzeit anpassen." : "Melde dich an und setze dein Studium fort."}</p><form onSubmit={submit} className="form-stack">{mode === "register" ? <label htmlFor="name">Dein Name<input id="name" name="name" autoComplete="name" required maxLength={80} placeholder="Wie möchtest du heißen…" /></label> : null}<label htmlFor="email">E-Mail-Adresse<input id="email" name="email" type="email" autoComplete="email" spellCheck={false} required placeholder="du@beispiel.de…" /></label><label htmlFor="password">Passwort<div className="password-field"><input id="password" name="password" type={visible ? "text" : "password"} autoComplete={mode === "register" ? "new-password" : "current-password"} minLength={mode === "register" ? 10 : undefined} maxLength={128} required aria-describedby={mode === "register" ? "password-hint" : undefined} /><button type="button" aria-label={visible ? "Passwort verbergen" : "Passwort anzeigen"} onClick={() => setVisible(!visible)}>{visible ? <EyeOff size={18} aria-hidden="true" /> : <Eye size={18} aria-hidden="true" />}</button></div>{mode === "register" ? <small id="password-hint">Mindestens 10 Zeichen.</small> : null}</label>{mode === "register" ? <div className="form-row"><label htmlFor="experience">Deine Erfahrung<select id="experience" name="experience" defaultValue="beginner"><option value="beginner">Ich lerne die Grundlagen</option><option value="intermediate">Ich spiele regelmäßig</option><option value="advanced">Ich trainiere fortgeschritten</option></select></label><label htmlFor="weeklyGoal">Lerntage pro Woche<select id="weeklyGoal" name="weeklyGoal" defaultValue="3">{[1,2,3,4,5,6,7].map(value => <option key={value} value={value}>{value} {value === 1 ? "Tag" : "Tage"}</option>)}</select></label></div> : null}{error ? <ErrorNotice message={error} /> : null}<button className="button button-primary full-width" type="submit" disabled={busy}>{busy ? "Wird gespeichert…" : mode === "register" ? "Trainingsraum erstellen" : "Anmelden"}<ArrowRight size={17} aria-hidden="true" /></button></form><p className="auth-footnote"><LockKeyhole size={14} aria-hidden="true" />Dein Fortschritt wird in deinem Konto gespeichert. Keine Zahlungen, keine Echtgeldspiele.</p></section></div>;
}
