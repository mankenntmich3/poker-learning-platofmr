Setze die Arbeit auf `feature/mtt-gto-accuracy-v3` / Draft PR #5 fort.

Der bisherige Prompt 2 hat eine wichtige technische Grenze belastbar nachgewiesen. Versuche jetzt NICHT, denselben unabstracted `PLAY_TO_TERMINAL`-Ansatz lediglich mit mehr RAM, mehr Infosets oder mehr Iterationen weiter hochzuskalieren.

Die bisherigen Messungen zeigen:

- vollständiger HU-Kartenraum wird erreicht,
- der Multi-Action-Tree wird tatsächlich gespielt,
- Suit-Isomorphism funktioniert verlustfrei,
- aber der Solver erzeugt Millionen Information Sets,
- ein sehr großer Anteil erhält keine ausreichend gemittelte Strategie,
- der unabhängige Verifier findet eine profitable legale Abweichung,
- der aktuelle Kandidat hat eine nachgewiesene NashConv-Untergrenze von etwa 0.089 BB/Hand,
- daher ist nicht nur der Verifier zu teuer, sondern die aktuelle Strategie selbst noch deutlich zu ungenau.

Prompt 2 bleibt fachlich unvollständig. Der nächste Meilenstein ist deshalb ein Solver-Architekturwechsel.

==================================================
1. OBERSTES ZIEL
==================================================

Baue einen skalierbaren Preflop-Solverkern, der einen vollständigen HU-Multi-Action-Node über den gesamten Startkartenraum mit hoher Qualität lösen und unabhängig prüfen kann.

Zielspot zunächst ausschließlich:

Tournament ChipEV
Heads-Up
BTN/SB vs BB
15 BB
BBA 1

Full prior / vollständige Startkartenrange.

Preflop-Actions mindestens:

BTN/SB:
- Fold
- Limp
- Small Raise
- Jam

BB vs Limp:
- Check
- Raise
- Jam

BB vs Small Raise:
- Fold
- Call
- 3-Bet
- Jam

BTN/SB vs 3-Bet:
- Fold
- Call
- Jam / 4-Bet falls strategisch sinnvoll und rechnerisch vertretbar

Keine weitere Table-Size-Coverage, bevor dieser Kernspot funktioniert.

==================================================
2. NICHT MEHR EXAKTES FULL-POSTFLOP IM PREFLOP-SOLVER ERZWINGEN
==================================================

Der aktuelle Ansatz:

Preflop
→ Non-All-in Call
→ exakter Flop
→ exakter Turn
→ exakter River
→ vollständiger physischer Kartenraum
→ keine Card Abstraction

erzeugt einen unpraktisch großen Informationsraum.

Ersetze diesen Ansatz für den Preflop-Solver durch eine skalierbare, explizit versionierte Continuation-Architektur.

Benchmarke mindestens zwei ernsthafte Varianten:

A)
Preflop CFR mit abstrahiertem Postflop-Subgame.

B)
Depth-limited Preflop Solving mit einem separat berechneten Postflop Continuation-Value-Oracle.

Entscheide anhand realer Benchmarks und mathematischer Prüfbarkeit, nicht aufgrund von Implementierungsbequemlichkeit.

==================================================
3. KEINE HEURISTISCHEN FAKE-CONTINUATION-VALUES
==================================================

Continuation Values dürfen nicht sein:

- LLM-Schätzungen
- handScore-Heuristiken
- feste Equity-Realization-Faktoren ohne Kalibrierung
- zufällige Tabellenwerte

Sie müssen aus einem dokumentierten mathematischen Modell stammen.

Geeignete Ansätze können sein:

- separat gelöste Postflop-Subgames
- Equity-/Texture-Buckets mit gelöstem Betting Tree
- öffentlich zustandsfaktorisierte CFR-Modelle
- versionierte Value Functions, die aus Solver-Solutions gelernt wurden

Wenn Abstraktion verwendet wird, muss sie explizit Teil der Solution Identity sein.

==================================================
4. ABSTRACTION CONTRACT
==================================================

Führe eine versionierte Solver-Modellidentität ein.

Beispiel:

`PREFLOP_MODEL_V2`

enthält mindestens:

- preflop betting tree
- continuation model
- board abstraction
- private-hand abstraction
- action abstraction
- solver algorithm
- convergence policy
- verifier version

Eine Lösung gilt ausschließlich für genau dieses Modell.

Keine stille Modelländerung.

==================================================
5. ROOT-KARTENRAUM EXAKT ERHALTEN
==================================================

Die vollständige Preflop-Range darf nicht reduziert oder heuristisch beschnitten werden.

Alle 1326 physischen Startkombinationen bleiben repräsentierbar.

Am Preflop-Root darf verlustfreie Suit Symmetry verwendet werden.

Strategien müssen weiterhin auf die physischen Combos projizierbar sein.

Die UI darf anschließend wie bisher auf 169 Handklassen aggregieren.

==================================================
6. PUBLIC-STATE FACTORIZATION
==================================================

