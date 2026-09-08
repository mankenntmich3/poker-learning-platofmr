# NLHE becomes the primary product

2026-09-08. The owner prioritizes six-max no-limit Texas Hold'em preflop, followed by one bounded flop spot. Kuhn remains an internal regression fixture. No additional Kuhn content is planned.

The owner confirmed that no owned/licensed NLHE range files are available. We checked primary source terms: [GTO Wizard](https://gtowizard.com/terms/) restricts reuse of its ranges in commerce and automated access; the public [Pokerai explorer](https://github.com/pokerai-bet/PreflopExplorer) explicitly does not grant redistribution rights to its presolved data. No third-party ranges were copied and no paid service was added.

The first usable NLHE dataset is therefore an original **APPROXIMATED** educational policy. Its hand ordering, coarse boundary mixes and positional coverage assumptions are versioned in this repository. The model exposes its assumptions; structural tests are not described as GTO accuracy. Frequencies are coarse 25% mixtures, solver version is null, independently measured strategy accuracy is unavailable, and action EV/regret is null. The system must never score a heuristic disagreement as measured poker EV loss.

All requested stack presets use this same transparent heuristic, with stack-dependent hand ordering; these are not independent solver solutions or interpolated verified solves. Numeric stacks remain extensible (initial validated input boundary: 10–500 BB, hundredth-BB resolution). Only legal positional histories appear. An unopened BB has already won the pot, so RFI is unavailable there. Responses to a 3-bet are conditional on the hero's original opening range. An opponent's all-in removes the raise option.

The existing StrategyProvider becomes typed over its game/response types. The NLHE generator publishes an immutable artifact with an algorithm checksum through an offline pipeline. The same range/configuration/version feeds the explorer and server-owned trainer questions. Persisted session/question IDs bind decisions to cards, position, stack, history and data version, while retaining idempotent retries and account isolation.

After the preflop learning path is usable, the bounded postflop model covers BTN vs BB, 100 BB, single-raised pot, A♠ 7♦ 2♣ after BB checks. Its check/bet policy is also APPROXIMATED; card removal applies to the visible opponent range. This is not general postflop coverage.

## Design plan

Keep the established Manrope study interface: ink #0e141c, slate #151d28, mist #e8edf5, periwinkle #abbcfa and caution #e6c28b. Range actions use muted blue for fold, sage for call/check and coral for raise/bet, with text and proportional segments in addition to color.

The NLHE matrix is the central study surface. Desktop: compact configuration row → action history → large matrix beside hand details and a single training action. Mobile: configuration → horizontally scrollable matrix with readable cells → selected-hand details → training action. Alignment stays left; frequencies use tabular figures. Preserve keyboard grid navigation and visible focus.

The original generic combination-count view is insufficient for this task. Replace it with real selectable poker contexts, a permanent approximation notice, mixture segments and exact-spot training. Avoid a broad new navigation tree or another promotional page.
