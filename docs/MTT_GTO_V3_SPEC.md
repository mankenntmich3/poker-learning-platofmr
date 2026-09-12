Du arbeitest am bestehenden Projekt:

GitHub:
`mankenntmich3/poker-learning-platofmr`

Staging:
`https://rangeform-staging.onrender.com`

Das bestehende Produkt „Rangeform“ ist bereits eine funktionierende NLHE-Study-Plattform mit:

- Preflop Range Explorer
- Postflop Study Engine
- freier Kartenwahl
- Action Trees
- Pot-/Stack-Engine
- Range Funnel
- Equity-Berechnung
- Analyse
- Trainer
- Progress
- Login
- Favoriten / History
- Render Deployment

Die zentrale Schwäche ist aktuell NICHT mehr die Infrastruktur, sondern die **strategische Datenqualität**.

Aktuell existieren noch:

- heuristische Preflop-Ranges
- `handScore()`-Logik
- `ApproximationProvider`
- kategoriebasierte Postflop-Frequenzen
- keine verifizierten Solver-EVs
- keine nachgewiesene GTO-Konvergenz

Das muss sich mit diesem Projekt grundlegend ändern.

==================================================
1. PRODUKTZIEL
==================================================

Rangeform soll primär zu einer hochwertigen:

`MTT NLHE GTO Study & Training Platform`

werden.

Hauptmodus:

`MTT ChipEV`

mit:

- Antes
- Big Blind Ante
- verschiedenen Table Sizes
- verschiedenen effektiven Stacks
- mehreren Preflop-Actions
- Solver-verifizierten Strategien
- adaptivem Training

Cash soll NICHT entfernt werden.

Cash bleibt als eigenständiger Modus bestehen.

Produktstruktur:

GAME TYPE

- Tournament
- Cash

TOURNAMENT MODEL

- ChipEV → jetzt vollständig implementieren
- ICM → Architektur jetzt vorbereiten, Solution Engine später
- PKO / Bounty → Architektur vorbereiten
- Mystery Bounty → Architektur vorbereiten

Der Default-Modus der Plattform soll Tournament / ChipEV sein.

==================================================
2. WICHTIGSTE QUALITÄTSREGEL
==================================================

Rangeform darf dem Nutzer KEINE Strategie als GTO beibringen, wenn diese nicht entsprechend validiert wurde.

Trenne streng:

`VERIFIED_SOLVER`

`IMPORTED_VERIFIED`

`APPROXIMATED`

`DEMO`

Der normale GTO-Trainer darf ausschließlich Nodes aus:

- VERIFIED_SOLVER
- IMPORTED_VERIFIED

verwenden.

APPROXIMATED darf weiterhin für:

- Sandbox
- UI Demo
- Entwicklungszwecke

existieren.

Aber:

APPROXIMATED STRATEGIES DÜRFEN NICHT IM STANDARD-GTO-TRAINER ABGEFRAGT WERDEN.

Wenn keine valide Solution vorhanden ist:

zeige:

`Verified GTO solution currently unavailable.`

Nicht stattdessen Werte erfinden.

==================================================
3. SPIELTHEORETISCHE QUALITÄT
==================================================

Verwende für eigene Solver-Lösungen etablierte game-theoretische Verfahren.

Bevorzugt:

- CFR
- CFR+
- DCFR
- MCCFR falls sinnvoll
- Best Response Evaluation
- NashConv / Exploitability Messung

Das Ziel ist nicht:

„plausible Pokerstrategie“.

Das Ziel ist:

„eine numerisch konvergierte Approximation eines Nash Equilibrium innerhalb des definierten Betting Trees“.

Jede veröffentlichte Solver-Solution benötigt daher:

- Algorithmus
- Solver Version
- Betting Tree
- Stack
- Ante
- Player Count
- Positionen
- Blinds
- erlaubte Bet Sizes
- Iterationen
- Laufzeit
- convergence metric
- exploitability / NashConv
- Abstraction Details
- Generation timestamp
- checksum
- source/license

==================================================
4. KEINE UNBELEGTEN GTO-WERTE
==================================================

Strikte Regel:

Keine Strategie darf allein auf:

