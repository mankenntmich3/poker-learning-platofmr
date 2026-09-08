import type { Metadata, Viewport } from "next";
import "@fontsource-variable/manrope";
import "./globals.css";
import "./trainer-mobile.css";
import "./development-access.css";
import "./nlhe.css";
import { AppShell } from "@/components/app-shell";
import { StudyProvider } from "@/components/study-context";
import { DEVELOPMENT_DEMO, developmentAccessEnabled } from "@/server/development";

export const metadata: Metadata = { title: { default: "Rangeform — No-Limit Texas Hold’em", template: "%s | Rangeform" }, description: "No-Limit Texas Hold’em lernen: 6-max Preflop-Ranges, konkrete Hände und gespeicherter Lernfortschritt." };
export const viewport: Viewport = { width: "device-width", initialScale: 1, themeColor: "#0e141c" };
export default function RootLayout({ children }: Readonly<{ children: React.ReactNode }>) { return <html lang="de" data-scroll-behavior="smooth"><body><StudyProvider developmentDemo={developmentAccessEnabled() ? DEVELOPMENT_DEMO : null}><AppShell>{children}</AppShell></StudyProvider></body></html>; }
