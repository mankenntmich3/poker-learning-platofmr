# V3 — requirement-by-requirement audit

Updated 2026-09-12. Continues draft PR #5; **V3 is not complete**. The original
[66-point specification](MTT_GTO_V3_SPEC.md) remains authoritative. DONE describes
an implemented and tested behavior, not broad solver coverage. Every current
verified strategy/EV/recall/SRS result is restricted to the documented conditional
river subgame. No architectural interface is counted as a solved MTT node.

Evidence abbreviations refer to [executed QA](qa/verified-river.md),
[mathematical calibration](qa/river-calibration.json), `tests/solver/river-verification.test.ts`,
`tests/server/verified-training.test.ts`, `tests/server/verification-postgres.test.ts`
and `tests/e2e/verified-river.spec.ts`. Full gate results are in PROJECT_STATUS.md.

| Requirement | DONE/PARTIAL/OPEN | Concrete implementation | Test/Evidence | Remaining blocker |
| --- | --- | --- | --- | --- |
| 1. Produktziel | PARTIAL | Ein verifiziertes NLHE-River-Teilspiel nutzbar | River-E2E | Breites MTT-Preflop-Studium |
| 2. Wichtigste Qualitätsregel | PARTIAL | Regulärer River-Trainer nur mit verifizierten Daten | Provider-/Tampertests | Verifizierte Preflop-Nodes fehlen |
| 3. Spieltheoretische Qualität | PARTIAL | Echte vollständige BR/NashConv im bedingten River-Spiel | Zwei BR-Evaluatoren, LP | Multiway-NLHE-Verifikation |
| 4. Keine unbelegten GTO-Werte | DONE | Keine ungeprüften Frequenzen als VERIFIED; Input-Ranges klar begrenzt | Gate-/Browsertests | — |
| 5. Externe GTO-Anbieter | PARTIAL | Keine Anbieter-Charts ohne Rechte übernommen | Research und Lizenzbelege | Kein lizenzierter externer Datensatz |
| 6. Open-Source-Solver-Research | PARTIAL | MIT-DCFR gepinnt/ausgeführt; SciPy/HiGHS integriert | Solverläufe und Source-Pins | Brauchbarer Multiplayer-Preflop-Solver |
| 7. Solver-Pipeline | PARTIAL | Generator → unabhängige Prüfung → DB → Trainer funktioniert | Recompute, Integration, E2E | Multiway-Worker/Pipeline |
| 8. Solution-Artifact | PARTIAL | Echtes Artefakt mit Profil, Context, 1081 Combo-Zeilen, EV/Reach | Projektions-/Checksumtests | Weitere NLHE-Modelle |
| 9. Verification Gate | PARTIAL | Unabhängige Veröffentlichung für genau ein Modell; Rest gesperrt | Mutationstests | Preflop- und Importverifier |
| 10. Solver Accuracy | PARTIAL | Versionierte River-Grenzen und numerische Reserve kalibriert | river-calibration.json | Andere Spielmodelle kalibrieren |
| 11. Cross-Validation | PARTIAL | LP vs DCFR-Werte; separate BR-Rekonstruktion und Exhaustiv-Subset | Mathematiktests, Crosscheck | Externe breite Preflop-Referenz |
| 12. MTT als Hauptmodus | DONE | Tournament bleibt primäres Study-Ziel | mtt.spec.ts | — |
| 13. Tournament Configuration | PARTIAL | Voller strenger Kontext und Grundkonfiguration | Context-/Replaytests | Komplette freie Konfigurations-UI |
| 14. Effective Stack | DONE | Effective Stack als Minimum; voller Stackvektor bleibt erhalten | Domaintests, Jam-Rückgabe | — |
| 15. Stack Coverage | PARTIAL | Stack-Presets vorhanden; nur ein 15-BB-Ancestry-River gelöst | Coverage und Lookup | MTT 10–200 BB |
| 16. Player Count / Handedness | PARTIAL | 2–9 Sitze und Exact-Context-Identität | Positions-/Kontexttests | Gelöste Ranges je Table Size |
| 17. Positionen | DONE | Zentrale korrekte 2–9 Positionen einschließlich HU-BTN/SB | Positions-/HU-Tests | — |
| 18. Visuelle Positionsausbildung | DONE | Hero, Button, Positionserklärung und Reihenfolge im MTT-Tisch | MTT-Browserflow | — |
| 19. Multi-Action-Preflop | PARTIAL | Action-Domain kann Fold/Limp/Raise/Jam; realer River hat drei Actions | Replay und River-E2E | Gelöste Multi-Action-Preflop-Nodes |
| 20. 15 BB ist nicht automatisch Jam | PARTIAL | Keine pauschale Stack→Shove-Regel | Replay-/Kontextprüfung | Echte 15-BB-Preflop-Frequenzen |
| 21. Preflop Betting Tree | PARTIAL | Legale Preflop-History vollständig replaybar | Public-Engine-Tests | Vollständiger Preflop-Solverbaum |
| 22. MTT Preflop Solution Coverage | OPEN | 0 verifizierte MTT-Preflop-Nodes | Coverage/Exact-Lookup | 6/8/9-handed BBA 10–100 BB |
| 23. Range Matrix Redesign | PARTIAL | Proportionale 13×13-Matrix für echte River-Solution | Matrix-E2E/Screenshots | Preflop-Daten fehlen |
| 24. Action Color System | PARTIAL | Eigenständige Check/Bet/Jam-Farben und Legende | Browser/Axe | Alle Preflop-Actions/Fold-Farbsystem |
| 25. Sichtbare Prozentwerte | DONE | Compact/Detailed mit direkt sichtbaren Prozenten | Matrix-E2E | — |
| 26. Matrix Filter | PARTIAL | Actions, Jam, Bet, Mixed, Reach, EV umgesetzt | Matrix-E2E | Fold-Ansicht mit echtem Fold-Node |
| 27. Pure vs Mixed | DONE | Mixed-only und proportionale Mischungen aus echten Frequenzen | Matrix-/Grade-Tests | — |
| 28. Combo Level | DONE | Physische Combo-Details; ununterstützte/geblockte Combos ausgeschlossen | 1081-Coverage-/Provider-Tests | — |
| 29. Trainer neu aufbauen | PARTIAL | Neuer echter Poker-Tisch-Trainer mit gespeicherten Trials | River-E2E | Breite MTT-Szenarien/Sitzungsaggregation |
| 30. Trainer Feedback | DONE | Solverfrequenzen, gewählte Action, verifizierte EVs und EV Loss | Grade-/E2E-Tests | — |
| 31. Keine binäre Mixed-Bewertung | DONE | Dominant / Valid Mixed / Low / Zero statt binärem Mixed-Fehler | Grade-Test und UI | — |
| 32. Frequency Recall | DONE | Frequenzeingabe und Total-Variation-Accuracy | Recall-Integration/E2E | — |
| 33. Spaced Repetition | DONE | Kontext/Antwort/EV versioniert persistiert; adaptive Due Dates | SRS-, Export-/Persistenztests | — |
| 34. Mastery | PARTIAL | Action-/EV- und Recall-Scores; EMA je Combo/Modus | Mastery-Integration | Umfassendere gemeinsame Skill-Gewichtung |
| 35. Training Modes | PARTIAL | Range, Smart, Weaknesses, Due und Mixed | Sampling-/Browserflow | Stack-/Positions-/Preflop-Modi |
| 36. Smart Training | PARTIAL | Smart gewichtet niedrige Mastery und Fälligkeit | Service-Implementierung | Strategische Wichtigkeit und volle Priorisierung |
| 37. Postflop Solver Data | PARTIAL | Ein echter River-Solver-Node; Cash-Sandbox bleibt explizit separat | Mathematik/Browser | Breite Flop/Turn/River-Daten |
| 38. Postflop Betting Trees | PARTIAL | Gelöster River Check/50%-Bet/Jam/Fold/Call-Baum | Tree-/Payout-/BR-Tests | Weitere Größen/Raises/Straßen |
| 39. Solver Compute Budget | PARTIAL | CLI-Compute außerhalb Web-Requests; priorisierte Queue vorhanden | Ausgeführte Solverläufe | Budgetierter Worker und Kostensteuerung |
| 40. On-Demand Solving | PARTIAL | CLI-Neuberechnung tatsächlich ausführbar | solve:nlhe + verify-nlhe | On-demand Web-Jobs weiterer Kontexte |
| 41. Solution Database | PARTIAL | Atomare zertifizierte Publikation und Exact Lookup | PGlite/PG-Integration | Breites Archiv und Modelle |
| 42. AI Coach | OPEN | Keine AI-Coach-Anbindung | Kein Feature behauptet | Solvergestützter Coach |
| 43. Why Mode | PARTIAL | Exakte Scope-/EV-Erklärung; alte Sandbox-Hinweise | UI-Sichtprüfung | Combo-spezifischer Why-Modus |
| 44. Tournament Presets | OPEN | Keine Standard/Turbo/Hyper-Presets | Kein Feature behauptet | Presets mit realen Solutions |
| 45. Späteres ICM | PARTIAL | Zukunftsmodell vorbereitet; ChipEV nur enges Teilspiel | Contexttests | Breite ChipEV-Basis vor ICM |
| 46. ICM State | PARTIAL | ICM-Tournament-State validiert | ICM-Kontexttests | ICM-Engine/Solutions |
| 47. PKO State | PARTIAL | PKO/Bounty-Zuordnung validiert | PKO-Kontexttests | PKO-Engine/Solutions |
| 48. UI Game Model | PARTIAL | Spieltyp, Modell, Grundkontext und genauer River-Scope sichtbar | MTT/River-Browser | Vollständige Spot-Auswahl |
| 49. Expand / Collapse | DONE | Details/Summary für erweiterte Konfiguration/Provenance | Axe und Browser | — |
| 50. Cash erhalten | DONE | Bestehender Cash-Lernfluss erhalten | Bestehende E2E-Suite | — |
| 51. Keine Datenvermischung | DONE | Voller Context/Tree/Prior-Key, keine Fallback-Vermischung | Exact-/Tampertests | — |
| 52. Interpolation | DONE | Keine Interpolation als VERIFIED | Policy-/Provider-Gate | — |
| 53. Provenance sichtbar | DONE | Quelle, Version, Lizenz, Messung, Prüfer und Scope sichtbar | Provenance-Panel/QA | — |
| 54. Training Safety | PARTIAL | Regulärer neuer Trainer nur freigegebene Solutions | Gate-/Authtests | Vollständige Experimental-Opt-in-Settings |
| 55. Data Quality Dashboard | PARTIAL | Reports/Fehler in DB; River-Provenance sichtbar | Publikationsintegration | Developer Quality Dashboard |
| 56. Coverage Heatmap | OPEN | Ehrliche Null-Preflop-Coverage und ein separater River-Node | UI und Lookup | Interaktive Coverage Heatmap |
| 57. Tests | PARTIAL | Reale Solver-/BR-/EV-/Recall-/SRS-/Persistenz-/Browsertests | Lokale Gates + CI | Tests für noch offene Funktionen |
| 58. Geforderter E2E-Fluss | OPEN | River-Ersatzpfad besteht; geforderter 8h/15BB/HJ-Preflop-Pfad fehlt | River-E2E, MTT UNAVAILABLE | Echter geforderter Preflop-Node |
| 59. Legacy Approximation | DONE | Approximation bleibt in klar getrennter Sandbox | Bestehende und neue Browserflows | — |
| 60. Implementationsreihenfolge | PARTIAL | Daten/Verifikation zuerst, danach reale UI/Training | Implementierung/QA | Restliche V3-Phasen |
| 61. Nicht bei einem Plan stoppen | DONE | Tatsächlich ausgeführter Solver und nutzbarer gespeicherter Lernfluss | Recompute → Browser → Relogin | — |
| 62. GitHub | DONE | Bestehender Branch/PR #5 fortgeführt | Git-Commits/Draft-PR | — |
| 63. Quality | PARTIAL | Typecheck/Lint/Tests/Build und relevante Browserflows | QA/CI-Run | V3-weite und Staging-Abnahme |
| 64. Abschlussbericht | DONE | Alle 66 Punkte konkret mit Evidence und Blockern dokumentiert | Diese Tabelle | — |
| 65. Definition of Done | OPEN | V3 ausdrücklich nicht abgeschlossen | Coverage weiterhin 0 Preflop | Mehrere echte MTT-Stacks/Positionen |
| 66. Ultimatives Produktziel | OPEN | Nur enges verifiziertes Teilspiel nutzbar | Umfang ausdrücklich sichtbar | Umfassendes adaptives MTT-GTO-Studium |

**Coverage:** 1 conditional NLHE river root, 8 supported Hero combos, 56 compatible
physical deals; **0 MTT preflop nodes** at requested 6/8/9-handed BBA 10–100 BB.
No merge or deployment is implied. ICM/PKO, imported verified datasets and full
multiway preflop remain unavailable.