- LLM-Schätzung
- Heuristik
- Handranking
- Rangeform `handScore()`
- Blogartikel
- Chart-Screenshot
- intuitiver Pokerlogik

basieren und anschließend als GTO bezeichnet werden.

LLMs dürfen:

- erklären
- dokumentieren
- Ergebnisse interpretieren
- Benutzer coachen

Sie dürfen NICHT:

GTO-Frequenzen erfinden.

Architektur:

`Solver → Verified Strategy Data → Rangeform → AI Explanation`

nicht:

`AI → erfundene Pokerfrequenz`.

==================================================
5. EXTERNE GTO-ANBIETER
==================================================

Recherchiere aktuelle öffentlich verfügbare Möglichkeiten bei:

- GTO Wizard
- GTO LAB
- DTO
- PioSolver
- Simple Postflop
- MonkerSolver
- HRC
- GTOBase
- anderen aktuellen Anbietern

Prüfe:

- offizielle API
- lizenzierbare Solution-Daten
- kommerzielle / private Data Licensing
- SDK
- Enterprise/B2B access
- zulässige Exporte

Falls ein Anbieter einen ausdrücklich zulässigen Datenzugang anbietet:

baue dafür optional einen Provider.

WICHTIG:

NICHT:

- scrapen
- Reverse Engineering geschützter APIs
- automatisiert Strategy-Daten extrahieren
- technische Schutzmaßnahmen umgehen
- proprietäre Datenbanken kopieren
- Anbieter-Solutions zur Model Distillation missbrauchen

ohne ausdrückliche Nutzungsberechtigung.

GTO Wizard / GTO LAB können jedoch als manuelle Qualitätsreferenz einzelner Spots dienen, sofern dies deren Bedingungen erlaubt.

==================================================
6. OPEN-SOURCE-SOLVER RESEARCH
==================================================

Prüfe insbesondere aktuelle Open-Source-CFR/DCFR-Poker-Solver.

Bewerte jeden Kandidaten nach:

- Lizenz
- Preflop Support
- Postflop Support
- Multiway Support
- MTT Support
- Antes
- arbitrary stacks
- arbitrary bet sizes
- EV output
- exploitability measurement
- performance
- Rust/C++/Python
- Webservice integration

Bevor ein Solver integriert wird:

Lizenzbedingungen dokumentieren.

Nur Solver verwenden, die rechtlich für dieses Projekt geeignet sind.

==================================================
7. SOLVER PIPELINE
==================================================

Baue eine neue Pipeline:

`Solver Job`
→
`Solution Validator`
→
`Strategy Artifact`
→
`Database / Object Storage`
→
`StrategyProvider`
→
`Study UI / Trainer`

Solver muss nicht bei jeder Anfrage live rechnen.

Strategien sollen vorzugsweise precomputed und gecached werden.

Beispiel Node:

8-handed
MTT ChipEV
BBA 1 BB
20 BB effective
HJ RFI

wird einmal hochpräzise berechnet.

Danach wird die Solution gespeichert.

==================================================
8. SOLUTION ARTIFACT
==================================================

Entwerfe ein versioniertes Format.

Beispiel:

```ts
interface VerifiedSolutionArtifact {
  id: string

  game: 'NLHE'
  format: 'MTT'

  model: 'CHIP_EV'

  players: number

  stackBb: number

  blinds: {
    sb: number
    bb: number
  }

  ante: {
    type: 'NONE' | 'BBA' | 'PLAYER'
    amountBb: number
  }

  positions: Position[]

  actionHistory: PokerAction[]

  board?: Card[]

  strategies: ComboStrategy[]

  evs?: ActionEV[]

  solver: {
    name: string
    version: string
    algorithm: string
  }

  convergence: {
    metric: string
    value: number
    threshold: number
    passed: boolean
  }

  exploitability?: number

  generatedAt: string

  checksum: string

  license: string
}
```

==================================================
9. VERIFICATION GATE
==================================================

Keine eigene Solution darf automatisch als VERIFIED_SOLVER gelten.

Implementiere eine Quality Gate Pipeline.

Beispiel:

Solution computed

→ numerical sanity checks

→ strategy frequencies sum to 1

