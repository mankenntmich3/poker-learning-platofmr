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
    const error = typeof data === "object" && data !== null && "error" in data ? String(data.error) : "Die Anfrage ist fehlgeschlagen. Bitte versuche es erneut.";
    throw new RequestError(error, typeof data === "object" && data !== null && "code" in data ? String(data.code) : undefined);
  }
  return data as T;
}

type Session = { user: StudyUser | null; loading: boolean; error: string; setUser: (user: StudyUser | null) => void; reload: () => void };
const SessionContext = createContext<Session | null>(null);

export function StudyProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<StudyUser | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [revision, setRevision] = useState(0);
  const reload = () => {
    setLoading(true);
    setError("");
    setRevision((value) => value + 1);
  };
  useEffect(() => {
    let active = true;
    api<{ user: StudyUser | null }>("/api/session").then((result) => { if (active) setUser(result.user); }).catch((cause: unknown) => { if (active) setError(cause instanceof Error ? cause.message : "Deine Sitzung konnte nicht geladen werden."); }).finally(() => { if (active) setLoading(false); });
    return () => { active = false; };
  }, [revision]);
  return <SessionContext.Provider value={{ user, loading, error, setUser, reload }}>{children}</SessionContext.Provider>;
}

export function useSession() {
  const context = useContext(SessionContext);
  if (!context) throw new Error("StudyProvider fehlt.");
  return context;
}

export function useResource<T>(path: string, enabled = true) {
  const [data, setData] = useState<T | null>(null);
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(true);
  const [revision, setRevision] = useState(0);
  useEffect(() => {
    if (!enabled) return;
    let active = true;
    api<T>(path).then((result) => { if (active) { setData(result); setError(""); } }).catch((cause: unknown) => { if (active) setError(cause instanceof Error ? cause.message : "Die Daten konnten nicht geladen werden."); }).finally(() => { if (active) setLoading(false); });
    return () => { active = false; };
  }, [path, enabled, revision]);
  const reload = () => { setLoading(true); setRevision((value) => value + 1); };
  return { data, error, loading, reload };
}
