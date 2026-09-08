import Link from "next/link";
import { ArrowRight, CircleAlert, LoaderCircle, ShieldCheck } from "lucide-react";
import type { ReactNode } from "react";

export const number = (value: number, digits = 0) => new Intl.NumberFormat("de-DE", { maximumFractionDigits: digits, minimumFractionDigits: digits }).format(value);
export function PageHeader({ title, description, aside }: { title: string; description: string; aside?: ReactNode }) {
  return <div className="page-heading"><div><h1>{title}</h1><p>{description}</p></div>{aside}</div>;
}
export function ErrorNotice({ message, retry }: { message: string; retry?: () => void }) {
  return <div className="error-notice" role="alert"><CircleAlert size={20} aria-hidden="true" /><div><p>{message}</p>{retry ? <button className="text-button" onClick={retry}>Erneut versuchen</button> : null}</div></div>;
}
export function LoadingPanel({ label = "Dein Trainingsraum wird geladen…" }: { label?: string }) {
  return <div className="loading-panel" role="status"><LoaderCircle size={24} aria-hidden="true" /><p>{label}</p></div>;
}
export function Provenance({ compact = false }: { compact?: boolean }) {
  return <span className="provenance"><ShieldCheck size={14} aria-hidden="true" />{compact ? "Selbst berechnet" : "Selbst berechnet · Kuhn Poker"}</span>;
}
export function ActionLink({ href, children, secondary = false }: { href: string; children: ReactNode; secondary?: boolean }) {
  return <Link className={secondary ? "button button-secondary" : "button button-primary"} href={href}>{children}<ArrowRight size={17} aria-hidden="true" /></Link>;
}
export function PlayingCard({ rank = "K", hidden = false, small = false }: { rank?: string; hidden?: boolean; small?: boolean }) {
  return <div className={`playing-card${hidden ? " card-back" : ""}${small ? " card-small" : ""}`} role="img" aria-label={hidden ? "Verdeckte Karte" : `${rank} – Kuhn-Spielkarte`}>{hidden ? <span aria-hidden="true">r</span> : <><span className="card-corner" aria-hidden="true">{rank}</span><span className="card-rank" aria-hidden="true">{rank}</span><span className="card-corner card-corner-bottom" aria-hidden="true">{rank}</span></>}</div>;
}
export function MiniDeck() {
  return <div className="mini-deck" role="group" aria-label="Kuhn Poker verwendet die drei Karten Bube, Dame und König"><PlayingCard rank="J" /><PlayingCard rank="Q" /><PlayingCard rank="K" /></div>;
}
