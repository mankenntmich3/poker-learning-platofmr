"use client";
import { ErrorNotice } from "@/components/ui";
export default function ErrorPage({ reset }: { reset: () => void }) { return <div className="empty-page"><h1>Die Seite konnte nicht geladen werden.</h1><ErrorNotice message="Bitte lade die Ansicht erneut. Bereits gespeicherte Fortschritte bleiben erhalten." retry={reset} /></div>; }