→ legal actions only

→ no blocked combos

→ EV consistency

→ best response

→ exploitability measurement

→ convergence threshold

→ deterministic regeneration sample

→ cross-validation sample

→ VERIFIED

Falls Quality Gate scheitert:

status:

`FAILED_VALIDATION`

und niemals im GTO-Trainer verwenden.

==================================================
10. SOLVER ACCURACY
==================================================

Definiere konservative Qualitätsgrenzen.

Die genaue Schwelle soll anhand des verwendeten Solvers und Metrics festgelegt und dokumentiert werden.

Rangeform muss dem Nutzer zeigen können:

Solution Quality:

Very High
High
Experimental

Zum Beispiel basierend auf:

- exploitability
- NashConv
- iteration stability
- EV stability

Keine willkürliche Bewertung.

==================================================
11. CROSS-VALIDATION
==================================================

Für ausgewählte Standardspots:

vergleiche Resultate mit mindestens einer unabhängigen hochwertigen Referenz, soweit rechtlich zulässig.

Vergleiche:

- total opening %
- total jam %
- total call %
- hand-class actions
- mixed boundaries
- EV ordering

Speichere Abweichungen.

Nicht erwarten, dass unterschiedliche Betting Trees identische Werte ergeben.

Vergleich nur bei:

- gleichem Stack
- gleichen Antes
- gleicher Handedness
- gleichen Bet Sizes
- gleichem Game Model

==================================================
12. MTT ALS HAUPTMODUS
==================================================

Rangeform soll standardmäßig starten mit:

Tournament
ChipEV

Nicht mehr primär:

6-max Cash.

Cash bleibt über Game Type auswählbar.

==================================================
13. TOURNAMENT CONFIGURATION
==================================================

Tournament ChipEV benötigt:

Player Count
Effective Stack
Blinds
Ante
Position
Action History

Default:

SB = 0.5 BB
BB = 1 BB
BBA = 1 BB

Aber konfigurierbar.

Ante types:

NONE
BBA
PLAYER_ANTE
CUSTOM

==================================================
14. EFFECTIVE STACK
==================================================

Effective Stack muss korrekt definiert sein.

Effective Stack = kleinster aktuell relevanter Stack zwischen den beteiligten Spielern.

Nicht:

Summe beider Stacks.

Wenn:

Hero 15 BB
Villain 40 BB

→ Effective Stack = 15 BB.

UI soll dies bei Bedarf erklären.

==================================================
15. STACK COVERAGE
==================================================

Unterstütze:

10
12
15
17
20
25
30
40
50
60
80
100
150
200 BB

Custom Stack optional.

Priorität:

10–50 BB = höchste Priorität

50–100 BB = sehr hoch

100–200 BB = sekundär

==================================================
16. PLAYER COUNT / HANDEDNESS
==================================================

Unterstütze:

2-handed
3-handed
4-handed
5-handed
6-handed
7-handed
8-handed
9-handed

Ranges müssen anhand der tatsächlichen Table Size geladen werden.

Nicht nur:

6-max Range mit anderen Labels.

==================================================
17. POSITIONS
==================================================

Implementiere korrekte dynamische Positionen.

Beispiel 9-handed:

UTG
UTG+1
UTG+2
LJ
HJ
CO
BTN
SB
BB

Beispiel 8-handed:

UTG
UTG+1
LJ
HJ
CO
BTN
SB
BB

Beispiel 6-handed:

UTG
HJ
CO
BTN
SB
BB

Verwende eine zentrale Positions-Engine.

==================================================
18. VISUELLE POSITIONSAUSBILDUNG
==================================================

Da der Nutzer Positionen lernen möchte:

Baue eine Pokertisch-Visualisierung.

Zeige:

- Dealer Button
- SB
- BB
- Hero
- Position Labels
- Preflop Action Order
- Postflop Action Order

Wenn HJ ausgewählt ist:

zeige zum Beispiel:

`HJ · Hijack`

und:

`zwei Plätze vor dem Button`

bzw. eine fachlich korrekte Beschreibung.

Positionen sollen visuell lernbar sein.

==================================================
19. PREFLOP MUSS MULTI-ACTION WERDEN
==================================================

