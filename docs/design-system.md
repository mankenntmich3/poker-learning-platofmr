# Rangeform design system

## Direction

Rangeform is a focused poker study desk: the table makes a decision tangible, the adjacent strategy panel makes its consequences readable. It is a learning tool for deliberate practice. Use original content and native CSS/SVG playing cards, never casino decoration.

## Tokens

- Ink `#0e141c`: page background.
- Slate `#151d28`: navigation and quiet surfaces.
- Raised slate `#1b2533`: interactive surfaces.
- Mist `#e8edf5`: principal text and paper cards.
- Periwinkle `#abbcfa`: primary controls and selected state.
- Sage `#9ec7b8`: verified provenance and completion.
- Secondary text `#a6b2c4`, borders `#2c384a`, caution `#e6c28b`.

Manrope Variable supplies the interface, from 13px supporting text to 38px page titles. Numeric values use tabular figures. Titles use sentence case. Body copy has a comfortable measure and at least 1.6 line height.

The desktop has a 224px navigation rail, a compact header, and a flexible study canvas. Dashboard metrics form one continuous rail, followed by a broad current lesson and a smaller weekly-practice panel. Trainer uses one visual table with an adjacent evaluation panel. On phones, navigation moves to the bottom and the active decision precedes the feedback.

The distinctive element is the restrained elliptical table with paper-colored private cards and subtle positional annotations. Surrounding content remains quiet. We deliberately removed decorative chart lines, fabricated activity, casino chips, generic promotional heroes, and repetitive equal-size cards from the initial plan.

## Components and behavior

- Spacing follows 4/8/12/16/24/32/48px. Surfaces use 12px corners; fields 8px, buttons 8px; tables use their own elliptical geometry.
- Buttons and touch controls target at least 44px height. Primary controls use dark text on periwinkle. Hover/focus increases contrast.
- Links navigate; buttons mutate. Every asynchronous operation exposes loading, failure, and recovery. Training evaluations are server-supplied.
- Keyboard focus is explicit. Main content has a skip link. Forms have persistent labels. Feedback uses live regions.
- Range cells use compact geometry with arrow-key navigation; the selected class has a separate readable combo inspector. Small screens scroll the matrix within its labeled region instead of shrinking labels indefinitely.
- Data provenance appears beside training context and evaluation. Kuhn computations are explicitly separated from NLHE, and no strategic frequencies are assigned to the NLHE combo explorer.
- Reduced-motion settings disable nonessential transitions. Motion only acknowledges interaction. Numbers and dates use German locale formatting.

## Implementation guidance

Applied frontend-design, Vercel React best practices, and Web Interface Guidelines during implementation. Route shells remain server components, with interactive study modules as client boundaries. Independent API requests run in parallel. Server-only solver modules never enter the client bundle. Icons are optimized by Next.js. No charting or animation library is needed for the first flow.

Visual QA covers nine viewport widths from 320 to 1920px, keyboard navigation, empty accounts, form validation, actual training feedback and range inspection. Six axe scans cover the three main study views on mobile and desktop. Results and permanent screenshots are recorded in [QA evidence](qa/README.md). Further commercial release work is tracked separately in PROJECT_STATUS.md.
