"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { BookOpen, ChartNoAxesCombined, ChevronRight, FlaskConical, House, Layers, Settings2, Trophy } from "lucide-react";
import type { ReactNode } from "react";
import { useSession } from "./study-context";

const navigation = [
  { href: "/", label: "Übersicht", icon: House },
  { href: "/academy", label: "Academy", icon: BookOpen },
  { href: "/mtt", label: "Tournament", icon: Trophy },
  { href: "/postflop", label: "Postflop", icon: Layers },
  { href: "/trainer", label: "Sandbox", icon: FlaskConical },
];

export function AppShell({ children }: { children: ReactNode }) {
  const pathname = usePathname();
  const { user } = useSession();
  const activePath = pathname.startsWith("/academy/") ? "/academy" : pathname.startsWith('/mtt/') ? '/mtt' : pathname;
  const page = pathname==='/mtt/preflop'?'Verifiziertes Preflop-Teilspiel':pathname==='/mtt/river'?'Verifizierter River':navigation.find((item) => item.href === activePath)?.label ?? (pathname === "/settings" ? "Einstellungen" : "Dein Konto");
  return <div className="app-shell">
    <a className="skip-link" href="#main-content">Zum Inhalt</a>
    <aside className="sidebar">
      <Link href="/" className="brand" aria-label="Rangeform Startseite"><span className="brand-mark" aria-hidden="true"><i /><i /><i /></span>rangeform<span className="brand-dot">.</span></Link>
      <div className="workspace-label"><span className="workspace-icon"><ChartNoAxesCombined size={16} aria-hidden="true" /></span><div>No-Limit Hold’em<small>MTT · ChipEV Study</small></div></div>
      <nav aria-label="Hauptnavigation" className="desktop-navigation">{navigation.map(({ href, label, icon: Icon }) => <Link key={href} href={href} className={activePath === href ? "nav-item active" : "nav-item"} aria-current={activePath === href ? "page" : undefined}><Icon size={19} aria-hidden="true" />{label}{activePath === href ? <span className="nav-active-dot" /> : null}</Link>)}</nav>
      <div className="sidebar-bottom"><div className="study-note"><span className="small-rule" /><p>Gute Entscheidungen<br />lassen sich lernen.</p><small>Lernen. Anwenden. Verstehen.</small></div><Link href="/settings" className={pathname === "/settings" ? "nav-item active" : "nav-item"}><Settings2 size={18} aria-hidden="true" />Einstellungen</Link><div className="sidebar-profile"><span className="avatar">{user?.name.slice(0, 1).toLocaleUpperCase("de-DE") ?? "R"}</span><div><strong>{user?.name ?? "Willkommen"}</strong><small>{user ? "Persönliches Profil" : "Dein Studium beginnt hier"}</small></div></div></div>
    </aside>
    <div className="workspace"><header className="topbar"><div className="breadcrumb"><span className="desktop-only">Trainingsraum</span><ChevronRight size={14} className="desktop-only" aria-hidden="true" /><span>{page}</span></div><div className="topbar-right"><span className="build-label"><span />Early access</span><Link href={user ? "/settings" : "/login"} className="topbar-profile" aria-label={user ? "Profil und Einstellungen" : "Anmelden"}>{user?.name.slice(0, 1).toLocaleUpperCase("de-DE") ?? "R"}</Link></div></header><main id="main-content" className="main-content">{user?.developmentOnly ? <p className="demo-banner">Lokales Demo-Konto · Beispielübungen sind als solche gekennzeichnet</p> : null}{children}</main><footer className="workspace-footer"><span>Rangeform · No-Limit Texas Hold’em</span><span>Training ohne Echtgeld</span></footer></div>
    <nav className="mobile-navigation" aria-label="Mobile Hauptnavigation">{navigation.map(({ href, label, icon: Icon }) => <Link key={href} href={href} aria-current={activePath === href ? "page" : undefined} className={activePath === href ? "active" : ""}><Icon size={20} aria-hidden="true" /><span>{label === "Range Explorer" ? "Ranges" : label}</span></Link>)}</nav>
  </div>;
}
