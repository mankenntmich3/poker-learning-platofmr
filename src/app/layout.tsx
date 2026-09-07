import type { Metadata, Viewport } from "next";
import "@fontsource-variable/manrope";
import "./globals.css";
import "./trainer-mobile.css";
import { AppShell } from "@/components/app-shell";
import { StudyProvider } from "@/components/study-context";

export const metadata: Metadata = { title: { default: "Rangeform — Dein Poker-Trainingsraum", template: "%s | Rangeform" }, description: "Poker verstehen, Entscheidungen trainieren und Fortschritt sichtbar machen. Dein persönlicher Poker-Trainingsraum." };
export const viewport: Viewport = { width: "device-width", initialScale: 1, themeColor: "#0e141c" };
export default function RootLayout({ children }: Readonly<{ children: React.ReactNode }>) { return <html lang="de"><body><StudyProvider><AppShell>{children}</AppShell></StudyProvider></body></html>; }
