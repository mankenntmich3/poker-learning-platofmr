"use client";

import { useEffect, useRef, useState, type FormEvent, type ReactNode } from "react";
import { usePathname, useRouter } from "next/navigation";
import { ArrowRight, BookOpen, Check, Eye, EyeOff, LockKeyhole, Target } from "lucide-react";
import type { StudyUser } from "@/shared/contracts";
import { safeReturnTo } from "@/shared/navigation";
import { api, useSession } from "./study-context";
import { ErrorNotice, LoadingPanel, MiniDeck } from "./ui";

export function SessionGate({ children }: { children: ReactNode }) {
  const { user, loading, error, reload } = useSession();
  const router = useRouter();
  const pathname = usePathname();
  useEffect(() => {
    if (!loading && !error && !user) router.replace(`/login?next=${encodeURIComponent(safeReturnTo(pathname))}`);
  }, [user, loading, error, pathname, router]);
  if (error) return <ErrorNotice message={error} retry={reload} />;
  if (loading || !user) return <LoadingPanel label="Anmeldung wird geprüft…" />;
  return children;
}

export function AuthScreen({ returnTo = "/" }: { returnTo?: string }) {
  const { user, setUser, developmentDemo, loading } = useSession();
  const router = useRouter();
  const destination = safeReturnTo(returnTo);
  const [mode, setMode] = useState<"register" | "login">("login");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  const [visible, setVisible] = useState(false);
  const errorRef = useRef<HTMLDivElement>(null);
  useEffect(() => { if (user) router.replace(destination); }, [user, destination, router]);
  useEffect(() => { if (error) errorRef.current?.focus(); }, [error]);

  async function authenticate(payload: Record<string, unknown>, action: "register" | "login") {
    if (busy) return;
    setBusy(true); setError("");
    try {
      await api<{ user: StudyUser }>(`/api/auth/${action}`, { method: "POST", body: JSON.stringify(payload) });
      // Confirm the browser retained the session before opening protected content.
      const verified = await api<{ user: StudyUser | null }>("/api/session");
      if (!verified.user) throw new Error("Dein Browser hat die Sitzung nicht gespeichert. Erlaube Cookies für diese lokale Adresse und melde dich erneut an.");
      setUser(verified.user);
      router.replace(destination);
    } catch (cause) { setError(cause instanceof Error ? cause.message : "Die Anmeldung ist fehlgeschlagen. Versuche es erneut."); }
    finally { setBusy(false); }
  }
  function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const form = new FormData(event.currentTarget);
    const credentials = { email: form.get("email"), password: form.get("password") };
    void authenticate(mode === "login" ? credentials : { ...credentials, name: form.get("name"), weeklyGoal: Number(form.get("weeklyGoal") ?? 3), experience: form.get("experience") ?? "beginner" }, mode);
  }
  return <div className="auth-layout">
    <section className="auth-introduction">
      <span className="context-label"><span className="small-rule" />Dein persönlicher Poker-Trainingsraum</span>
      <h1>Verstehe die Hand.<br />Verbessere die Entscheidung.</h1>
      <p>Öffne deine Lektion, übe am Tisch und kehre zu deinem gespeicherten Fortschritt zurück.</p>
      <div className="auth-table"><div className="auth-table-oval"><MiniDeck /><span className="table-wordmark" aria-hidden="true">rangeform</span></div><span className="illustration-caption">Ein kleines Spiel. Große strategische Fragen.</span></div>
      <div className="auth-promises"><span><BookOpen size={18} aria-hidden="true" />Konzepte verstehen</span><span><Target size={18} aria-hidden="true" />Entscheidungen üben</span><span><Check size={18} aria-hidden="true" />Fortschritt festhalten</span></div>
    </section>
    <section className="auth-form-panel" aria-labelledby="auth-title">
      <div className="auth-tabs" role="group" aria-label="Konto auswählen">
        <button type="button" disabled={busy || loading} className={mode === "register" ? "selected" : ""} aria-pressed={mode === "register"} onClick={() => { setMode("register"); setError(""); }}>Konto erstellen</button>
        <button type="button" disabled={busy || loading} className={mode === "login" ? "selected" : ""} aria-pressed={mode === "login"} onClick={() => { setMode("login"); setError(""); }}>Anmelden</button>
      </div>
      <h2 id="auth-title">{mode === "register" ? "Dein Konto einrichten." : "Zurück an deinen Tisch."}</h2>
      <p>{mode === "register" ? "Ein Konto öffnet Academy und Training. Deine Ziele kannst du jederzeit ändern." : "Melde dich an. Danach öffnet sich die von dir gewählte Seite."}</p>
      {developmentDemo ? <aside className="development-access" aria-label="Lokaler Demo-Zugang">
        <strong>Lokal direkt ausprobieren</strong>
        <p>Demo-Konto mit drei gespeicherten Beispielentscheidungen. Deine weiteren Übungen bleiben erhalten.</p>
        <p><span>E-Mail: </span><code>{developmentDemo.email}</code><br /><span>Passwort: </span><code>{developmentDemo.password}</code></p>
        <button type="button" className="button button-secondary full-width" disabled={busy || loading} onClick={() => void authenticate(developmentDemo, "login")}>Mit Demo-Konto anmelden</button>
        <small>Nur in der lokalen Entwicklung. Beim ersten Start einmal <code>pnpm db:seed</code> ausführen.</small>
      </aside> : null}
      <form onSubmit={submit} className="form-stack">
        {mode === "register" ? <label htmlFor="name">Dein Name<input id="name" name="name" autoComplete="name" required maxLength={80} placeholder="Wie möchtest du heißen…" /></label> : null}
        <label htmlFor="email">E-Mail-Adresse<input id="email" name="email" type="email" autoComplete="email" spellCheck={false} required placeholder="du@beispiel.de…" /></label>
        <label htmlFor="password"><span id="password-label">Passwort</span><div className="password-field"><input id="password" name="password" aria-labelledby="password-label" type={visible ? "text" : "password"} autoComplete={mode === "register" ? "new-password" : "current-password"} minLength={mode === "register" ? 10 : undefined} maxLength={128} required aria-describedby={mode === "register" ? "password-hint" : undefined} /><button type="button" aria-label={visible ? "Passwort verbergen" : "Passwort anzeigen"} onClick={() => setVisible(!visible)}>{visible ? <EyeOff size={18} aria-hidden="true" /> : <Eye size={18} aria-hidden="true" />}</button></div>{mode === "register" ? <small id="password-hint">Mindestens 10 Zeichen.</small> : null}</label>
        {mode === "register" ? <div className="form-row"><label htmlFor="experience">Deine Erfahrung<select id="experience" name="experience" defaultValue="beginner"><option value="beginner">Ich lerne die Grundlagen</option><option value="intermediate">Ich spiele regelmäßig</option><option value="advanced">Ich trainiere fortgeschritten</option></select></label><label htmlFor="weeklyGoal">Lerntage pro Woche<select id="weeklyGoal" name="weeklyGoal" defaultValue="3">{[1,2,3,4,5,6,7].map(value => <option key={value} value={value}>{value} {value === 1 ? "Tag" : "Tage"}</option>)}</select></label></div> : null}
        <button className="button button-primary full-width" type="submit" disabled={busy || loading}>{busy ? "Anmeldung wird geprüft…" : mode === "register" ? "Konto erstellen und starten" : "Anmelden"}<ArrowRight size={17} aria-hidden="true" /></button>
      </form>
      {error ? <div ref={errorRef} tabIndex={-1}><ErrorNotice message={error} /></div> : null}
      <p className="auth-footnote"><LockKeyhole size={14} aria-hidden="true" />Dein Fortschritt wird in deinem Konto gespeichert. Keine Zahlungen, keine Echtgeldspiele.</p>
    </section>
  </div>;
}
