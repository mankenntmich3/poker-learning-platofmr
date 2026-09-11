import type { Metadata, Viewport } from "next";
import "@fontsource-variable/manrope";
import "./globals.css";
import "./trainer-mobile.css";
import "./development-access.css";
import "./nlhe.css";
import "./study-engine.css";
import "./mtt.css";
import { AppShell } from "@/components/app-shell";
import { StudyProvider } from "@/components/study-context";
import { DEVELOPMENT_DEMO, developmentAccessEnabled } from "@/server/development";

export const metadata: Metadata = { title: { default: "Rangeform — MTT NLHE Study", template: "%s | Rangeform" }, description: "MTT No-Limit Texas Hold’em lernen: verifizierte Solver-Strategien, konkrete Hände und gespeicherter Lernfortschritt." };
export const viewport: Viewport = { width: "device-width", initialScale: 1, themeColor: "#0e141c" };
export default function RootLayout({ children }: Readonly<{ children: React.ReactNode }>) { return <html lang="de" data-scroll-behavior="smooth"><body><StudyProvider developmentDemo={developmentAccessEnabled() ? DEVELOPMENT_DEMO : null}><AppShell>{children}</AppShell></StudyProvider></body></html>; }
