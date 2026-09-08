import type { Metadata, Viewport } from "next";
import "@fontsource-variable/manrope";
import "./globals.css";
import "./trainer-mobile.css";
import "./development-access.css";
import { AppShell } from "@/components/app-shell";
import { StudyProvider } from "@/components/study-context";
import { DEVELOPMENT_DEMO, developmentAccessEnabled } from "@/server/development";

export const metadata: Metadata = { title: { default: "Rangeform — Dein Poker-Trainingsraum", template: "%s | Rangeform" }, description: "Poker verstehen, Entscheidungen trainieren und Fortschritt sichtbar machen. Dein persönlicher Poker-Trainingsraum." };
export const viewport: Viewport = { width: "device-width", initialScale: 1, themeColor: "#0e141c" };
export default function RootLayout({ children }: Readonly<{ children: React.ReactNode }>) { return <html lang="de"><body><StudyProvider developmentDemo={developmentAccessEnabled() ? DEVELOPMENT_DEMO : null}><AppShell>{children}</AppShell></StudyProvider></body></html>; }