Aktuell ist RFI praktisch:

Fold
Raise

Das reicht nicht.

Ein Solver Node muss mehrere Actions gleichzeitig unterstützen.

Beispielsweise bei 15 BB:

Fold

Limp

Raise 2.0 BB

Raise 2.1 BB

Raise 2.2 BB

Raise 2.25 BB

Jam 15 BB

Aber:

Nur Actions anzeigen, die im verwendeten Betting Tree existieren.

==================================================
20. 15 BB IST NICHT AUTOMATISCH JAM
==================================================

Der Stack definiert NICHT die Action.

Beispiel:

15 BB Effective Stack

kann gleichzeitig enthalten:

- Small Raise
- Limp
- Jam
- Fold

Die Solver-Solution bestimmt Frequenzen.

Nicht hartkodieren:

„≤15 BB = shove“.

==================================================
21. PREFLOP BETTING TREE
==================================================

Das Preflop-Modell soll mindestens unterstützen:

RFI

vs Open

vs Limp

vs 3-Bet

vs Jam

4-Bet

4-Bet Jam

Call vs Jam

Blind vs Blind

SB Limp / BB response

BB Defense

==================================================
22. MTT PREFLOP SOLUTION COVERAGE
==================================================

Priorisiere zunächst:

6-handed
8-handed
9-handed

MTT ChipEV
BBA

für:

RFI
BB vs Open
SB vs Open
BTN vs Blinds
vs 3-Bet
Jam / Call
Blind vs Blind

Danach weitere Table Sizes.

==================================================
23. RANGE MATRIX DESIGN KOMPLETT VERBESSERN
==================================================

Die Matrix ist aktuell visuell zu simpel.

Baue ein hochwertiges GTO-Study-Interface.

Jede Handzelle kann mehrere Action Segments besitzen.

Beispiel:

AJo:

Fold 10%
Raise 2x 55%
Jam 35%

Die Zellfläche muss proportional segmentiert werden.

Segmentfläche = Action Frequency.

==================================================
24. ACTION COLOR SYSTEM
==================================================

Verwende eine konsistente moderne Farbsemantik.

Beispiel:

Fold → Rot

Check → neutral / Grau

Call → Grün

Small Raise → Blau

größere Raises → Blau/Violett

Jam / All-in → Gold/Orange

Postflop unterschiedliche Bet Sizes:
klar unterscheidbar.

Farbgebung soll:

- kontrastreich
- zugänglich
- konsistent

sein.

==================================================
25. PROZENTWERTE DIREKT SICHTBAR
==================================================

Der Nutzer soll nicht jede Hand anklicken müssen.

Implementiere:

Compact View

und:

Detailed View.

Compact:

dominante Aktion sichtbar.

Detailed:

z. B.

`55 R`
`35 J`
`10 F`

direkt innerhalb der Matrixzelle.

Tooltip/Click zeigt:

Fold 10.0%
Raise 2.0 BB 55.0%
Jam 15 BB 35.0%

==================================================
26. MATRIX FILTER
==================================================

Ansichten:

Strategy

Dominant Action

Mixed Strategies

Raise

Jam

Call

Fold

EV

Reach

==================================================
27. PURE VS MIXED
==================================================

Mixed Strategy Nodes müssen deutlich erkennbar sein.

Filter:

`Show mixed hands only`

Beispiel:

Hände mit:

max action frequency < 95%

==================================================
28. COMBO LEVEL
==================================================

Handklassenmatrix ist nicht genug.

Bei Klick auf:

AKs

zeige:

AsKs
AhKh
AdKd
AcKc

mit individuellen Strategy Frequencies.

Gerade Postflop zwingend.

==================================================
29. TRAINER NEU AUFBAUEN
==================================================

Der Trainer soll wie ein echtes Karteikarten-/Spaced-Repetition-System funktionieren.

Beispiel Karte:

MTT ChipEV
8-handed
BBA 1
15 BB
HJ
RFI

Hero:

A♠ Q♦

Frage:

Was ist deine Action?

Buttons:

Fold

Limp

Raise 2x

Raise 2.2x

Jam

==================================================
30. TRAINER FEEDBACK
==================================================

