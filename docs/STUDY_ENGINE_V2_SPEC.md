Du arbeitest an meinem bestehenden GitHub-Projekt:

Repository:
`mankenntmich3/poker-learning-platofmr`

Staging:
`https://rangeform-staging.onrender.com`

Ziel:
Die bestehende Plattform „Rangeform“ soll von einem heuristischen Poker-Lernprototypen zu einer deutlich ernsthafteren, GTO-orientierten NLHE-Lernplattform weiterentwickelt werden.

Orientiere dich funktional an modernen Tools wie GTO Wizard, ohne deren geschützte Inhalte, proprietäre Datenbanken, konkrete Solver-Lösungen, UI-Assets oder urheberrechtlich geschützte Inhalte zu kopieren.

Die Plattform soll eigenständig bleiben, aber funktional insbesondere folgende Konzepte übernehmen:

- frei konfigurierbare NLHE-Spots
- stack- und positionsabhängige Preflop-Sizings
- positions- und stackabhängige Preflop-Ranges
- dynamische Postflop-Boards
- konkrete Hero-Hand-Auswahl
- frei wählbare Flop-, Turn- und Riverkarten
- Action Trees über mehrere Streets
- dynamische Range-Veränderungen nach jeder Action
- mehrere Bet-Sizes
- Range-/Combo-Darstellung
- Trainer
- EV-/Strategie-Auswertung soweit technisch valide
- didaktische „Warum?“-Erklärungen

WICHTIG:
ICM, PKO/Bounty, Satellites, PLO und komplexe Multiway-Spots sollen vorerst NICHT priorisiert oder neu implementiert werden.

Der Fokus liegt zunächst auf:

`6-max NLHE ChipEV`
mit Heads-Up Postflop-Spots.

-----------------------------------
1. ZUERST: BESTEHENDEN CODE ANALYSIEREN
-----------------------------------

Analysiere den bestehenden Code vollständig, insbesondere:

- `src/shared/nlhe.ts`
- `src/strategy/nlhe-provider.ts`
- `src/strategy/nlhe-policy.ts`
- `src/components/range-explorer.tsx`
- `src/components/postflop.tsx`
- `src/components/trainer.tsx`
- `src/domain/cards.ts`
- `src/domain/holdem.ts`
- `src/solver/*`
- `data/nlhe/*`
- API-Endpunkte unter `src/app/api/nlhe/*`

Prüfe zuerst, welche Teile weiterverwendet werden können und welche grundlegend refaktoriert werden müssen.

Die bestehende Architektur soll nur dann ersetzt werden, wenn dies technisch sinnvoll ist.

Keine unnötige Komplett-Neuschreibung.

-----------------------------------
2. KRITISCHER FEHLER: HEURISTISCHE RANGES
-----------------------------------

Aktuell werden Preflop-Ranges wesentlich durch eine interne Heuristik erzeugt, insbesondere über eine Funktion wie:

`handScore()`

Diese berücksichtigt Handhöhe, suitedness, Connectors, Gaps usw.

Diese Logik darf NICHT länger als vermeintliche GTO-Strategie dargestellt werden.

Im bestehenden Code ist bereits sinngemäß dokumentiert:

„NOT equity, EV, or a GTO solve.“

Daher:

- entferne jede Darstellung, die heuristische Strategien wie echte GTO-Lösungen wirken lässt
- kennzeichne approximierte Daten technisch und visuell sauber
- baue eine neue Strategy-Provider-Schicht, die zukünftig echte Solver-/Solution-Daten aufnehmen kann
- UI und APIs dürfen nicht an die alte Heuristik gekoppelt bleiben

Empfohlene Architektur:

`StrategyProvider`

mit verschiedenen möglichen Implementierungen:

- `ApproximationProvider`
- `StaticSolutionProvider`
- später `SolverProvider`
- später `RemoteSolutionProvider`

Die UI soll ausschließlich über einen gemeinsamen Provider-Vertrag arbeiten.

-----------------------------------
3. PREFLOP: OPEN-SIZINGS KOMPLETT ÜBERARBEITEN
-----------------------------------

Aktuell ist sinngemäß hinterlegt:

- SB = 3 BB
- alle anderen Positionen = 2,5 BB

unabhängig von Stacktiefe.

Das ist zu grob.

Implementiere ein flexibles Preflop-Sizing-Modell.

