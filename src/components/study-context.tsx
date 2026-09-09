"use client";

import { createContext, useContext, useEffect, useState, type ReactNode } from "react";
import type { StudyUser } from "@/shared/contracts";

export class RequestError extends Error {
  constructor(message: string, public readonly code?: string) { super(message); }
}

export async function api<T>(path: string, init?: RequestInit): Promise<T> {
  const response = await fetch(path, { ...init, headers: { "Content-Type": "application/json", ...init?.headers } });
  const data: unknown = await response.json();
  if (!response.ok) {
    if (response.status === 401 && !path.startsWith('/api/auth/') && path !== '/api/session' && typeof window !== 'undefined') window.dispatchEvent(new Event('study-session-expired'));
    const error = typeof data === "object" && data !== null && "error" in data ? String(data.error) : "Die Anfrage ist fehlgeschlagen. Bitte versuche es erneut.";
    throw new RequestError(error, typeof data === "object" && data !== null && "code" in data ? String(data.code) : undefined);
  }
  return data as T;
}

type DemoCredentials = { email: string; password: string };
type Session = { user: StudyUser | null; loading: boolean; error: string; setUser: (user: StudyUser | null) => void; reload: () => void; developmentDemo: DemoCredentials | null; stagingInviteRequired: boolean };
const SessionContext = createContext<Session | null>(null);

export function StudyProvider({ children, developmentDemo = null }: { children: ReactNode; developmentDemo?: DemoCredentials | null }) {
  const [user, setUser] = useState<StudyUser | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [revision, setRevision] = useState(0);
  const [stagingInviteRequired, setStagingInviteRequired] = useState(false);
  const reload = () => {
    setLoading(true);
    setError("");
    setRevision((value) => value + 1);
  };
  useEffect(() => {
    const expired = () => setUser(null);
    window.addEventListener('study-session-expired', expired);
    return () => window.removeEventListener('study-session-expired', expired);
  }, []);
  useEffect(() => {
    let active = true;
    api<{ user: StudyUser | null; stagingInviteRequired: boolean }>("/api/session").then((result) => { if (active) { setUser(result.user); setStagingInviteRequired(result.stagingInviteRequired); } }).catch((cause: unknown) => { if (active) setError(cause instanceof Error ? cause.message : "Deine Sitzung konnte nicht geladen werden."); }).finally(() => { if (active) setLoading(false); });
    return () => { active = false; };
  }, [revision]);
  return <SessionContext.Provider value={{ user, loading, error, setUser, reload, developmentDemo, stagingInviteRequired }}>{children}</SessionContext.Provider>;
}

export function useSession() {
  const context = useContext(SessionContext);
  if (!context) throw new Error("StudyProvider fehlt.");
  return context;
}

export function useResource<T>(path: string, enabled = true) {
  const [result, setResult] = useState<{ path: string; revision: number; data: T | null; error: string } | null>(null);
  const [revision, setRevision] = useState(0);
  useEffect(() => {
    if (!enabled) return;
    let active = true;
    api<T>(path).then(data => { if (active) setResult({ path, revision, data, error: '' }); })
      .catch((cause: unknown) => { if (active) setResult({ path, revision, data: null, error: cause instanceof Error ? cause.message : 'Die Daten konnten nicht geladen werden.' }); });
    return () => { active = false; };
  }, [path, enabled, revision]);
  const reload = () => setRevision(value => value + 1);
  const current = result?.path === path && result.revision === revision ? result : null;
  return { data: enabled ? current?.data ?? null : null, error: enabled ? current?.error ?? '' : '', loading: enabled && !current, reload };
}