Nach Entscheidung:

zeige groß:

SOLVER STRATEGY

Raise 2x: 72%

Jam: 28%

Dann:

Your action:
Jam

Bewertung:

Valid mixed action

oder:

Low-frequency action

oder:

Strategic error

==================================================
31. KEINE BINÄRE MIXED-STRATEGY-BEWERTUNG
==================================================

Wenn:

Raise = 55%

Jam = 45%

dann darf Jam NICHT als falsch markiert werden.

Unterscheide:

- valid action
- dominant action
- low frequency action
- zero frequency action

und falls EV vorhanden:

EV loss.

==================================================
32. FREQUENCY RECALL MODE
==================================================

Zusätzlich:

`Frequency Recall`

Beispiel:

Wie spielt AQo hier?

Nutzer gibt selbst ein:

Raise: 70%
Jam: 30%

Dann:

Solver:

Raise 74%
Jam 26%

Score:

94%

Dies soll gezielt Range-Memorisierung trainieren.

==================================================
33. SPACED REPETITION
==================================================

Implementiere adaptive Wiederholung.

Pro Spot speichern:

stack
players
position
ante
hand
actions
solver frequencies
user action
frequency estimate
EV loss
attempt count
last seen
mastery score

Fehler:

schneller erneut zeigen.

Sicher beherrscht:

später wiederholen.

==================================================
34. MASTERY
==================================================

Mastery darf nicht nur sein:

„richtig/falsch“.

Berücksichtige:

- Action correctness
- Frequency accuracy
- EV loss
- Wiederholungskonsistenz
- Reaktionszeit optional

==================================================
35. TRAINING MODES
==================================================

Mindestens:

Smart Training

My Weaknesses

Due for Review

Random

Preflop Only

Postflop Only

10–20 BB

20–40 BB

40–100 BB

RFI

BB Defense

vs 3-Bet

Jam / Call

Mixed Strategy Spots

Custom

==================================================
36. SMART TRAINING
==================================================

Default sollte sein:

Smart Training.

Algorithmus priorisiert:

- schwache Mastery
- zuletzt falsch
- hohe EV Fehler
- selten trainiert
- strategisch wichtige Spots
- fällige Wiederholungen

==================================================
37. POSTFLOP SOLVER DATA
==================================================

Die bestehende Postflop Study Engine bleibt bestehen.

Ersetze jedoch soweit möglich:

`ApproximationProvider`

durch echten Solver Output.

Priorität:

Heads-up Postflop

SRP

3-Bet Pots

häufige Stacktiefen.

==================================================
38. POSTFLOP BETTING TREES
==================================================

Solver darf nur definierte Bet Trees lösen.

Beispiel:

Flop:

Check
25%
33%
50%
75%
100%
125%

Turn/River:

ähnliche kontrollierte Trees.

Nicht unnötig Millionen Branches erzeugen.

==================================================
39. SOLVER COMPUTE BUDGET
==================================================

Baue eine Job Queue.

Priorisiere Solution Generation nach Nutzung.

Tier 1:

häufigste MTT Spots

Tier 2:

seltener

Tier 3:

on-demand.

==================================================
40. ON-DEMAND SOLVING
==================================================

Falls technisch möglich:

Nutzer konfiguriert unbekannten Spot.

System:

`No verified solution cached.`

Option:

`Generate solution`

Job wird gestartet.

Nach erfolgreicher Verifikation:

Solution veröffentlicht.

Keine Approximation stillschweigend einsetzen.

==================================================
41. SOLUTION DATABASE
==================================================

Indexiere mindestens nach:

game
format
model
players
stack
blind structure
ante
hero
villain
action history
board
bet tree

==================================================
42. AI COACH
==================================================

AI soll niemals Strategy-Werte selbst erfinden.

AI erhält:

- Solver frequencies
- EVs
- Equity
- Range Advantage
- Nut Advantage
- blockers
- SPR
- board texture

und erklärt daraus die Solution.

==================================================
43. WHY MODE
==================================================

Unterscheide klar:

Solver-backed explanation

und

General strategic explanation.

Wenn Solver vorhanden:

`Diese Erklärung interpretiert eine verifizierte Solution.`