Die Preflop-Konfiguration muss mindestens enthalten:

- Format
- Anzahl Spieler
- Hero Position
- Villain Position
- effektiver Stack
- vorherige Action
- Open Size
- 3-Bet Size
- 4-Bet Size

Mindestens unterstützte Stacktiefen:

10 BB
15 BB
20 BB
25 BB
30 BB
40 BB
50 BB
75 BB
100 BB
150 BB
200 BB

Custom Stack kann bestehen bleiben.

Für die Open Sizes:

Unterstütze mindestens:

- 2.0 BB
- 2.1 BB
- 2.2 BB
- 2.25 BB
- 2.3 BB
- 2.5 BB
- 3.0 BB

Aber:
Nicht jede Size muss in jedem Spot verfügbar sein.

Implementiere eine strukturierte Sizing-Konfiguration anhand von:

`Position × Stack Depth × Scenario`

Beispiel:

30 BB BTN RFI

könnte intern z. B. mögliche Sizes haben:

- 2.0 BB
- 2.2 BB

100 BB BTN RFI:

- 2.3 BB
- 2.5 BB

Die konkrete Strategy darf nicht erfunden werden, wenn keine echte Solution verfügbar ist.

Falls nur eine pädagogische Standardgröße existiert:
zeige:

`Recommended Study Size`

und kennzeichne diese eindeutig als Lernannahme.

Die UI sollte außerdem zwei Modi kennen:

`Simple`
- zeigt eine empfohlene Raise Size

`Advanced`
- zeigt alle für den Spot hinterlegten Sizes

-----------------------------------
4. PREFLOP RANGE STATE
-----------------------------------

Die Range darf nicht nur von Hero Position und Stack abhängen.

Sie muss anhand des gesamten Game States geladen werden.

Beispiel:

`BTN opens 2 BB at 30 BB`

ist ein anderer Node als:

`BTN opens 2.5 BB at 30 BB`

Ebenso:

`BB vs BTN 2 BB Open`

ist ein anderer Spot als:

`BB vs BTN 2.5 BB Open`

Daher muss der Strategy-Key mindestens enthalten:

- stack
- hero
- villain
- scenario
- opener size
- action history

Beispiel:

`nlhe:6max:30:BTN:rfi:open2.0`

bzw.

`nlhe:6max:30:BB:vsBTN:open2.0`

Die API muss entsprechend angepasst werden.

-----------------------------------
5. POSTFLOP NICHT MEHR AUF EINEN SPOT BESCHRÄNKEN
-----------------------------------

Aktuell ist Postflop faktisch auf einen einzelnen Lernspot festgelegt:

100 BB
BTN vs BB
SRP
A♠ 7♦ 2♣
BB check
Hero entscheidet

Diese feste Konfiguration soll vollständig aufgelöst werden.

Baue einen echten:

`Postflop Explorer`

-----------------------------------
6. POSTFLOP SPOT BUILDER
-----------------------------------

Der Nutzer soll einen Postflop-Spot konfigurieren können.

Mindestens:

PRE-FLOP:
- Stacktiefe
- Hero Position
- Villain Position
- Preflop Action Line
- Open Size
- Call / 3-Bet / Call
- daraus resultierender Pot

Beispiele:

BTN opens 2 BB
BB calls

CO opens 2.5 BB
BTN calls

BTN opens 2.5 BB
BB 3-bets 11 BB
BTN calls

Zunächst reicht Heads-Up Postflop.

-----------------------------------
7. FREIER CARD PICKER
-----------------------------------

Implementiere einen vollständigen 52-Karten-Card-Picker.

Der Nutzer soll frei wählen können:

Hero Hand:
z. B.
A♠ K♠

Flop:
K♥ 8♠ 4♣

Turn:
7♠

River:
2♦

Regeln:

- keine Karte darf doppelt vergeben werden
- blockierte Karten müssen deaktiviert sein
- ungültige Board-/Hand-Kombinationen dürfen nicht möglich sein
- UI soll Karten visuell darstellen
- Suit-Farben konsistent
- Reset einzelner Streets möglich
- Random Board möglich
- Random Hero Hand möglich

-----------------------------------
8. HERO HAND: HANDCLASS UND KONKRETE COMBOS
-----------------------------------

Der Nutzer soll zwei Eingabemöglichkeiten haben:

A)
über 13×13-Handmatrix

