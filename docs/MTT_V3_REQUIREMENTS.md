# V3 requirements — honest progress audit

Date: 2026-09-12. Source: [complete V3 owner prompt](MTT_GTO_V3_SPEC.md). This continues draft PR #5; it is not completion or acceptance of V3. “Teilweise” explicitly includes architectural preparation with no usable solved product. Synthetic tests never count as strategy coverage.

| # | Requirement | Status | Evidence / remaining work |
| --- | --- | --- | --- |
| 1 | Produktziel | Teilweise | Tournament-UI vorhanden; nutzbarer MTT-GTO-Lernfluss fehlt. |
| 2 | Wichtigste Qualitätsregel | Teilweise | Standard-GTO-Freigabe gesperrt; neuer Standardtrainer noch nicht implementiert. |
| 3 | Spieltheoretische Qualität | Teilweise | Unabhängiger BR-Prüfer für begrenzte Testspiele; kein geprüfter NLHE-Adapter. |
| 4 | Keine unbelegten GTO-Werte | Implementiert | Keine Heuristik oder Teststrategie wird als verifizierte NLHE-Solution veröffentlicht. |
| 5 | Externe GTO-Anbieter | Teilweise | Offizielle Quellen recherchiert; kein genehmigter Datenzugang. |
| 6 | Open-Source-Solver-Research | Teilweise | Kandidaten bewertet; Multiplayer-MTT-Implementierung nicht reproduziert oder abgenommen. |
| 7 | Solver-Pipeline | Teilweise | Jobpersistenz und Ablehnung funktionieren; Generator, Verifier-Adapter und Erfolgspfad fehlen. |
| 8 | Solution-Artifact | Teilweise | Schema v2 und Strukturprüfung vorhanden; vollständiger NLHE-Profilimport/Projektion fehlt. |
| 9 | Verification Gate | Teilweise | Unsichere Freigabe entfernt; unabhängige NLHE-Verifikation noch nicht verfügbar. |
| 10 | Solver Accuracy | Teilweise | Versionierte Server-Policy; keine kalibrierten NLHE-Grenzwerte oder Qualitätslabels. |
| 11 | Cross-Validation | Nicht implementiert | Keine unabhängige NLHE-Referenz unter identischen Parametern geprüft. |
| 12 | MTT als Hauptmodus | Implementiert | Tournament ist primäres Study-Ziel der Navigation und Startseite. |
| 13 | Tournament Configuration | Teilweise | Strenger Kontext und Posting-Replay; vollständige Konfigurations-UI fehlt. |
| 14 | Effective Stack | Implementiert | Minimum als Anzeigehilfe; vollständige Multiway-Stackvektoren bleiben erhalten. |
| 15 | Stack Coverage | Teilweise | Presets vorhanden; keine verifizierte Stack-Abdeckung. |
| 16 | Player Count / Handedness | Teilweise | Kontext und Replay 2–9; keine verifizierten Ranges. |
| 17 | Positionen | Implementiert | Zentrale 2–9-Handed-Positionen einschließlich HU-BTN/SB. |
| 18 | Visuelle Positionsausbildung | Implementiert | Tisch, Hero, Button/Blinds und Action-Reihenfolge; HU im Browser geprüft. |
| 19 | Multi-Action-Preflop | Teilweise | Legale Fold/Limp/Raise/Jam-Daten und Replay; keine gelösten Multi-Action-Nodes. |
| 20 | 15 BB ist nicht automatisch Jam | Teilweise | Keine automatische Jam-Regel im MTT-Modell; echte Frequenzen fehlen. |
| 21 | Preflop Betting Tree | Teilweise | Public Action Replay vorhanden; vollständiger Solver-Baum fehlt. |
| 22 | MTT Preflop Solution Coverage | Nicht implementiert | 0 verifizierte Nodes für 6/8/9 Spieler, BBA und 10–100 BB. |
| 23 | Range Matrix Redesign | Nicht implementiert | V3-Matrix mit proportionalen Solver-Action-Segmenten fehlt. |
| 24 | Action Color System | Nicht implementiert | Kein vollständiges neues V3-Farbsystem. |
| 25 | Sichtbare Prozentwerte | Nicht implementiert | Compact/Detailed-V3-Zellen fehlen. |
| 26 | Matrix Filter | Nicht implementiert | Geforderte V3-Filter nicht vollständig geliefert. |
| 27 | Pure vs Mixed | Nicht implementiert | V3-Mixed-only-Filter fehlt. |
| 28 | Combo Level | Teilweise | Cash-Sandbox zeigt Combos; kein verifizierter MTT-Combo-Detailfluss. |
| 29 | Trainer neu aufbauen | Nicht implementiert | Kein neuer solverbasierter MTT-Karteikartentrainer. |
| 30 | Trainer Feedback | Nicht implementiert | Kein Feedback aus unabhängig verifizierten MTT-Solutions. |
| 31 | Keine binäre Mixed-Bewertung | Teilweise | Vorhandene Sandbox-Frequenzbewertung; neuer Standard-GTO-Fluss fehlt. |
| 32 | Frequency Recall | Nicht implementiert | Kein Frequenzeingabe- und Bewertungsmodus. |
| 33 | Spaced Repetition | Nicht implementiert | Keine adaptive Fälligkeit oder Wiederholungsplanung. |
| 34 | Mastery | Nicht implementiert | Keine mehrdimensionale, persistierte Mastery. |
| 35 | Training Modes | Teilweise | Vorhandene Sandbox-Modi; geforderte MTT-Modusauswahl fehlt. |
| 36 | Smart Training | Nicht implementiert | Keine Priorisierung nach Mastery, Fehlern und Fälligkeit. |
| 37 | Postflop Solver Data | Nicht implementiert | Postflop verwendet weiter ausdrücklich APPROXIMATED-Daten. |
| 38 | Postflop Betting Trees | Teilweise | Begrenzte Public-Bet-Actions; keine verifizierten Postflop-Solver-Trees. |
| 39 | Solver Compute Budget | Teilweise | Jobs mit Priorität persistierbar; kein Worker oder nutzungsabhängiges Budget. |
| 40 | On-Demand Solving | Nicht implementiert | Kein ausführbarer NLHE-Generator. |
| 41 | Solution Database | Teilweise | Exakte Kontextindizes und Quarantäne; zertifizierter Publikationspfad fehlt. |
| 42 | AI Coach | Nicht implementiert | Keine AI-Anbindung an verifizierte Solverwerte. |
| 43 | Why Mode | Teilweise | Allgemeine Sandbox-Erklärungen; kein solvergestützter Erklärungsfluss. |
| 44 | Tournament Presets | Nicht implementiert | Standard/Turbo/Hyper/Short-Stack-Presets fehlen. |
| 45 | Späteres ICM | Teilweise | Strukturierte Modelldaten; vollständige ChipEV-Solution-Engine fehlt. |
| 46 | ICM State | Teilweise | Validiertes Zukunftsmodell mit globalen Stacks und Auszahlungen; keine Engine. |
| 47 | PKO State | Teilweise | Validierte Bounty-Zuordnung und progressive Anteile; keine Engine. |
| 48 | UI Game Model | Teilweise | Tournament/Cash, Modell und Grundparameter; vollständige Spot-/Trainer-UI fehlt. |
| 49 | Expand / Collapse | Implementiert | Erweiterte Konfiguration als zugängliches Details-Element. |
| 50 | Cash erhalten | Implementiert | Bestehender Cash-Sandbox-Lernfluss bleibt verfügbar und separat. |
| 51 | Keine Datenvermischung | Implementiert | Kanonische volle Kontextidentität und fail-closed Lookup; keine Fallbacks. |
| 52 | Interpolation | Implementiert | Keine Interpolation als VERIFIED zugelassen; Interpolation selbst nicht aktiv. |
| 53 | Provenance sichtbar | Teilweise | Nichtverfügbarkeit sichtbar; echte Solution-Info mangels Daten nicht verfügbar. |
| 54 | Training Safety | Teilweise | Ungeprüfte Daten erhalten keine GTO-Freigabe; Experimental-Opt-in-Settings fehlen. |
| 55 | Data Quality Dashboard | Teilweise | Persistierte Fehler und Quarantäne; vollständige Developer-Ansicht fehlt. |
| 56 | Coverage Heatmap | Nicht implementiert | Nur ehrliche Nullabdeckung, keine interaktive Heatmap. |
| 57 | Tests | Teilweise | Neue Trust-/Replay-/BR-Tests; Recall/SRS und echte NLHE-Verifikation fehlen. |
| 58 | Geforderter E2E-Fluss | Nicht implementiert | Verifizierte 8h/15BB/BBA/HJ-Solution und Trainer fehlen. |
| 59 | Legacy Approximation | Implementiert | Cash-Sandbox bleibt explizit getrennt; keine Standard-MTT-Fallbacks. |
| 60 | Implementationsreihenfolge | Teilweise | Phase 1 korrigiert; Phasen 2–6 nicht vollständig. |
| 61 | Nicht bei einem Plan stoppen | Teilweise | Konkrete Domain-/Verifier-/Persistenzänderungen; noch keine echten MTT-Nodes. |
| 62 | GitHub | Implementiert | Bestehender Feature-Branch und Draft-PR #5 fortgeführt. |
| 63 | Quality | Teilweise | Lokale Checks und Browserflows geprüft; endgültige PostgreSQL-CI separat nachzuweisen. |
| 64 | Abschlussbericht | Implementiert | Alle 66 Anforderungen mit offenem Status; keine Gesamtabnahme behauptet. |
| 65 | Definition of Done | Nicht implementiert | Mehrere verifizierte MTT-Stacks und Positionen fehlen. |
| 66 | Ultimatives Produktziel | Nicht implementiert | Reproduzierbares MTT-GTO-Studium mit adaptivem Training noch nicht nutzbar. |

Verified MTT coverage: **0** at every requested 6/8/9-handed, BBA, 10–100 BB context. Solver used for MTT: **none**. Licensed dataset: **none**. Independent evaluator: original bounded finite-game BR reference, no approved NLHE adapter. NLHE accuracy thresholds: **not yet calibrated or approved**, never selected by the artifact. Standard GTO publication remains disabled. See [trust review and QA](qa/mtt-trust-review.md) for actual mathematics, persistence behavior and limitations.

