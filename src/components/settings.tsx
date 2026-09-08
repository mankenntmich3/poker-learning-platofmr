"use client";

import { useState, type FormEvent } from "react";
import { Check, Download, LogOut, ShieldCheck, Trash2 } from "lucide-react";
import type { StudyUser } from "@/shared/contracts";
import { SessionGate } from "./auth-screen";
import { api, useSession } from "./study-context";
import { ErrorNotice, PageHeader } from "./ui";

export function Settings() { return <SessionGate><SettingsContent /></SessionGate>; }
function SettingsContent() {
  const { user, setUser } = useSession();
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  const [saved, setSaved] = useState(false);
  const [deleting, setDeleting] = useState(false);
  async function save(event: FormEvent<HTMLFormElement>) {
    event.preventDefault(); setBusy(true); setError(""); setSaved(false);
    const form = new FormData(event.currentTarget);
    try { const response = await api<{ user: StudyUser }>("/api/settings", { method: "PATCH", body: JSON.stringify({ name: form.get("name"), weeklyGoal: Number(form.get("weeklyGoal")), experience: form.get("experience") }) }); setUser(response.user); setSaved(true); }
    catch (cause) { setError(cause instanceof Error ? cause.message : "Die Einstellungen konnten nicht gespeichert werden."); }
    finally { setBusy(false); }
  }
  async function logout() {
    setBusy(true); setError("");
    // Full navigation discards cached account data and avoids racing the protected-route redirect.
    // eslint-disable-next-line @next/next/no-location-assign-relative-destination
    try { await api("/api/auth/logout", { method: "POST", body: "{}" }); window.location.assign("/login"); }
    catch (cause) { setError(cause instanceof Error ? cause.message : "Abmelden fehlgeschlagen. Bitte versuche es erneut."); }
    finally { setBusy(false); }
  }
  async function removeAccount(event: FormEvent<HTMLFormElement>) {
    event.preventDefault(); setBusy(true); setError("");
    const form = new FormData(event.currentTarget);
    // Account deletion must discard the entire authenticated document, just like logout.
    // eslint-disable-next-line @next/next/no-location-assign-relative-destination
    try { await api("/api/account", { method: "DELETE", body: JSON.stringify({ password: form.get("confirmPassword") }) }); window.location.assign("/login"); }
    catch (cause) { setError(cause instanceof Error ? cause.message : "Das Konto konnte nicht gelöscht werden. Versuche es erneut."); }
    finally { setBusy(false); }
  }
  if (!user) return null;
  return <><PageHeader title="Dein Studium. Deine Einstellungen." description="Profil, Lernziel und persönliche Daten an einem Ort." /><div className="settings-layout"><section className="settings-panel panel"><h2>Profil & Lernziel</h2><p>Ein realistisches Ziel hilft dir, regelmäßig am Ball zu bleiben.</p><form className="form-stack" onSubmit={save}><label htmlFor="settings-name">Dein Name<input id="settings-name" name="name" defaultValue={user.name} autoComplete="name" required maxLength={80} onChange={() => setSaved(false)} /></label><label htmlFor="settings-email">E-Mail-Adresse<input id="settings-email" type="email" value={user.email} disabled /><small>Die E-Mail-Adresse ist mit diesem Konto verbunden.</small></label><div className="form-row"><label htmlFor="settings-experience">Deine Erfahrung<select id="settings-experience" name="experience" defaultValue={user.experience} onChange={() => setSaved(false)}><option value="beginner">Ich lerne die Grundlagen</option><option value="intermediate">Ich spiele regelmäßig</option><option value="advanced">Ich trainiere fortgeschritten</option></select></label><label htmlFor="settings-goal">Lerntage pro Woche<select id="settings-goal" name="weeklyGoal" defaultValue={user.weeklyGoal} onChange={() => setSaved(false)}>{[1, 2, 3, 4, 5, 6, 7].map((value) => <option value={value} key={value}>{value} {value === 1 ? "Tag" : "Tage"}</option>)}</select></label></div><div className="save-row"><button className="button button-primary" type="submit" disabled={busy}>{busy ? "Wird gespeichert…" : "Änderungen speichern"}</button><span role="status">{saved ? <span className="saved-inline"><Check size={16} aria-hidden="true" />Gespeichert</span> : null}</span></div></form></section><aside className="privacy-panel"><ShieldCheck size={26} aria-hidden="true" /><h2>Deine Daten bleiben deine.</h2><p>Du kannst deine Profildaten und deinen Lernfortschritt herunterladen. Wenn du dein Konto löschst, werden deine persönlichen Lernaktivitäten entfernt.</p><a className="button button-secondary full-width" href="/api/account/export" download><Download size={16} aria-hidden="true" />Meine Daten exportieren</a><button className="button button-secondary full-width" onClick={logout} disabled={busy}><LogOut size={16} aria-hidden="true" />Abmelden</button><div className="danger-area">{deleting ? <form onSubmit={removeAccount} className="form-stack"><h3>Konto endgültig löschen?</h3><p>Dein Profil und Lernfortschritt werden gelöscht. Diese Aktion kann nicht rückgängig gemacht werden.</p><label htmlFor="confirm-password">Mit deinem Passwort bestätigen<input id="confirm-password" name="confirmPassword" type="password" autoComplete="current-password" required /></label><button className="button button-danger" disabled={busy} type="submit">Konto endgültig löschen</button><button className="text-button" onClick={() => setDeleting(false)} type="button">Abbrechen</button></form> : <button className="text-button danger-text" onClick={() => setDeleting(true)}><Trash2 size={15} aria-hidden="true" />Konto löschen</button>}</div></aside></div>{error ? <ErrorNotice message={error} /> : null}</>;
}