z. B.
AKs

und danach konkrete Combo:

A♠K♠
A♥K♥
A♦K♦
A♣K♣

B)
direkt über Kartenpicker

z. B.
A♠K♠

Beide Systeme müssen synchronisiert sein.

-----------------------------------
9. ACTION TREE
-----------------------------------

Die größte funktionale Erweiterung:

Postflop muss einen echten Street-by-Street Action Tree unterstützen.

Beispiel:

Flop:
BB checks

BTN:
- Check
- Bet 25%
- Bet 33%
- Bet 50%
- Bet 75%
- Bet 100%
- Bet 125%

Nach Bet:

BB:
- Fold
- Call
- Raise

Falls Raise:
Hero:
- Fold
- Call
- Re-Raise
- All-In

Danach:

Turn Card auswählen

dann neue Action Sequence.

Danach River.

Speichere die komplette Action History strukturiert.

Beispiel:

```ts
actionHistory = [
  {
    street: 'preflop',
    actor: 'BTN',
    action: 'raise',
    sizeBb: 2
  },
  {
    street: 'preflop',
    actor: 'BB',
    action: 'call',
    sizeBb: 1
  },
  {
    street: 'flop',
    actor: 'BB',
    action: 'check'
  },
  {
    street: 'flop',
    actor: 'BTN',
    action: 'bet',
    sizePotPct: 33
  },
  {
    street: 'flop',
    actor: 'BB',
    action: 'call'
  }
]
```

-----------------------------------
10. POT- UND STACK-ENGINE
-----------------------------------

Implementiere eine saubere Engine für:

- pot size
- effective stack
- invested chips
- amount to call
- remaining stack
- bet amount in BB
- bet amount in % pot
- minimum raise
- all-in
- SPR

Beispielanzeige:

Pot: 5.0 BB

Stack:
BTN 28 BB
BB 28 BB

SPR: 5.6

BTN Bet 33%:
1.65 BB

Nach Call:
Pot = 8.3 BB

Alle Werte müssen aus dem Game State berechnet werden.

Keine hartkodierten Potgrößen.

-----------------------------------
11. RANGE-UPDATE NACH JEDER ACTION
-----------------------------------

Das System soll Range Evolution darstellen.

Beispiel:

Start:
BTN preflop opening range

BB call range

Nach Flop:
BB check range

Nach BTN Bet 33%:
BTN betting range

Nach BB Call:
BB calling range

Auf Turn:
beide Ranges nach Card Removal aktualisieren

Danach:
Turn Bet Range
Turn Call Range usw.

UI:

Zeige optional nebeneinander:

`Hero Range`
`Villain Range`

mit:

- 169-Hand-Matrix
- Frequenz pro Handklasse
- absolute verbleibende Combos
- Reach Frequency
- aktuelle Action Frequency

Beispiel:

AKs
Reach 100%
Bet 33%: 72%
Check: 28%

-----------------------------------
12. RANGE FUNNEL
-----------------------------------

Füge zusätzlich einen Range-Funnel hinzu.

Beispiel:

BTN Preflop Range
→ Flop Range
→ Bet Range
→ Turn Range
→ Turn Bet Range

Der Nutzer soll nachvollziehen können:

„Welche Hände sind aus der ursprünglichen Range bis zu diesem Node gekommen?“

-----------------------------------
13. BET SIZES
-----------------------------------

Aktuell gibt es teilweise nur eine einzige Bet Size.

Baue eine flexible Bet-Sizing-Struktur.

Postflop mindestens:

- 20%
- 25%
- 33%
- 50%
- 66%
- 75%
- 100%
- 125%
- 150%
- All-In

Nicht jede Size muss überall als Strategy existieren.

Legal Actions und verfügbare Strategy Actions müssen getrennt werden.

-----------------------------------
14. EV-STRUKTUR VORBEREITEN
-----------------------------------

Aktuell:

`EV = null`

Das ist okay, solange keine echten Solver-Werte existieren.

Aber Architektur und UI sollen echte EV-Werte vollständig unterstützen.

Pro Action:

```ts
{
  action: 'bet',
  sizePotPct: 33,
  frequency: 0.72,
  ev: 4.23
}
```

Hand EV:

- Check EV
- Bet EV
- Raise EV

Trainer:

Chosen Action
Best Action
EV Loss

Beispiel:

Your action:
Bet 75%