Refaktoriere die Solverrepräsentation.

Keine unnötigen großen JSON-/String-Information-Keys in Hot Paths.

Nutze kompakte Identitäten aus:

- public node id
- street
- player
- private hand / bucket
- relevant perfect-recall state

Betting-History soll über gemeinsame Public-State-Nodes faktorisiert werden.

Identische öffentliche Zustände dürfen nicht tausendfach strukturell dupliziert werden.

==================================================
7. SPEICHERLAYOUT
==================================================

Benchmarke array-/indexbasierte Regret- und Strategy-Speicherung gegen den aktuellen Map/Object-Ansatz.

Ziel:

- wesentlich weniger Heap pro Infoset
- weniger GC
- bessere Cache Locality
- schnelleres Updating
- effizientes Checkpointing

Sparse Strukturen nur dort einsetzen, wo sie tatsächlich sparsamer sind.

==================================================
8. SOLVER-SPRACHE / HOT PATH
==================================================

TypeScript muss nicht der eigentliche High-Performance-Solver bleiben.

Benchmarke mindestens:

- optimiertes bestehendes TypeScript
- Python + Numba, falls sinnvoll
- Rust oder C++ für den Traversal-/Regret-Hot-Path

Wähle die Variante anhand gemessener:

- nodes/sec
- infosets/sec
- memory/info set
- convergence progress / second

Die Web-App darf weiterhin TypeScript bleiben.

Solver kann ein separater Worker/Binary sein.

==================================================
9. SOLVER-ALGORITHMEN BENCHMARKEN
==================================================

Bewerte für dieses konkrete Spiel mindestens:

- External-Sampling MCCFR
- CFR+
- DCFR
- gegebenenfalls Outcome Sampling / andere geeignete MCCFR-Varianten
- Sequence Form / LP für ausreichend kleine abstrahierte Modelle

Nicht theoretisch diskutieren, sondern mindestens kleine kalibrierbare Modelle wirklich ausführen.

Beurteile:

- Konvergenzgeschwindigkeit
- Speicher
- Parallelisierbarkeit
- unabhängige Verifizierbarkeit

==================================================
10. POSTFLOP-ABSTRAKTION
==================================================

Entwickle eine strategisch sinnvolle, kontrollierte Postflop-Abstraktion.

Beispiele, sofern mathematisch sinnvoll:

Board-/Hand-Cluster anhand:

- Equity
- Equity Distribution / Histogram
- Draw Potential
- Nut Potential
- Board Texture

Action Tree bewusst klein halten.

Beispielhafte Sizes:

Flop:
- Check
- 33%
- 75%
- Jam, falls SPR sinnvoll

Turn:
- Check
- 50%
- 100%
- Jam

River:
- Check
- 50%
- 100%
- Jam

Diese Größen sind nur Ausgangspunkte.

Wähle den kleinsten strategisch sinnvollen Baum anhand von Benchmarks.

Nicht jede theoretisch mögliche Bet Size lösen.

==================================================
11. MODELLQUALITÄT STATT SCHEINGENAUIGKEIT
==================================================

Das Ziel ist eine sehr hochwertige Solver-Approximation unter expliziten Modellannahmen.

Nicht behaupten:

`exact unrestricted NLHE GTO`

wenn Card/Action Abstraction verwendet wird.

Stattdessen fachlich korrekt kennzeichnen, z.B.:

`VERIFIED_SOLVER · PREFLOP_MODEL_V2`

oder

`VERIFIED ABSTRACT EQUILIBRIUM`

Die Nutzeroberfläche soll später die wichtigen praktischen Strategy-Frequenzen zeigen, nicht mit mathematischen Details überladen werden.

==================================================
12. ZWEISTUFIGE VERIFIKATION
==================================================

Stufe 1:

Unabhängige vollständige Verifikation DES GELÖSTEN MODELLS.

Berechne soweit möglich:

- Profile Values
- Best Responses
- NashConv
- HU Exploitability

Diese Prüfung muss eine obere bzw. vollständige Qualitätsaussage liefern können, nicht nur profitable Abweichungen finden.

Stufe 2:

Unabhängige Physical-NLHE-Deviation-Tests gegen das Solverprofil.

Zweck:

Abstraktions-/Modellfehler entdecken.

Ein positiver Witness lehnt ab.

Kein gefundener Witness allein darf nicht als Equilibrium-Zertifikat gelten.

==================================================
13. VERIFIER EBENFALLS FAKTORISIEREN
==================================================

Der Verifier darf nicht erneut den gesamten physischen 55-Billionen-Chance-Tree materialisieren.

Verwende:

- Public-State-Factorization
- Suit Isomorphism
- Vectorized hand/range evaluation
- Sequence-form BR oder andere vollständige Information-Set-BR-Methode
- kompakte Chance-Operatoren

Generator und Verifier müssen weiterhin unabhängige Implementierungen bleiben.

==================================================
14. KALIBRIERUNG
==================================================