Wenn nicht:

`General strategic concept; no verified strategy available.`

==================================================
44. GGPoker-orientierte PRESETS
==================================================

Rangeform darf nicht proprietär an GG Poker gekoppelt werden.

Aber erstelle praktische Tournament Presets:

Standard MTT

Turbo

Hyper

Short Stack

Cash

Presets definieren nur:

- Blind/Ante Struktur
- typische Stackauswahl
- Table Size Defaults

Strategy kommt weiterhin vom Solver.

==================================================
45. SPÄTERES ICM
==================================================

Datenmodell jetzt vorbereiten:

```ts
evaluationModel:
  | 'CHIP_EV'
  | 'ICM'
  | 'PKO'
  | 'MYSTERY_BOUNTY'
```

Aber aktuell nur:

CHIP_EV

voll implementieren.

==================================================
46. SPÄTERES ICM STATE
==================================================

Plane später:

players remaining

all stacks

payout structure

table stacks

tournament stage

==================================================
47. SPÄTER PKO
==================================================

Plane:

starting bounty

hero bounty

villain bounty

progressive bounty state

covered stack

bounty cash value

Aber jetzt noch keine Fake-PKO-Ranges erstellen.

==================================================
48. UI GAME MODEL
==================================================

Oben in Study/Trainer:

GAME

Tournament
Cash

Wenn Tournament:

MODEL

ChipEV
ICM (coming later)
PKO (coming later)

Dann:

Players
Stack
Ante
Position
Spot

==================================================
49. EXPAND / COLLAPSE
==================================================

Nutze eine klare Progressive Disclosure UI.

Standardansicht:

nur wichtige Optionen.

Advanced Configuration einklappbar.

==================================================
50. CASH ERHALTEN
==================================================

Bestehender Cash-Modus darf funktionieren.

Aber:

- nicht mehr Default
- deutlich von MTT getrennt
- Cash-spezifische Solution Parameters später mit Rake erweiterbar

==================================================
51. KEINE DATENVERMISCHUNG
==================================================

Extrem wichtig:

MTT Solution niemals für Cash anzeigen.

Cash Solution niemals für MTT anzeigen.

6-max Solution niemals für 8-max ausgeben.

Ante Solution niemals ohne Ante weiterverwenden.

15 BB Solution niemals auf 20 BB interpolieren und als VERIFIED darstellen.

==================================================
52. INTERPOLATION
==================================================

Falls später Interpolation implementiert wird:

klar markieren als:

`INTERPOLATED`

niemals VERIFIED_SOLVER.

==================================================
53. SOLUTION PROVENANCE SICHTBAR
==================================================

Bei jeder Range:

Solution Info

Source:
Verified Solver

Algorithm:
DCFR

Stack:
15 BB

Players:
8

Ante:
1 BB BBA

Bet Tree:
2x / 2.2x / jam

Exploitability:
...

Generated:
...

==================================================
54. TRAINING SAFETY
==================================================

Standardtrainer:

nur VERIFIED Nodes.

Checkbox in Settings:

`Allow experimental strategies`

Default:

OFF.

==================================================
55. DATA QUALITY DASHBOARD
==================================================

Admin/Developer Seite:

Solutions:

Verified
Pending
Failed
Approximate

Coverage:

Stack × Player Count × Position × Spot

Beispiel:

8-handed / 15 BB / RFI

UTG ✓
UTG+1 ✓
LJ ✓
HJ ✓
CO ✓
BTN ✓
SB ✓

==================================================
56. COVERAGE HEATMAP
==================================================

Zeige, welche Solutions verfügbar sind.

Ziel:

keine stillen Fallbacks.

==================================================
57. TESTS
==================================================

Zwingend neue Tests für:

MTT state

antes

BBA

2–9 handed positions

effective stacks

RFI jam

small raise + jam same node

mixed strategies

solution validation

exploitability metadata

training frequency evaluation

spaced repetition

solver artifact loading

wrong-format isolation

==================================================
58. E2E FLOW
==================================================

Automatischer Test:

Tournament

8-handed

BBA 1

15 BB

HJ

RFI

→ Matrix lädt