Best strategy:
Bet 33%

EV Loss:
-0.18 BB

WICHTIG:
Keine künstlichen EV-Werte generieren.

Falls keine Solverwerte vorhanden:
zeige klar:

`EV data unavailable`

-----------------------------------
15. EQUITY
-----------------------------------

Implementiere echte Hold’em Equity-Berechnung.

Mindestens:

- Hand vs Hand
- Hand vs Range
- Range vs Range

Auf Flop/Turn/River.

Nutze dafür eine valide Equity Engine.

Nicht nur Hand-Kategorie vergleichen.

Zeige:

Hero Equity
Villain Equity

Optional:

Range Equity

-----------------------------------
16. RANGE ADVANTAGE / NUT ADVANTAGE
-----------------------------------

Baue Analysemetriken:

- Range Equity
- Nut Advantage
- Top Pair Density
- Overpair Density
- Set Density
- Strong Draw Density
- Air Density

Diese Analyse darf nur aus den vorhandenen Ranges und Boardinformationen berechnet werden.

Keine erfundenen Solverbehauptungen.

-----------------------------------
17. BOARD TEXTURE ANALYSIS
-----------------------------------

Analysiere Boards automatisch.

Beispiele:

A-high
K-high
paired
monotone
two-tone
rainbow
connected
disconnected
low board
high-card board
broadway-heavy

Beispiel:

`K♠ 8♠ 4♦`

Tags:

- K-high
- two-tone
- moderately disconnected

Dies soll für Filter und Lernmodule verwendet werden.

-----------------------------------
18. BACKDOORS UND SUITS
-----------------------------------

Ein großes Defizit des aktuellen Systems ist, dass AKs teilweise wie eine abstrakte Handklasse behandelt wird.

Postflop muss konkrete Suit-Kombinationen berücksichtigen.

Beispiel:

A♠K♠

ist auf:

J♠8♦3♣

strategisch anders als:

A♥K♥

weil Backdoor Flush Equity unterschiedlich ist.

Daher:

- konkrete Combo-Strategien unterstützen
- Backdoor Flush Draw erkennen
- Backdoor Straight Draw erkennen
- direkte Flush Draws erkennen
- Straight Draws erkennen
- Blockerinformationen erkennen

-----------------------------------
19. TRAINER KOMPLETT ERWEITERN
-----------------------------------

Der Trainer soll später dieselben Nodes nutzen wie der Explorer.

Modi:

Preflop Trainer

Postflop Trainer

Full Hand Trainer

Street Trainer

Spot Trainer

Beispiel:

Train only:

BTN vs BB
30 BB
Single Raised Pot
Flop
BTN after BB check

Oder:

Random Boards

Oder:

Only A-high Boards

Oder:

Only Turn Decisions

-----------------------------------
20. RANDOM BOARD TRAINING
-----------------------------------

Postflop Trainer soll zufällige valide Boards generieren können.

Optionen:

- Random
- A-high
- K-high
- paired
- monotone
- two-tone
- connected
- low boards

Nutzer kann Anzahl Hände auswählen:

10
25
50
100

-----------------------------------
21. TRAINER FEEDBACK
-----------------------------------

Nach jeder Entscheidung:

zeige:

Hero Hand
Board
Chosen Action

Strategy:

Check 28%
Bet 33% 72%

Falls EV vorhanden:

Check EV
Bet EV
EV loss

Zusätzlich:

`Why?`

-----------------------------------
22. WHY?-MODUS
-----------------------------------

Baue einen didaktischen Erklärungsbereich.

Er soll NICHT einfach Strategy-Werte wiederholen.

Er soll relevante Gründe erläutern.

Mögliche Faktoren:

- Range Advantage
- Nut Advantage
- Equity
- Blocker
- Showdown Value
- Fold Equity
- Draw Potential
- Backdoors
- Position
- SPR
- Stack Depth
- Range Interaction
- Polarization
- Board Connectivity

Beispiel:

A♠5♠
auf
K♣8♠3♦

könnte erklärt werden:

- wenig Showdown Value
- Ace Blocker
- Backdoor Flush Draw
- kann von Folds profitieren
- eignet sich eher zum Bluffen als manche Hände mit besserem Showdown Value

WICHTIG:
Erklärungen müssen aus tatsächlichen verfügbaren Merkmalen abgeleitet werden.