Bevor der neue HU Node veröffentlicht werden darf:

prüfe den neuen Solver/Verifier zuerst gegen bestehende exakt lösbare Modelle.

Mindestens:

- vorhandenes verified River-Teilspiel
- vorhandenes conditional HU Push/Fold
- vollständiger Full-Prior HU Push/Fold-Tree, sofern jetzt exakt prüfbar
- kleine künstliche Spiele mit analytischem Gleichgewicht

Neue Solver/Verifier müssen dort bekannte Ergebnisse reproduzieren.

==================================================
15. STABILITÄT
==================================================

Für den HU-15BB-Kernspot mehrere unabhängige Seeds / Runs verwenden.

Messe:

- Strategy-frequency distance zwischen Runs
- EV distance
- NashConv
- Root-frequency stability
- runtime
- memory

Eine einzelne zufällig gute Run-Datei reicht nicht.

==================================================
16. QUALITY POLICY
==================================================

Leite serverseitige Qualitätsgrenzen erst aus Kalibrierung ab.

Nicht willkürlich Schwellen festlegen.

Policy versionieren nach:

- model id
- solver
- verifier
- abstraction
- compute configuration

Keine Artifact-eigenen Thresholds.

==================================================
17. COMPLETE HU NODE
==================================================

Definition des ersten Ziel-Artefakts:

HU
15 BB
BBA 1
BTN/SB root
vollständiger Kartenraum
Multi-Action

Matrix muss alle 169 Handklassen sinnvoll zeigen.

Physische Combos weiterhin verfügbar.

Für jede Action:

- Frequency
- Action EV
- Strategy EV
- EV difference

Nur aus dem tatsächlich freigegebenen Modell.

==================================================
18. TRAINER
==================================================

Erst wenn der neue HU Node freigegeben ist:

bestehenden Trainer damit verbinden.

Keine neue UI bauen.

Bestehende:

- PokerTable
- segmented range matrix
- Frequency Recall
- EV Loss
- Mastery
- Spaced Repetition

wiederverwenden.

==================================================
19. KEINE MULTIWAY-EXPANSION IN DIESEM LAUF
==================================================

Noch keine weitere Arbeit an:

3-handed
6-handed
8-handed
9-handed

außer Regressionstests.

Zuerst muss der skalierbare HU-Kern funktionieren.

==================================================
20. KEIN FEATURE-DETOUR
==================================================

Noch nicht:

Screenshot Import
Hand History Import
Spot Builder
Academy
AI Coach
ICM
PKO
Postflop Produkt-UI

Diese Produktvision bleibt erhalten, ist aber nicht der aktuelle Engpass.

==================================================
21. ERFOLGSKRITERIUM
==================================================

Dieser Lauf ist erfolgreich, wenn mindestens:

- ein skalierbares neues Solvermodell tatsächlich ausgeführt wird
- vollständige HU Root Range verarbeitet wird
- Multi-Action Tree enthalten ist
- Solver wesentlich bessere Coverage/Konvergenz als der bisherige Sparse-Multistreet-Ansatz erreicht
- unabhängige Modell-BR/NashConv-Verifikation erfolgreich abgeschlossen wird
- mehrere Seeds eine stabile Root-Strategie liefern
- ein HU-15BB-BBA-Node die serverseitige Quality Policy besteht
- erst dann Matrix/Trainer freigeschaltet werden

==================================================
22. WENN KEINE VARIANTE BESTEHT
==================================================

Nicht erneut lediglich Compute-Limits erhöhen.

Vergleiche die getesteten Architekturen quantitativ und dokumentiere:

- warum sie scheitern
- nodes/sec
- memory
- infoset coverage
- convergence
- BR result
- welches Design am aussichtsreichsten ist

Danach implementiere den nächsten technisch begründeten Ansatz innerhalb dieses Laufs, soweit Budget verfügbar.

==================================================
23. PR / DEPLOYMENT
==================================================

PR #5 bleibt Draft.

Kein Render/Staging Deployment während dieses Architektur-Laufs.

Bestehende verified conditional HU/River-Daten bleiben unverändert.

Keine unverified Strategy darf den normalen Trainer erreichen.

==================================================
24. ABSCHLUSSBERICHT
==================================================

Am Ende berichten:

- alte vs neue Solverarchitektur
- gewählte Continuation-Strategie
- verwendete Abstraktion
- Solveralgorithmus
- Solver-Sprache
- Nodes/sec
- Infosets
- Memory
- Laufzeit
- NashConv / Exploitability
- Seed-Stabilität
- Combo Coverage
- Action-EVs verfügbar?
- Verifier-Methode
- Physical Deviation Tests
- VERIFIED ja/nein
- noch offene technische Grenze

Prompt 2 darf erst als fachlich überwunden gelten, wenn der vollständige HU Multi-Action-Node mit dem neuen Ansatz tatsächlich freigegeben werden kann.

Accuracy > Coverage.
Practical strategic quality > unnecessary tree explosion.
Missing solution > false solution.