→ Solver Source VERIFIED

→ AQo auswählen

→ mehrere Actions werden angezeigt

→ Prozente sichtbar

→ Trainer öffnen

→ Entscheidung treffen

→ Mixed Strategy korrekt bewerten

→ Progress speichern

→ erneut trainieren

==================================================
59. LEGACY APPROXIMATION
==================================================

Bestehende:

handScore()

ApproximationProvider

educational policy

nicht zwingend löschen.

Aber:

verschiebe in klar benannten:

`Sandbox / Approximate Strategy`

Modus.

Standardnutzer soll sie nicht versehentlich als GTO lernen.

==================================================
60. IMPLEMENTATIONSREIHENFOLGE
==================================================

PHASE 1

- StrategyContext
- Tournament/Cash separation
- Antes
- dynamic player count
- positions
- MTT state model

PHASE 2

- Solver research
- licensing audit
- Solver adapter
- compute pipeline
- verification pipeline

PHASE 3

- erste verifizierte MTT Preflop Solutions
- RFI / jams / calls
- 6 / 8 / 9-handed

PHASE 4

- Matrix redesign
- percentages
- mixed strategies
- filters

PHASE 5

- adaptive trainer
- Frequency Recall
- Spaced Repetition
- Mastery

PHASE 6

- verified postflop solver integration

==================================================
61. IMPLEMENTATION MUST NOT STOP AT A PLAN
==================================================

Nicht nur Architekturbericht schreiben.

Tatsächlich implementieren.

Falls ein Teil wegen Solver-Compute noch nicht vollständig lösbar ist:

- Infrastruktur implementieren
- Solution Jobs implementieren
- bereits mögliche Nodes erzeugen
- Coverage dokumentieren
- fehlende Nodes klar benennen

Nicht mit erfundenen Strategien auffüllen.

==================================================
62. GITHUB
==================================================

Feature Branch:

`feature/mtt-gto-accuracy-v3`

Saubere Commits.

PR gegen main.

Keine direkte unkontrollierte Änderung von main.

==================================================
63. QUALITY
==================================================

Vor Abschluss:

TypeScript

Lint

Unit Tests

Integration Tests

Playwright

Production Build

Database migrations

Render compatibility

PostgreSQL compatibility

keine Browser Console Errors

==================================================
64. ABSCHLUSSBERICHT
==================================================

Am Ende erstelle eine Tabelle:

Requirement

Implemented

Partially

Not Implemented

Reason

Zusätzlich:

MTT Solution Coverage

Solver Used

License

Validation Method

Exploitability / convergence criteria

Known Limitations

==================================================
65. DEFINITION OF DONE
==================================================

Die neue Version ist erst dann für den Nutzer ein echter GTO-Trainer, wenn mindestens ein sinnvoller Kernbereich aus:

MTT ChipEV

mit BBA

und mehreren Stacktiefen

und mehreren Positionen

mit tatsächlich verifizierten Solver-Solutions verfügbar ist.

Der Nutzer muss z. B. auswählen können:

Tournament

ChipEV

8-handed

15 BB

BBA 1

HJ

RFI

und anschließend für eine Hand sehen:

Fold X%

Raise 2 BB Y%

Jam 15 BB Z%

mit einer echten Solver-/validierten Solution.

Der Trainer muss genau diese Frequenzen lernen lassen.

Wenn diese Daten nicht verifiziert sind:

Rangeform darf sie nicht als GTO ausgeben.

==================================================
66. ULTIMATIVES PRODUKTZIEL
==================================================

Rangeform soll dem Nutzer nicht bloß „Pokerwissen“ vermitteln.

Es soll ermöglichen:

`reproduzierbare, validierte, solverbasierte MTT-Strategien zu studieren und durch adaptives Training langfristig zu memorieren.`

Accuracy > Feature Count.

Eine fehlende Solution ist besser als eine falsche Solution.

Eine Approximation darf niemals stillschweigend wie GTO aussehen.

Beginne jetzt mit einer vollständigen Analyse des bestehenden Repositories, recherchiere zuerst geeignete rechtlich nutzbare Solver-/Datenquellen und setze danach den Umbau direkt im bestehenden Projekt um.