Wenn keine echte Solver-Solution vorliegt:
nicht behaupten:

„GTO macht X wegen Y“

sondern:

„Eine mögliche strategische Begründung ist …“

-----------------------------------
23. STUDY VIEW ÄHNLICH MODERNEN GTO TOOLS
-----------------------------------

Die Postflop-Seite soll strukturell ungefähr so funktionieren:

LEFT SIDEBAR:
Spot Configuration

- Stack
- Positionen
- Preflop Line
- Open Size
- Pot

CENTER:
Board
Hero Hand
Action Tree

RIGHT:
Strategy / Analysis

Tabs:

- Strategy
- Range
- Combos
- Equity
- Analysis
- Why?

Responsive Layout.

-----------------------------------
24. STRATEGY MATRIX
-----------------------------------

Die 13×13 Matrix soll verbessert werden.

Jede Handzelle soll Mixed Strategies darstellen.

Beispiel:

AKs

33% Bet: 70%
Check: 30%

Visualisierung beispielsweise durch segmentierte Zellflächen.

Nicht nur eine dominante Farbe.

Tooltip:

- Combos
- Reach
- Action Frequencies
- EV, falls vorhanden

-----------------------------------
25. COMBO VIEW
-----------------------------------

Zusätzlich zur 169er-Matrix:

Combo View.

Beispiel für AKs:

A♠K♠
A♥K♥
A♦K♦
A♣K♣

Jede Combo einzeln.

Gerade Postflop sehr wichtig.

-----------------------------------
26. NODE NAVIGATION
-----------------------------------

Der Nutzer soll im Action Tree jederzeit zurückspringen können.

Beispiel:

Preflop
→ Flop Check
→ Bet
→ Call
→ Turn

Klick auf:

`Flop Check`

führt zurück zu diesem Game State.

Neue Action ab dort erzeugt einen neuen Branch.

-----------------------------------
27. PERMALINKS
-----------------------------------

Jeder Study Spot soll über URL reproduzierbar sein.

Beispiel:

`/postflop?stack=30&hero=BTN&villain=BB&open=2&flop=Ks8s4d&hand=As5s&line=x-b33-c`

Oder alternative ID-basierte Node-URL.

-----------------------------------
28. SHARE SPOT
-----------------------------------

Button:

`Spot teilen`

kopiert einen reproduzierbaren Link.

-----------------------------------
29. FAVORITEN
-----------------------------------

Nutzer kann Spots speichern.

Beispiel:

`BTN vs BB – 30 BB – K-high boards`

-----------------------------------
30. HISTORY
-----------------------------------

Speichere zuletzt untersuchte Spots.

-----------------------------------
31. PROGRESS
-----------------------------------

Bestehendes Progress-System erweitern.

Zeige:

- Entscheidungen insgesamt
- Preflop Accuracy
- Postflop Accuracy
- durchschnittlicher EV Loss, falls verfügbar
- häufigste Fehler
- schlechteste Spots
- Positionen mit niedrigster Accuracy
- Boardtypen mit niedrigster Accuracy

-----------------------------------
32. LEAK ANALYSIS VORBEREITEN
-----------------------------------

Noch kein vollständiger Hand-History-Importer notwendig.

Aber Datenmodell so entwerfen, dass zukünftig möglich ist:

- User Decision
- Recommended Strategy
- EV loss
- Spot category
- Hand class
- Board texture
- Street
- Position

Dann können später Leaks berechnet werden.

-----------------------------------
33. SOLVER / SOLUTION ARCHITECTURE
-----------------------------------

Keinen Fake-Solver bauen.

Stattdessen abstrahieren:

```ts
interface StrategyProvider {
  hasSolution(state)
  getNode(state)
  getRangeStrategy(state)
  getComboStrategy(state, combo)
  getActionEVs(state, combo)
  getNextNodes(state)
}
```

Provider können später sein:

- heuristic
- static database
- local solver
- external solver

UI darf davon unabhängig sein.

-----------------------------------
34. SOLUTION METADATA
-----------------------------------

Jeder Strategy Node braucht Provenance:

- sourceType
- solutionVersion
- solverVersion
- generatedAt
- accuracy
- assumptions
- rake
- stack
- format
- bet sizes
- source description

Visualisierung:

`Solution Info`

Beispiel:

Source:
Approximation

EV accuracy:
Unavailable

oder

Source:
Precomputed Solver Solution

