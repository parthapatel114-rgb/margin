# Interface review · Margin 0.3.0

## Scope and coverage

Scope: the desktop entry flow, study setup, Today, History/date filtering, Statistics Overview/Calendar/Study mix, repeat preparation, optional targets/intentions, and the affected shared controls. Stack remains Tauri 2, React and strict TypeScript with the project's CSS tokens and existing icon/font dependencies. No runtime dependency was added. Inspected conventions: Project Brief.md, CONTRIBUTING.md, README.md, docs/design.md, docs/requirements.md and docs/architecture.md. No AGENTS.md was found inside this repository.

The seven installed jakubkrehel interface skills were applied. Competitor research and the bounded, complete improvement list are in improvement-plan.md. The previous review is retained as ui-review-0.2.md.

| Domain        | Evidence inspected                                                                                                                                                            | Result                                                                                                                                   |
| ------------- | ----------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | ---------------------------------------------------------------------------------------------------------------------------------------- |
| Accessibility | Native AX names; labeled fields/errors; date dialog Tab/arrow navigation; month-boundary focus; modifier navigation; native modal containment; source focus and motion styles | Calendar arrows moved Nov 1 → Oct 31 and focused the matching button; named routes and date actions exposed; full VoiceOver not verified |
| Layout        | Native wide desktop, 1200px and approximately 320px windows; Today, History, date dialog, populated Statistics; vertical/horizontal overflow cues                             | Main controls reflowed; date actions reached through the dialog's visible scroll path; 200% text zoom and RTL not verified               |
| Writing       | First-use setup, headings, filters, date status, empty states, table labels, repeat and target controls                                                                       | Removed filler and visible duplication; retained explanations that affect data or action meaning                                         |
| Typography    | Rem tokens, tabular clocks/totals, labeled bars, responsive cards and session metadata                                                                                        | Consistent hierarchy and explicit durations; all fonts in every state not verified                                                       |
| Colors        | Existing six semantic palettes, shared calendar states, explicit selector boundaries and measured role pairs                                                                  | 108 declared pairs pass; custom user subject colors are outside that claim                                                               |
| UI            | Compact workbench, navigation rail, native mini/fullscreen structure, date states, selector height, disclosures and existing hover/motion gates                               | Shared control language; duplicate calendar mode selectors removed                                                                       |

## Findings addressed

| Severity | Domain     | Location                                         | Before                                                                                           | After                                                                                         | Why                                                                      |
| -------- | ---------- | ------------------------------------------------ | ------------------------------------------------------------------------------------------------ | --------------------------------------------------------------------------------------------- | ------------------------------------------------------------------------ |
| HIGH     | Writing    | src/lib/insights.ts:46                           | During implementation, manual time inherited the legacy stopwatch metadata in method totals      | Manual entries have their own method and a regression case                                    | Reports must not imply manual time was recorded with a timer             |
| MEDIUM   | Layout     | src/styles.css:2171; src/components/Today.tsx:14 | Large timer card and empty side areas dominated the desktop view                                 | Side-by-side session setup and timer, compact totals and useful continuation/history sections | Reduce empty surface area and clarify the next action                    |
| MEDIUM   | Writing    | src/components/Timer.tsx                         | Empty subject prompt offered little first-use guidance                                           | Selectable subject suggestions, visible study-type choices and an optional intention          | Help a newcomer prepare a real session without adding onboarding screens |
| MEDIUM   | Layout     | src/components/Insights.tsx:69                   | Long statistics page mixed primary totals and secondary charts                                   | Overview / Calendar / Study mix with three primary metrics and disclosed patterns             | Make the main answers visible before secondary analysis                  |
| MEDIUM   | UI         | src/components/Calendar.tsx                      | History used separate native date inputs with a different visual language                        | Shared themed calendar, presets, selected range, direct entry and Apply/Clear                 | Date filtering matches the app and communicates the selected range       |
| MEDIUM   | UI         | src/styles.css:2599                              | Native statistics selectors rendered visibly shorter than adjacent controls in the first preview | Explicit appearance, 38px height and a token-colored chevron                                  | Keep filters legible and consistent                                      |
| MEDIUM   | Layout     | src/styles.css; src/components/Insights.tsx      | Dense month/year series could crowd duration labels                                              | Minimum-width bars, horizontal scroll and an overflow cue                                     | Values remain readable without clipping the page                         |
| LOW      | Writing    | src/components/Insights.tsx                      | Repeated month/year switches and a visible caption restated the table heading                    | One scale selector; caption remains accessible but visually hidden                            | Remove redundant controls and subtext                                    |
| LOW      | Typography | src/components/Today.tsx                         | “Sessions today” wrapped at the narrow stress-test width                                         | Short visible label with explicit tooltip context                                             | Keep the summary row aligned                                             |

## Verification

Passed:

- `npm run typecheck`, `npm run lint`, `npm run build`.
- `npm run test:zones`: 21 tests in each of America/New_York, UTC, Asia/Kathmandu and Australia/Lord_Howe.
- `npm run test:rust`: 26 native cases, including schema 3→4 preservation, optional targets and intention validation/backup round trips.
- `npm run check:rust`: Clippy with warnings denied. `npm run format:rust -- --check`: formatting passes.
- `python3 scripts/check-contrast.py`: 108 declared semantic pairs, zero threshold failures. Text threshold 4.5:1; measured focus/control/chart threshold 3:1. This is not a pixel audit of every composition.
- Native first session: selected Mathematics / Reviewing, entered an intention, started and finished. The saved note and type appeared in History. A 60-minute target saved and its actual progress displayed. Repeat prepared a new session without starting time.
- Native date filtering: Nov 10 followed by Nov 3 normalized to Nov 3–10. Last 7 days applied Nov 4–10. Under the Mathematics/Practice filter it returned seven sessions and exactly 2h 55m.
- Native keyboard calendar: Tab reached the day buttons; Left on Nov 1 changed the month to October and focused Oct 31.
- Native study mix: the Mathematics/Practice cell opened History with the expected subject/type/date filters, ten sessions and 4h 10m.
- Native narrow checks: Today, History, Statistics and date dialog reflowed around 320 CSS pixels. The date dialog's scrollbar exposed its fields and Apply action. Trend overflow announced a visible scroll cue.

Populated UI tests use 30 explicitly synthetic records plus the native verification session in a named isolated Preview database. Those records are not included in the app or source archive. Production data is kept separate.

Not verified: 200% text zoom, RTL/pseudo-localization, complete VoiceOver operation, every theme/font/state combination, hardware sleep/wake, Windows and Intel macOS runtime. Native timing tests simulate late ticks, sleep-like timestamp advancement and restart. The existing six-theme and platform limits remain in verification.md.

## Verdict

Approve within the inspected native macOS scope. All six interface domains above were reviewed. No HIGH finding remains in that scope; the verification boundaries above are explicit.
