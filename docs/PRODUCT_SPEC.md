# Current owner priorities — 2026-09-08

The latest owner instructions supersede the original long-term text below. The confirmed permanent repository is `mankenntmich3/poker-learning-platofmr`.

1. Keep real local login/signup and development-only demo data immediately usable.
2. Make No-Limit Texas Hold’em the main product: 6-max Cash preflop ranges and exact-spot trainer, all eleven 10–200 BB presets, extensible stack depths, 169 classes/1,326 combos, mixed frequencies, immutable provenance and persistent progress.
3. No owned/licensed range data is available. The owner explicitly permits clearly labelled APPROXIMATED learning data; never claim GTO accuracy or EV from it. Keep Kuhn only as infrastructure regression.
4. After preflop works, one bounded 100 BB BTN-vs-BB SRP flop. No broad solver, billing, admin or analyzer expansion.
5. Deploy private/staging HTTPS with managed PostgreSQL, preserving local development. Owner approved **free tiers only**, with accounts owned by the owner. No production credentials/data copied.

Implementation scope and validation are in PROJECT_STATUS and decision 0003.

---

# Original long-term specification

Arbeite im privaten GitHub-Repository:
mankenntmich3/poker-learning-platform
Dieses Repository ist die permanente und verbindliche Single Source of Truth des gesamten Projekts.
Alle relevanten Artefakte müssen dort dauerhaft gepflegt werden:
- Source Code
- Architektur
- Produktdokumentation
- Tests
- Datenbankmigrationen
- Solver-Code
- Strategy-Datenmodelle
- API-Spezifikationen
- Project Status
- technische Entscheidungen
- Deployment-Konfigurationen
- CI/CD-Konfigurationen
- Dokumentation
Verlasse dich niemals ausschließlich auf Chat-Historie.
Wenn das Repository leer ist:
1. initialisiere die vollständige Projektstruktur,
2. erstelle notwendige Basisdateien,
3. dokumentiere die Produktspezifikation,
4. erstelle einen funktionsfähigen initialen Stand,
5. committe diesen sauber.
Das Repository soll langfristig vollständig nachvollziehbar sein.
Installiere bzw. aktiviere, sofern von deiner Umgebung unterstützt, frontend-design, web-design-guidelines und react-best-practices.
Verwende sie während der Implementierung und nicht erst beim abschließenden Review.
Wenn die Umgebung Agent Skills, SKILL.md, Plugins oder vergleichbare modulare Fähigkeiten unterstützt, prüfe insbesondere:
- frontend-design
- web-design-guidelines
- react-best-practices
Verwende nur vertrauenswürdige Skills.
Installiere nicht wahllos zusätzliche Skills.
Wenn ein Skill nicht verfügbar ist:
- nicht blockieren,
- nicht wiederholt danach suchen,
- stattdessen seine Prinzipien manuell anwenden.
Für eine spätere native Mobile-App kann zusätzlich ein geeigneter aktueller React-Native-/Expo-Skill verwendet werden.
Die native App gehört jedoch NICHT zum ersten MVP.
Du agierst nicht wie ein einzelner Entwickler.
Du agierst wie ein autonomes, multidisziplinäres Senior-Produktteam.
Übernimm gleichzeitig die Perspektive eines:
- Principal Full-Stack Software Engineers
- Senior Software Architects
- Senior Product Managers
- Senior UX/UI Designers
- Senior Product Designers
- Design-System Engineers
- Mobile UX Designers
- Poker-Theory Experts
- No-Limit-Hold'em-Strategen
- Game-Theory-/GTO-Spezialisten
- Solver Engineers
- CFR-/CFR+/DCFR-Spezialisten
- Data Engineers
- Database Engineers
- Backend Engineers
- Data-Visualization Engineers
- Distributed-Systems Engineers
- GPU-/Compute-Infrastructure Engineers
- DevOps-/Platform Engineers
- QA-/Test-Engineers
- Security Engineers
- Privacy Engineers
- SaaS-/Subscription-Architects
- Growth-/Product-Analytics-Spezialisten
Deine Aufgabe besteht NICHT darin, mir lediglich zu erklären, wie man diese Plattform bauen könnte.
Du sollst das Produkt tatsächlich entwickeln.
Arbeite wie ein hochqualifiziertes Softwareteam, dem Verantwortung übertragen wurde für:
- Produktstrategie
- UX
- UI
- Architektur
- Poker-Domain-Modellierung
- Frontend
- Backend
- Datenbankdesign
- Strategy Infrastructure
- Solver Infrastructure
- GTO-Datengenerierung
- Datenpipelines
- APIs
- Testing
- Security
- Performance
- Deployment
- Observability
- Monetarisierung
- technische Dokumentation
- langfristige Produktqualität
Wenn du Zugriff auf folgende Werkzeuge hast, nutze sie eigenständig sinnvoll:
- Browser
- Internet
- GitHub
- Repository
- Terminal
- Dateisystem
- Datenbanken
- Container
- externe APIs
- Deployment Tools
- CI/CD
- Cloud Services
- GPU Infrastructure
- Screenshots
- Playwright
- Browser Automation
- Logs
- Monitoring
Entwickle eine eigenständige professionelle Poker-Lernplattform, die konzeptionell die stärksten Elemente moderner Pokerprodukte kombiniert.
Funktionale Referenzen können unter anderem sein:
- PokerCode
- GTO Wizard
- DTO Poker
- PokerSnowie
- RangeConverter
- Run It Once
- Upswing Poker
- Raise Your Edge
- BBZ Poker
- vergleichbare moderne Poker-Lern-, Solver- und Analyseprodukte
Die Plattform soll jedoch KEINE Kopie dieser Produkte sein.
Sie soll ein eigenes:
- Produktkonzept
- Designsystem
- UI
- UX
- Datenmodell
- Lernsystem
- Solver-System
- Analytics-System
- technisches Fundament
- Markenpotenzial
besitzen.
Das System soll:
1. von mir selbst intensiv zum Pokernlernen genutzt werden können,
2. Anfänger strukturiert zu fortgeschrittenen Spielern entwickeln,
3. fortgeschrittenen Spielern GTO-Training ermöglichen,
4. Theorie und Training verbinden,
5. eigene Poker-Solutions erzeugen können,
6. eine eigene Strategy-Datenbank aufbauen,
7. eigene Hand- und Leak-Analysen durchführen,
8. personalisierte Lernpläne erzeugen,
9. langfristig als kommerzielles SaaS angeboten werden können.
Die Plattform verbindet vier Kernsysteme:
Strukturiertes Lernen.
Interaktives Training gegen solverbasierte Strategien.
Analyse von Händen, Fehlern und Leaks.
Eigene technische Infrastruktur zur:
- Berechnung
- Validierung
- Speicherung
- Indexierung
- Versionierung
- Auslieferung
von Strategiedaten.
Der zentrale Learning Loop lautet:
Learn → Understand → Practice → Analyze → Improve
Baue langfristig NICHT lediglich:
PokerCode + GTO Wizard
Sondern:
eine adaptive Poker-Lernplattform mit eigener Strategy-Infrastruktur.
Der zentrale Produktvorteil soll sein:
Beispiel:
```text
4.820 Hände analysiert
        ↓
Leak erkannt

BB vs BTN
Turn
OOP
Overfold vs 75 % Bet
        ↓
System empfiehlt

1 Theorie-Lektion
10 Range-Fragen
25 Trainer-Spots
        ↓
Retest
        ↓
Score vorher: 61 %
Score nachher: 82 %
```
```text
PLAY / TRAIN
      ↓
ANALYZE
      ↓
IDENTIFY LEAK
      ↓
UNDERSTAND
      ↓
TRAIN SPECIFIC SPOT
      ↓
RETEST
      ↓
MEASURE IMPROVEMENT
```
Technisch:
```text
Solver Infrastructure
        ↓
Solution Library
        ↓
Strategy API
        ↓
Training Engine
        ↓
User Decisions
        ↓
Learning Analytics
        ↓
Personalized Curriculum
```
Wenn Internetzugriff vorhanden ist, untersuche aktuelle öffentlich zugängliche Informationen zu relevanten Pokerprodukten.
Analysiere:
- Navigation
- UX
- UI Patterns
- Kursstruktur
- Trainer
- Range Explorer
- Solver Interface
- Game Tree
- Hand Analyzer
- Hand Replayer
- Gamification
- Analytics
- Progress Tracking
- Mobile Experience
- Subscription Tiers
- Produktpositionierung
- Onboarding
- Lernmechanismen
- Datenvisualisierung
Erstelle intern eine Feature-Matrix.
Übernimm sinnvolle Konzepte.
Übernimm keine geschützte konkrete Umsetzung.
NICHT übernehmen:
- proprietäre Videos
- bezahlte Kursinhalte
- geschützte Texte
- Solver-Datenbanken anderer Anbieter
- Range-Datasets anderer Anbieter ohne Lizenz
- Grafiken
- Logos
- Branding
- Quellcode
- geschützte Assets
- konkrete Seiten 1:1
- fremde Trainingsdatenbanken
- proprietäre Game Trees
Kein:
- Paywall Bypass
- unerlaubtes Scraping
- automatisiertes Extrahieren fremder Strategy-Daten
- Reverse Engineering entgegen geltender Rechte oder Verträge
Benötigte Daten werden:
- selbst berechnet,
- selbst erstellt,
- rechtmäßig lizenziert
oder eindeutig als DEMO gekennzeichnet.
Ich möchte KEIN Konzeptpapier.
Ich möchte FUNKTIONIERENDE SOFTWARE.
Planung ist notwendig, darf aber nicht das Endergebnis sein.
Nach der Architekturplanung:
unmittelbar implementieren.
Die Plattform soll mindestens folgende Bereiche besitzen:
- Dashboard
- Academy
- GTO Trainer
- Preflop
- Postflop
- Range Explorer
- Hand Analyzer
- Hand Library
- Solver / Lab
- Analytics
- Challenges
- Profile
- Settings
Passe die Struktur an, wenn eine bessere Informationsarchitektur sinnvoll ist.
Anzeigen:
- Skill Level
- XP
- Streak
- Daily Goal
- Weekly Goal
- Study Time
- Hands Trained
- GTO Score
- Accuracy
- EV Regret
- Preflop Score
- Flop Score
- Turn Score
- River Score
- strongest areas
- weakest areas
- recent training
- recent lessons
- recommended study
- skill development
- monthly progress
Beispiel:
Dein aktuell größtes Leak liegt bei BB vs BTN Single Raised Pots auf dem Turn. Trainiere jetzt 20 Hände dieses Spots.
Entwickle ein vollständiges Lernsystem.
- Regeln
- Positionen
- Hand Rankings
- Pot
- Stack
- Effective Stack
- Equity
- Pot Odds
- Expected Value
- RFI
- Calling
- 3-Betting
- 4-Betting
- Blind Defense
- Position
- Stack Depth
- Board Texture
- Range Advantage
- Nut Advantage
- C-Betting
- Bet Sizes
- Check-Raising
- Value Betting
- Bluffing
- Range vs Range
- Polarization
- Condensed Ranges
- Blockers
- Bluff Catchers
- MDF
- Equity Realization
- SPR
- Mixed Strategies
- Indifference
- Range Construction
- Overbets
- Multi-Street Planning
- River Theory
- Node Locking
- Exploitative Adjustments
Später:
- Cash
- MTT
- SNG
- Heads-Up
- Short Stack
- Deep Stack
Content Model:
```text
Course
  ↓
Module
  ↓
Lesson
  ↓
Chapter
  ↓
Video / Article / Quiz / Hand / Trainer Exercise
```
Lektionen unterstützen:
- Text
- Video
- Images
- Range Matrix
- Poker Table
- Hand Examples
- Quiz
- Trainer Spots
- Summary
- Notes
- Bookmark
- Progress
- Spaced Repetition
Das Modell muss CMS-tauglich sein.
Unterstütze:
- chapters
- resume watching
- playback speed
- transcript
- notes
- bookmarks
- completion state
- related quiz
- related hands
- related trainer exercises
Nutze zunächst nur rechtmäßig nutzbare Medien oder Placeholder.
Erstelle eine professionelle 13×13-Matrix der 169 Starting-Hand-Klassen.
Actions:
- Fold
- Limp
- Call
- Raise
- 3-Bet
- 4-Bet
- 5-Bet
- All-In
Mixed Strategies unterstützen.
Beispiel:
```text
AKs

Raise 70 %
Call 30 %
```
Filter:
- Game Type
- Position
- Villain Position
- Stack
- Previous Action
- Open Size
- 3-Bet Size
- Anzahl Spieler
Stackgrößen unter anderem:
- 10 BB
- 15 BB
- 20 BB
- 25 BB
- 30 BB
- 40 BB
- 50 BB
- 75 BB
- 100 BB
- 150 BB
- 200 BB
Beispiel:
```text
6-max Cash
100 BB

BTN opens 2.5 BB
Hero BB

Hero:
A♠7♠
```
Actions:
- Fold
- Call
- 3-Bet
Danach:
- User Action
- Strategy
- Frequencies
- EV
- EV Loss
- Explanation
- Full Range
Beispiel:
```text
6-max Cash
100 BB

BTN vs BB
SRP

Board:
K♠ 8♦ 4♣

Hero:
A♠ Q♠

BB checks
```
Actions:
- Check
- Bet 33 %
- Bet 75 %
- Overbet
Feedback:
- Solver Strategy
- User Action
- Frequency
- EV
- EV Loss
- Regret
- Range Strategy
- Explanation
Nach jeder relevanten Entscheidung soll der Nutzer die gesamte Range untersuchen können.
Unterstützte Actions beispielsweise:
- Check
- Bet 25 %
- Bet 33 %
- Bet 50 %
- Bet 75 %
- Bet 100 %
- Bet 125 %
- Bet 150 %
- All-in
Mixed Frequencies visuell darstellen.
Interaktiver Tree:
```text
Flop

Check
├── Check
└── Bet 33 %
    ├── Fold
    ├── Call
    └── Raise
```
Jeder Node enthält:
- Board
- Pot
- Stacks
- Player to act
- Range Hero
- Range Villain
- available actions
- frequencies
- EV
Die Plattform darf langfristig NICHT von GTO Wizard oder einer anderen proprietären Strategy-Datenbank abhängig sein.
Ziel:
Aufbau einer eigenen proprietären GTO Solution Library.
Trenne:
von
Architektur:
```text
Web Application
      ↓
Strategy API
      ↓
Solution Index
      ↓
Solution Storage
      ↑
Validation Pipeline
      ↑
Solver Workers
      ↑
Solver Job Queue
```
Implementiere eine stabile Abstraktion:
```ts
interface StrategyProvider {
  getNode(state: GameState): Promise<StrategyNode>;

  getComboStrategy(
    state: GameState,
    combo: Combo
  ): Promise<ComboStrategy>;

  getRangeStrategy(
    state: GameState
  ): Promise<RangeStrategy>;

  getActionEVs(
    state: GameState,
    combo: Combo
  ): Promise<ActionEV[]>;

  getNextNodes(
    state: GameState
  ): Promise<StrategyNode[]>;

  hasSolution(
    state: GameState
  ): Promise<boolean>;
}
```
Provider:
- MockStrategyProvider
- StaticDatasetProvider
- SolutionDatabaseProvider
- SolverProvider
- LicensedExternalProvider
User Features dürfen NICHT direkt vom konkreten Solver abhängen.
Baue eine automatisierte Pipeline:
```text
Game Configuration
       ↓
Range Setup
       ↓
Game Tree
       ↓
Solver Job
       ↓
Solver Execution
       ↓
Convergence Check
       ↓
Solution Export
       ↓
Normalization
       ↓
Validation
       ↓
Compression
       ↓
Storage
       ↓
Strategy API
```
Sie soll automatisch:
1. Game Configurations erzeugen
2. Ranges definieren
3. Trees erzeugen
4. Jobs erstellen
5. Solver ausführen
6. Fortschritt überwachen
7. Ergebnisse exportieren
8. Output normalisieren
9. Suit Isomorphism anwenden
10. Frequencies extrahieren
11. EVs extrahieren
12. Ranges extrahieren
13. Nodes indexieren
14. Daten validieren
15. Daten komprimieren
16. Daten versionieren
17. Metadaten speichern
18. Solutions veröffentlichen
```ts
interface SolverEngine {
  createTree(config: SolverConfig): Promise<GameTree>;

  solve(job: SolverJob): Promise<SolverResult>;

  exportSolution(
    result: SolverResult
  ): Promise<SolutionArtifact>;

  getProgress(
    jobId: string
  ): Promise<SolverProgress>;
}
```
Mögliche Implementierungen:
- externer lizenzierter Solver
- eigener CFR Solver
- CFR+
- DCFR
- GPU Solver
Evaluiere:
- CFR
- CFR+
- DCFR
- Linear CFR
- MCCFR
- External Sampling
- Outcome Sampling
- Public Chance Sampling
- Subgame Solving
- Tree Compression
- Regret Compression
- SIMD
- Vectorization
- GPU Acceleration
- Batch Solving
Der MVP benötigt keinen vollständigen industriellen Solver.
Die Architektur muss dessen spätere Integration jedoch unterstützen.
Speichere:
- jobId
- gameType
- positions
- stackDepth
- preflopLine
- board
- pot
- ranges
- gameTreeConfig
- betSizes
- solverType
- targetAccuracy
- iterations
- status
- createdAt
- startedAt
- completedAt
- computeTime
- hardware
- memoryUsage
- convergenceMetric
- outputLocation
- solutionVersion
States:
```text
queued
running
validating
completed
failed
cancelled
```
Solution Metadata:
- Game Type
- Format
- Stack
- Positions
- Preflop Line
- Rake
- Sizes
- Solver Version
- Solution Version
- Accuracy
- Date
Node:
- board
- pot
- stacks
- player
- range
- actions
Combo:
- combo
- frequency per action
- EV per action
- total EV
Niemals Solver-Werte erfinden.
Jede Strategie benötigt:
```text
sourceType:
DEMO
COMPUTED
IMPORTED
LICENSED
APPROXIMATED
```
Zusätzlich:
- solverVersion
- solutionVersion
- accuracy
- generatedAt
DEMO-Daten im UI sichtbar kennzeichnen.
Intern nicht nur:
```text
AKs
AQo
77
```
sondern konkrete 1326 Preflop Combos.
Postflop auf konkrete Suit-Kombinationen arbeiten.
Die 169 Matrix ist nur eine aggregierte UI-Darstellung.
Implementiere Canonicalization.
```text
Real Board
    ↓
Canonical Board
    ↓
Solution Lookup
    ↓
Suit Mapping
    ↓
Real Strategy
```
Equivalent Suit Boards nicht unnötig mehrfach speichern.
Extensive Tests erforderlich.
Unterstütze Kategorien wie:
- rainbow
- two-tone
- monotone
- paired
- connected
- disconnected
- high
- low
- ace-high
- king-high
Nutzung für:
- Trainer
- Analytics
- Leak Detection
- Academy Links
Nicht Milliarden normale SQL Rows erzeugen.
für:
- Metadata
- Users
- Lessons
- Analytics
- Solution Index
- Node Index
- Game Configurations
- Jobs
für:
- Strategy Arrays
- Trees
- EV Arrays
- Solver Artifacts
Mögliche Formate evaluieren:
- Zstandard
- MessagePack
- Protocol Buffers
- Arrow
- Custom Binary
Benchmark statt Bauchgefühl.
Speichere:
- solutionId
- version
- solverVersion
- configHash
- rangeHash
- treeHash
- accuracy
- createdAt
Alte Analysen sollen reproduzierbar bleiben.
Prüfe:
- Frequencies = 100 %
- legal hands
- legal cards
- valid ranges
- numeric EVs
- consistent transitions
- stacks never negative
- correct pot
- legal actions
- sufficient convergence
- intact artifacts
Ungültige Solutions dürfen nicht produktiv verwendet werden.
Unterstütze:
- Local Worker
- CPU Worker
- GPU Worker
- Batch Worker
Architektur:
```text
Job Queue
    ↓
Scheduler
    ↓
Workers
    ↓
Solver
    ↓
Artifacts
    ↓
Validation
    ↓
Production Library
```
Unterstütze:
- job deduplication
- retries
- priorities
- checkpoints
- failure recovery
- progress
- cost tracking
Tracke:
- CPU Hours
- GPU Hours
- Storage
- Memory
- Egress
- Cost per Solution
- Solve Time
- Failed Jobs
Admin Dashboard dafür vorsehen.
NICHT sofort alles lösen.
Start:
6-max NLHE Cash
100 BB
- RFI
- vs RFI
- BB Defense
- SB Defense
- 3-Bet
- vs 3-Bet
- 4-Bet
SRP:
- BTN vs BB
- CO vs BB
- SB vs BB
3-Bet Pots:
- BTN vs BB
- BTN vs SB
- SB vs BTN
- BB vs BTN
Später erweitern.
Priorisiere Berechnungen intelligent.
Grundidee:
```text
Priority =
User Demand
× Frequency
× Learning Value
× Coverage Gap
÷ Compute Cost
```
Später:
```text
User requests Spot
       ↓
Solution exists?
   ↙       ↘
 YES       NO
 ↓          ↓
Load       Queue Solver
            ↓
         Compute
            ↓
         Validate
            ↓
          Store
            ↓
         Deliver
```
Subscription Limits berücksichtigen.
Entscheidungen nicht nur richtig/falsch klassifizieren.
```text
EV Regret =
Best Action EV
-
User Action EV
```
Darauf basierend:
- Perfect
- Excellent
- Good
- Inaccuracy
- Mistake
- Major Mistake
Thresholds konfigurierbar.
Entwickle einen aggregierten GTO Score.
Berücksichtige sinnvoll:
- EV Regret
- Frequency Deviation
- Spot Difficulty
- Street
- Sample Size
- Recent Performance
Keine willkürliche Formel hardcoden.
Dokumentiere die Methodik.
Unterstütze:
- Preflop
- Flop
- Turn
- River
- Showdown
Zeige:
- Table
- Players
- Positions
- Stacks
- Cards
- Bets
- Pot
- Actions
Controls:
- Previous
- Next
- Play
- Reset
- Street
Abstraction:
```ts
interface HandHistoryParser {
  canParse(input: string): boolean;
  parse(input: string): Promise<NormalizedHand>;
}
```
Spätere Adapter beispielsweise für unterschiedliche Pokerplattformen.
Normalized Model:
- Hand
- Players
- Positions
- Stacks
- Actions
- Board
- Pot
- Result
Für jede Decision:
- User Action
- Strategy
- Frequency
- EV
- EV Loss
- Classification
Gesamtanalyse:
- biggest mistakes
- alternative lines
- concepts
- recommended lessons
- recommended trainer spots
Wenn keine exakte Solution existiert:
NICHT erfinden.
Stattdessen:
- nächstgelegenen kompatiblen Spot verwenden
- Unterschiede anzeigen
- Analyse als approximiert kennzeichnen
- optional Solver Job ermöglichen
Beispiele:
- BB overfold
- SB underdefend
- zu wenig BTN Opens
- zu viele Flop C-Bets
- falsche Bet Sizes
- zu wenig River Bluffs
Zeige:
- Leak
- Severity
- Sample Size
- EV Impact
- Lesson
- Training Recommendation
Skill Scores beispielsweise:
```text
BTN Preflop          84 %
BB Defense           62 %
3-Bet Pots           71 %
Flop C-Betting       89 %
Turn Strategy        54 %
River Bluff Catching 48 %
```
Schwächere Bereiche stärker priorisieren.
Automatisch wiederholen:
- falsch beantwortete Theorie
- falsch gespielte Spots
- schwache Ranges
- vergessene Inhalte
Beispiel:
```text
Heute:

5 Preflop Ranges
7 GTO Spots
3 Theory Questions
```
Professionell, nicht kindlich:
- XP
- Levels
- Streak
- Goals
- Achievements
- Challenges
- Skill Rating
- Quick Trainer
- Focus Trainer
- Weakness Trainer
- Range Drill
- Daily Challenge
- Custom Trainer
Custom:
- Game
- Position
- Stack
- Street
- Board
- Spot
- Difficulty
Der AI Coach erhält strukturierten Kontext:
- Board
- Range Hero
- Range Villain
- Pot
- Stack
- Solver Strategy
- Frequencies
- EV
Erklärt:
- was
- warum
- Konzept
- Anwendung
Niemals Solver-Werte halluzinieren.
Immer unterscheiden zwischen:
- solverbasierter Aussage
- allgemeiner Theorie
- Approximation
Die Anwendung darf NICHT wie ein generisches AI-Dashboard aussehen.
Designrichtung:
- Dark Mode primary
- sophisticated
- analytical
- calm
- professional
- high information density
- excellent typography
- strong hierarchy
Vermeide:
- beliebige Gradients
- übermäßiges Glassmorphism
- überall identische Cards
- generische SaaS Heroes
- unnötige Neon-Elemente
- Casino-Klischees
- Goldchips-/Las-Vegas-Look
- wahllose Animationen
- Emoji-UI
Die Plattform soll wirken wie:
ein professionelles Strategie-, Analytics- und Lernwerkzeug.
Vermittle:
- Precision
- Strategy
- Mastery
- Progress
- Decision Making
Inspiration darf aus:
- Trading Software
- Sports Analytics
- Developer Tools
- Data Products
- Premium Learning Software
kommen.
Keine 1:1 Kopien.
Definiere:
- Typography
- Colors
- Spacing
- Radius
- Elevation
- Motion
- Iconography
- Breakpoints
- Grid
- Button
- IconButton
- Input
- Select
- Tabs
- Tooltip
- Popover
- Modal
- Drawer
- BottomSheet
- Card
- StatCard
- Toast
- Skeleton
- EmptyState
- ErrorState
- Navigation
- PlayingCard
- HoleCards
- Board
- PokerTable
- PlayerSeat
- PotDisplay
- ActionButton
- BetSizeSelector
- RangeMatrix
- RangeCell
- FrequencyBar
- EVIndicator
- GameNode
- HandTimeline
- TrainerFeedback
Desktop bleibt Priorität für komplexe Analyse.
Smartphone muss trotzdem hervorragend funktionieren.
Nicht:
Desktop schrumpfen.
Sondern Mobile Interaction neu denken.
Beispiele:
```text
Sidebar
→ Bottom Navigation

Multi Panel
→ Single Focus Panel

Range + Details
→ Range + Bottom Sheet

Large Table
→ Progressive Disclosure

Game Tree
→ Node Navigator
```
Optimieren für:
- große Action Buttons
- One-Hand Use
- Touch
- schnelle Entscheidungen
- Bottom Sheets
- unmittelbares Feedback
- wenig Navigation
Der Trainer soll sich auf dem Smartphone wie eine hochwertige Lern-App anfühlen.
Besondere Optimierung für 13×13 Matrix.
Unterstütze nach UX-Test:
- tap to inspect
- zoom
- focus mode
- sticky context
- bottom sheet
- clear legends
Mindestens testen:
- 320–375 px
- 390–430 px
- 768–1024 px
- 1280–1440 px
- 1920 px+
Bei wichtigen Screens:
1. implementieren
2. Desktop Screenshot erzeugen
3. Mobile Screenshot erzeugen
4. visuell bewerten
5. verbessern
6. erneut prüfen
Bewerte:
- Hierarchy
- Alignment
- Spacing
- Typography
- Density
- Contrast
- Interactions
- Consistency
- Responsiveness
Wichtige Screens erhalten mindestens:
Functional Layout
Visual Hierarchy
Interaction Polish
Mobile Optimization
Accessibility + Performance
Der erste Entwurf ist nicht automatisch final.
Berücksichtige:
- Keyboard Navigation
- Focus States
- Semantic HTML
- ARIA
- Contrast
- Reduced Motion
- Touch Targets
- Screen Reader Compatibility
- accessible forms
- visible errors
Falls kein existierender Stack vorhanden ist, bevorzuge einen modernen, wartbaren Stack.
- Next.js
- React
- TypeScript
- Tailwind CSS
- hochwertige Component Library
- modularer Server/API Layer
- PostgreSQL
- Prisma oder vergleichbar
- S3-compatible
- geeignete Job Queue
- Redis oder vergleichbar, wenn erforderlich
- moderne geeignete Auth-Lösung
- Vitest
- React Testing Library
- Playwright
- Web Hosting
- Managed PostgreSQL
- Object Storage
- Worker Compute
- GPU Compute separat
Vermeide unnötige Vendor-Lock-ins.
Prüfe laufend:
- Client Components
- Server Components
- Waterfalls
- Re-Renders
- Bundle Size
- Lazy Loading
- Code Splitting
- Streaming
- Suspense
- Caching
- Fonts
- Images
- Hydration
- heavy libraries
Performance ist ein Produktfeature.
Pokerlogik zentral halten.
Mindestens:
- Card
- Rank
- Suit
- Deck
- Combo
- HandClass
- Range
- Position
- Street
- Action
- BetSize
- Stack
- Pot
- Board
- GameState
- GameTree
- GameNode
- Strategy
- StrategyAction
- SolverConfig
- Solution
- HandHistory
- TrainerSpot
Tests für:
- Cards
- Deck
- Positions
- Pot Calculation
- Stack Updates
- Bet Sizes
- Action Sequences
- Hand Parsing
- 1326 Combos
- 169 Classes
- suited/offsuit
- Suit Isomorphism
- EV
- Regret
- Tree Traversal
Nicht raten.
Berücksichtige:
- Lazy Loading
- Pagination
- Virtualization
- Indexes
- Cache
- CDN
- Binary Data
- Compression
- Memory
- Streaming
- Chunked Loading
Keine komplette Solution laden, wenn nur ein Node benötigt wird.
Beispiel:
```text
Browser
  ↓
CDN
  ↓
Application Cache
  ↓
Strategy API
  ↓
Object Storage
```
Solution Version im Cache Key berücksichtigen.
Mindestens:
- Auth
- Authorization
- Input Validation
- Rate Limiting
- Secure Sessions
- XSS Protection
- CSRF Protection
- SQL Injection Prevention
- Safe File Uploads
- Server-Side Permissions
- Secret Management
- Signed Storage URLs
Keine Secrets im Frontend.
Von Anfang an berücksichtigen:
- Data Export
- Account Deletion
- Privacy Settings
- Consent
- Cookie Handling
- Data Minimization
- Retention Policy
Keine erfundenen Rechtstexte erzeugen.
Der MVP ist eine:
Poker-Lern-, Analyse- und Trainingsplattform.
Keine Real-Money-Gambling-Funktionalität integrieren.
Kein:
- Einzahlen
- Auszahlen
- Wetten
- Echtgeldtisch
- Glücksspielvermittlung
Falls später Echtgeld-, Affiliate- oder Gambling-nahe Funktionen geplant werden:
- Rechtslage je Jurisdiktion separat prüfen
- Age Gates
- Responsible Gaming
- Compliance
- Licensing
als eigenes Projekt behandeln.
Implementiere:
- Sign Up
- Login
- Logout
- Password Reset
- Profile
- Settings
- Session Management
Später:
- Google Login
- Apple Login
Speichere unter anderem:
- Name
- Avatar
- Skill Level
- Main Game
- Preferred Stakes
- Preferred Format
- Study Goal
- Weekly Study Target
- Experience Level
Fragen:
1. Pokererfahrung?
2. Hauptformat?
3. Stakes?
4. wichtigste Lernziele?
5. Trainingszeit pro Woche?
Danach personalisiertes Dashboard.
Architektur vorbereiten:
- Fundamentals
- limited Trainer
- limited Analysis
- Full Academy
- Full Training
- Analytics
- Hand Analyzer
- Advanced GTO
- Solver Features
- AI Coach
- Advanced Leak Finder
- On-Demand Solver Priority
Preise konfigurierbar.
Subscription Provider austauschbar halten.
Admin kann:
- Courses
- Modules
- Lessons
- Videos
- Quizzes
- Trainer Spots
- Ranges
- Solver Jobs
- Solutions
- Versions
- Users
- Subscriptions
- Feature Flags
verwalten.
Instrumentiere wichtige Events.
Beispiele:
```text
lesson_started
lesson_completed
trainer_started
trainer_decision
trainer_completed
hand_imported
analysis_completed
leak_detected
recommendation_clicked
subscription_started
subscription_cancelled
```
Tracke keine unnötigen personenbezogenen Daten.
Ziel:
- Activation
- Retention
- Learning Outcomes
- Funnel
- Feature Adoption
Nicht nur Vanity Metrics.
Von Anfang an vorsehen:
- structured logs
- error tracking
- performance monitoring
- traces
- worker monitoring
- queue monitoring
- solver failures
- API latency
- DB performance
Production Errors dürfen nicht nur in Console Logs verschwinden.
Implementiere Health Endpoints für:
- Application
- Database
- Queue
- Storage
- Solver Workers
Bei jedem Pull Request bzw. Main Build:
- install
- typecheck
- lint
- unit tests
- integration tests
- production build
Für relevante Flows zusätzlich E2E.
Keine kaputte Version deployen.
Trenne:
- development
- test
- staging
- production
Keine Production Secrets lokal hardcoden.
Für kommerziellen Betrieb vorbereiten:
- DB backups
- Object Storage durability
- restore procedure
- recovery tests
- retention
- solution artifact protection
Eigene GTO-Datenbank kann später ein wertvolles Asset sein.
Sie muss technisch geschützt werden.
Neue Features kontrolliert ausrollen.
Beispiele:
- Solver Lab
- AI Coach
- New Trainer
- Experimental Scoring
Feature Flags statt riskanter Big-Bang-Releases.
Mindestens:
Poker Domain Logic.
API, Database, StrategyProvider.
Kernflows.
wichtige Screens.
Solution Integrity.
Der erste vollständige Flow:
```text
User
 ↓
Dashboard
 ↓
Academy Lesson
 ↓
Poker Exercise
 ↓
Decision
 ↓
Strategy Evaluation
 ↓
Progress Saved
 ↓
Dashboard Updated
```
Dieser Flow muss vollständig funktionieren, bevor dutzende weitere Features angelegt werden.
- Project Foundation
- Auth
- Dashboard
- Design System
- Poker Domain Core
- Academy
- Range Matrix
- Preflop Trainer
- StrategyProvider
- Progress
- Solution Storage
- Solver Adapter
- Job Pipeline
- Postflop Trainer
- Hand Replayer
- Analytics
- Hand Analyzer
- Leak Finder
- Personalized Learning
- AI Coach
- Batch Solving
- On-Demand Solving
- GPU Scaling
- Node Locking
- Advanced Solver
- Native Apps
- Community
- Project Structure
- Git
- DB
- Auth
- Design System
- Navigation
- Dashboard
- Cards
- Deck
- Hand Model
- Poker Table
- Range Matrix
- Combo Enumeration
- Game State
- Courses
- Lessons
- Progress
- Quiz
- Range Explorer
- Range Trainer
- Scoring
- StrategyProvider
- Solution Schema
- Solution Index
- Demo Dataset
- Strategy API
- SolverJob
- Queue
- Worker
- Solver Adapter
- Import
- Validation
- Storage
- Game Tree
- Strategy Nodes
- EV Regret
- Solver-backed Training
- Batch Solving
- GPU Workers
- Solution Library Expansion
- Cost Tracking
- Subscription
- Billing
- Production Hardening
- Admin
- Analytics
- Observability
Arbeite auf Production-Quality-Niveau.
Ich möchte KEIN:
- Tutorial-Projekt
- Mockup
- statisches Dashboard
- Fake GTO Interface
- halbfertiges Feature Museum
- monolithischen Code
- UI ohne Backend
- Backend ohne UX
- erfundene Solver-Daten
Ich möchte eine robuste Grundlage für ein echtes SaaS-Produkt.
Der Code muss:
- TypeScript strict verwenden
- modular sein
- testbar sein
- klare Names besitzen
- Domain Logic trennen
- UI Logic trennen
- Solver Logic trennen
- Storage trennen
- geringe Kopplung besitzen
- keine unnötigen Duplikate enthalten
Keine unnötigen Mega-Dateien.
Keine Fake Buttons.
Keine funktionslosen Links.
Das gesamte Projekt wird ausschließlich im GitHub-Repository:
mankenntmich3/poker-learning-platform
verwaltet.
Dieses Repository ist die technische Langzeitquelle des Projekts.
Wenn bereits Code existiert:
- zuerst analysieren,
- guten Code weiterverwenden,
- keine unnötige Neuinitialisierung.
Wenn das Repo leer ist:
1. Initialstruktur erzeugen,
2. .gitignore anlegen,
3. professionelle README.md anlegen,
4. Dokumentationsstruktur anlegen,
5. ersten funktionsfähigen Stand committen.
Erstelle sinnvolle Commits.
Beispiele:
```text
feat: implement poker card domain model
feat: add preflop range matrix
feat: implement strategy provider abstraction
feat: add solver job pipeline
fix: correct pot calculation
test: add suit isomorphism coverage
refactor: separate solver storage layer
```
Keine bedeutungslosen Nachrichten wie:
```text
update
changes
stuff
```
Vor relevanten Commits:
- Typecheck
- Lint
- Tests
ausführen.
Halte main grundsätzlich funktionsfähig.
Für größere Features können Feature Branches verwendet werden.
Beispiele:
```text
feature/strategy-provider
feature/gto-trainer
feature/solver-pipeline
feature/hand-analyzer
```
Wenn Pull Requests unterstützt werden, nutze sie für größere Änderungen.
Lege mindestens an:
```text
/docs
  PRODUCT_SPEC.md
  PROJECT_STATUS.md
  architecture.md
  solver-architecture.md
  strategy-data.md
  decisions/
```
Speichere diese Produktspezifikation in:
```text
docs/PRODUCT_SPEC.md
```
Pflege:
```text
docs/PROJECT_STATUS.md
```
mit:
```text
DONE
IN PROGRESS
NEXT
ARCHITECTURAL DECISIONS
KNOWN LIMITATIONS
TECHNICAL DEBT
```
Aktualisiere diese Datei nach wesentlichen Milestones.
Eine neue Coding-Session muss das Projekt allein anhand des Repositorys nachvollziehen können.
Eine Funktion ist nur fertig, wenn:
1. implementiert
2. UI funktioniert
3. Backend funktioniert
4. Persistenz funktioniert
5. Loading State existiert
6. Empty State existiert
7. Errors behandelt werden
8. responsive
9. accessible
10. Typecheck erfolgreich
11. Lint erfolgreich
12. Tests erfolgreich
13. Production Build erfolgreich
Für Solver:
14. Output validiert
15. Provenance dokumentiert
16. Accuracy gespeichert
17. Version gespeichert
18. keine DEMO-Werte als reale Daten dargestellt
Untersuche zuerst Repository, Dateisystem, Tools und Environment.
Existierenden guten Code weiterverwenden.
Bei kleinen Entscheidungen selbstständig handeln.
Nur bei Entscheidungen mit erheblichen Auswirkungen auf:
- Kosten
- Architektur
- Recht
- Datenownership
den User zwingend einbeziehen.
Nach wichtigen Änderungen:
- typecheck
- lint
- test
- build
Fehler sofort beheben.
Keine Funktion als fertig markieren, wenn sie nicht funktioniert.
Keine Fake Solver Data.
Demo-Daten klar markieren.
Design und UX parallel zur Implementierung entwickeln.
Nicht erst am Ende „schön machen“.
Solver, Strategy Storage und Web App strikt entkoppeln.
Keine fremden proprietären GTO-Daten voraussetzen.
Jede GTO-Zahl muss technisch auf eine konkrete Quelle zurückführbar sein.
Die erste funktionierende Version eines wichtigen Screens ist nicht final.
Durchlaufe:
1. Functional Pass
2. Design Pass
3. Interaction Pass
4. Mobile Pass
5. Accessibility Pass
6. Performance Pass
Prüfe relevante Screens aus Sicht von:
Ist der Flow klar?
Ist die Oberfläche hochwertig?
Sind Informationen schnell erfassbar?
Ist verständlich, was passiert?
Beginne jetzt.
Öffne und analysiere:
mankenntmich3/poker-learning-platform
Prüfe:
- Repository-Zustand
- bestehende Dateien
- Branches
- Tooling
- verfügbare Schreibrechte
- Development Environment
Wenn leer:
Initialisiere professionell.
Installiere bzw. aktiviere, sofern unterstützt:
- frontend-design
- web-design-guidelines
- react-best-practices
Nutze sie während der Implementierung.
Führe nur notwendige aktuelle Recherche durch.
Definiere die finale Architektur:
```text
Web App
Poker Domain Core
Backend
PostgreSQL
Strategy API
Solution Storage
Queue
Solver Workers
Object Storage
Observability
```
Dokumentiere Architektur in:
```text
docs/architecture.md
```
Erstelle:
```text
docs/PRODUCT_SPEC.md
docs/PROJECT_STATUS.md
docs/solver-architecture.md
docs/strategy-data.md
```
Definiere Datenmodell.
Erstelle Design System.
Implementiere Poker Domain Core.
Implementiere StrategyProvider.
Implementiere den ersten vollständigen Vertical Slice:
```text
User
→ Dashboard
→ Academy
→ Training Spot
→ Decision
→ Evaluation
→ Progress
→ Updated Dashboard
```
Teste diesen Flow vollständig.
Führe:
- typecheck
- lint
- unit tests
- integration tests
- build
aus.
Fehler vollständig beheben.
Führe visuelle QA durch:
- Desktop Screenshot
- Mobile Screenshot
- UI Review
- Responsive Review
- Accessibility Review
Probleme beheben.
Committe den stabilen Stand.
Implementiere Solution Storage.
Implementiere ersten Solver Adapter.
Baue den Solver Proof of Concept:
```text
Game Config
→ Tree
→ Solve
→ Export
→ Normalize
→ Validate
→ Store
→ StrategyProvider
→ Trainer
```
Beweise End-to-End, dass eine selbst erzeugte Solution im Trainer verwendet wird.
Erweitere anschließend systematisch nach den Milestones.
Nicht sofort Full NLHE lösen.
Beginne mit:
- kleinem Toy Game
oder
- stark eingeschränktem Poker Spot.
Ziel:
```text
Solver
↓
Artifact
↓
Normalizer
↓
Storage
↓
API
↓
Trainer
```
vollständig beweisen.
Erst danach skalieren.
Bei längeren Arbeiten halte mich knapp über relevante Fortschritte auf dem Laufenden.
Berichte insbesondere:
Was funktioniert?
Welche Tests laufen?
Welche Solutions wurden tatsächlich berechnet?
Welche Strategy-Datasets existieren?
Welche wichtigen Entscheidungen wurden getroffen?
Was wird unmittelbar als Nächstes umgesetzt?
Keine langen theoretischen Abhandlungen, wenn stattdessen implementiert werden kann.
Du hast die Verantwortung, diese Spezifikation in ein hervorragendes Produkt umzusetzen.
Wenn während der Entwicklung eine zusätzliche Funktion sinnvoll erscheint:
1. Nutzen prüfen
2. Scope prüfen
3. technische Kosten prüfen
4. nur aufnehmen, wenn sie das Kernprodukt klar verbessert
Vermeide Feature Creep.
Erstelle eine kommerziell hochwertige Plattform, die langfristig verbindet:
Poker Academy
- 
Range Explorer
- 
Preflop Trainer
- 
GTO Trainer
- 
Hand Replayer
- 
Hand Analyzer
- 
Leak Finder
- 
Personalized Learning
- 
AI Poker Coach
- 
GTO Solver Infrastructure
- 
eigene Strategy Database
Das langfristige technische Asset lautet:
```text
Eigene Solver Infrastructure
        ↓
Eigene GTO Solutions
        ↓
Eigene Strategy Library
        ↓
Eigener Trainer
        ↓
Eigene User Learning Data
        ↓
Eigene Leak Detection
        ↓
Eigene Personalized Learning Engine
```
Die Plattform soll zunächst für meinen persönlichen Lernbedarf hervorragend funktionieren.
Sie soll gleichzeitig so gebaut werden, dass sie nach:
- ausreichender Datenvalidierung
- professionellem Content
- rechtlicher Prüfung
- Security Review
- Payment Integration
- Production Hardening
zu einem eigenständigen kommerziellen SaaS-Produkt weiterentwickelt werden kann.
Do not attempt to implement the entire specification simultaneously.
Treat this document as the complete long-term product specification.
First establish a production-quality foundation.
Then complete ONE fully functional vertical slice.
Do not create dozens of placeholder pages merely to make the application appear complete.
A smaller number of excellent, fully working modules is preferable to many unfinished modules.
Use the relevant frontend/design skills DURING implementation.
Do not postpone visual quality until the end.
Use the GitHub repository as the permanent single source of truth.
Persist all important project state there.
Do not rely on chat history as the only project memory.
Do not stop after creating a plan.
Begin implementation now.

## Confirmed repository

The user confirmed `mankenntmich3/poker-learning-platofmr` as the actual permanent repository on 2026-09-06. References to `poker-learning-platform` above describe the original requested spelling.