Accuracy:
0.15% pot

-----------------------------------
35. KEINE FAKE-GTO-AUSSAGEN
-----------------------------------

Wichtigste Qualitätsregel:

Wenn Daten nur heuristisch sind:

NICHT:

„GTO bettet 72%.“

Sondern:

„Approximate training strategy: 72%.“

Nur bei echten Solver-Daten darf die Plattform sie als Solver-Strategie darstellen.

-----------------------------------
36. DATENMODELL
-----------------------------------

Definiere einen zentralen PokerGameState.

Beispiel:

```ts
interface PokerGameState {
  game: 'NLHE'
  format: '6max'
  stackBb: number

  players: PlayerState[]

  heroPosition: Position
  villainPosition: Position

  street:
    | 'preflop'
    | 'flop'
    | 'turn'
    | 'river'

  board: Card[]

  heroHand?: Combo

  potBb: number

  actionHistory: PokerAction[]

  activePlayer: Position

  legalActions: LegalAction[]
}
```

Keine duplicierte State-Logik über mehrere Komponenten.

-----------------------------------
37. VALIDATION
-----------------------------------

Implementiere umfassende Validierungen:

- Duplicate Cards
- impossible action
- incorrect min raise
- stack exceeded
- wrong actor
- turn without complete flop
- river without turn
- postflop without completed preflop
- invalid bet size
- illegal all-in

-----------------------------------
38. TESTS
-----------------------------------

Neue Tests zwingend.

Unit Tests:

- card blocking
- board validation
- pot calculation
- stack calculation
- min raise
- action sequence
- range filtering
- combo removal
- equity
- board texture
- state serialization

Integration Tests:

- Build preflop spot
- Go to flop
- choose board
- choose Hero hand
- select action
- Villain responds
- choose turn
- continue action tree

Playwright:

1.
Open `/ranges`

2.
30 BB
BTN
RFI

3.
Open Size ändern

4.
Range muss neu laden

5.
Open `/postflop`

6.
BTN vs BB
30 BB
BTN open 2 BB
BB call

7.
Hero Hand:
A♠K♠

8.
Board:
K♥8♠4♣

9.
BB check

10.
Hero bet 33%

11.
BB call

12.
Turn 7♠

13.
Strategy Node muss aktualisiert werden

-----------------------------------
39. UI/UX
-----------------------------------

Design soll modern bleiben.

Nicht GTO Wizard visuell kopieren.

Aber ähnliche Informationsdichte ist erwünscht.

Dark-mode friendly.

Klare Hierarchie.

Poker Cards groß genug.

Strategieinformationen lesbar.

Desktop zuerst, aber responsive.

-----------------------------------
40. BESTEHENDE FUNKTIONEN ERHALTEN
-----------------------------------

Nicht kaputtmachen:

- Login
- User Sessions
- Progress
- Academy
- Settings
- Navigation
- bestehende Datenbank
- Render Deployment

Wenn DB-Migration nötig:
saubere Migration erstellen.

-----------------------------------
41. PERFORMANCE
-----------------------------------

Postflop darf nicht bei jeder UI-Interaktion unnötig komplette Daten neu berechnen.

Nutze:

- memoization
- server caching
- node IDs
- lazy loading
- range aggregation

-----------------------------------
42. ERROR STATES
-----------------------------------

Saubere Fehler:

`No solution available for this node.`

`This spot is currently only available as an approximate training strategy.`

`This bet size is not supported by the current solution set.`

Nicht einfach:

`Something went wrong.`

-----------------------------------
43. ENTWICKLUNGSREIHENFOLGE
-----------------------------------

Bitte in folgender Reihenfolge implementieren:

PHASE A

- zentraler PokerGameState
- Pot-/Stack-Engine
- Action History
- flexible Preflop Sizes
- Strategy Provider Refactor

PHASE B

- freier Card Picker
- beliebiger Flop
- Hero Hand
- Combo blocking
- dynamic Postflop Explorer

PHASE C

- Flop/Turn/River Action Tree
- dynamic nodes
- range evolution
- range funnel

PHASE D

- Equity Engine
- Board Texture
- Draw/Backdoor Detection
- Analysis Tab

PHASE E

- Trainer Integration
- Full Hand Trainer
- Why? explanations
- Progress/Leak data

-----------------------------------
44. NICHT IMPLEMENTIEREN
-----------------------------------

Vorläufig NICHT:

- ICM
- Bounty / PKO
- Satellites
- Spins
- PLO
- 5-card PLO
- Multiway Solver
- Cash-game rake modelling beyond existing basic assumptions
- Nodelocking
- Hand History Import

Diese Features dürfen architektonisch vorgesehen, aber nicht priorisiert werden.

-----------------------------------
45. DEFINITION OF DONE
-----------------------------------

Nach Abschluss muss ich mindestens Folgendes tun können:

1.
Website öffnen

2.
NLHE 6-max wählen

3.
Stack 30 BB wählen

4.
BTN wählen

5.
RFI wählen

6.
Open Size 2 BB wählen

7.
entsprechende Range sehen

8.
BB vs BTN Open öffnen

9.
BB Response Range sehen

10.
Postflop Explorer öffnen

11.
BTN vs BB SRP wählen

12.
Hero Hand frei wählen:
A♠K♠

13.
Flop frei wählen:
K♥8♠4♣

14.
BB check auswählen

15.
Hero kann mehrere Bet Sizes auswählen

16.
BB kann Fold/Call/Raise auswählen

17.
nach Call beliebige Turnkarte auswählen

18.
Range verändert sich nach Action und Turnkarte

19.
River analog

20.
jeder Node zeigt:
- Hero Range
- Villain Range
- Action frequencies
- Combos
- Equity, soweit verfügbar
- EV, soweit vorhanden
- Source/Provenance

21.
Trainer kann denselben Spot laden

22.
kein Teil der Plattform stellt heuristische Daten als echte Solver-GTO-Daten dar

-----------------------------------
46. TECHNISCHE QUALITÄT
-----------------------------------

Arbeite produktionsnah.

Vor Abschluss:

- TypeScript strict prüfen
- ESLint
- Tests
- Build
- Playwright
- keine Type Errors
- keine Console Errors
- keine offensichtlichen UI Regressionen

-----------------------------------
47. GITHUB-WORKFLOW
-----------------------------------

Arbeite auf einem eigenen Feature-Branch.

Empfohlener Name:

`feature/gto-study-engine-v2`

Nicht direkt blind auf `main` schreiben.

Am Ende:

- Commit(s) sauber strukturieren
- PR gegen main erstellen
- PR Beschreibung mit:
  - Architekturänderungen
  - neue Features
  - bekannte Limits
  - Tests
  - Migrationen
  - offene Punkte

-----------------------------------
48. WICHTIGE ENTSCHEIDUNG BEI FEHLENDEN GTO-DATEN
-----------------------------------

Wenn du für einen Spot keine echten GTO-/Solver-Daten hast:

NICHT einfach Frequenzen erfinden.

Stattdessen:

Option A:
Node als
`Approximate Training Strategy`
kennzeichnen.

Option B:
Strategy unavailable anzeigen.

Option C:
ein öffentlich verfügbares, rechtlich nutzbares Open-Source-Solver-System integrieren, wenn technisch sinnvoll und lizenzrechtlich zulässig.

Lizenzbedingungen vorher prüfen.

-----------------------------------
49. RECHERCHE
-----------------------------------

Nutze aktuelle öffentlich zugängliche Informationen zu:

- GTO Wizard Study UI
- GTO Wizard Trainer
- modernen NLHE Solver Interfaces
- Preflop Stack Depth / Raise Sizing
- Postflop Action Tree UX
- Open-Source Poker Solver Architektur

Nutze diese Recherche nur zur funktionalen Orientierung.

Keine geschützten Solver-Daten kopieren.

-----------------------------------
50. PRODUKTZIEL
-----------------------------------

Die Plattform soll nach diesem Umbau nicht mehr wirken wie:

„ein paar Poker-Ranges plus ein einzelner A-high-Flop.“

Sie soll wirken wie:

`eine echte NLHE Study Engine`

mit:

Preflop
→ Range
→ Postflop
→ Action Tree
→ Turn
→ River
→ Range Evolution
→ Trainer
→ Analyse
→ Why?

Das wichtigste Ziel ist nicht maximale Feature-Anzahl.

Das wichtigste Ziel ist:

`Pokerzustände korrekt modellieren und nachvollziehbar trainierbar machen.`

Beginne jetzt mit der Codeanalyse und implementiere den Umbau direkt im bestehenden Repository.