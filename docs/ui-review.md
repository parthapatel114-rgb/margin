# Interface review · Margin 0.4.0

## Scope

A visual and interaction pass on Today, History, date filtering, Statistics Overview / Calendar / Study mix, Study Wrapped, settings, manual entry, subject/type management, mini and fullscreen. All existing product functions remain. The brief is a quiet study ledger: editorial headings, compact context controls, flat facts, one timer working surface and six restrained color schemes. LearnHarness supplied hierarchy and restraint as a visual reference; its code and artwork were not copied.

Applied skills: better-ui and better-layout, with better-colors and better-typography supporting the token system. Source, hover/pressed/disabled/selected states, reduced-motion rules and affected error/empty states were inspected. The previous report is retained in ui-review-0.3.md. Exact palette and state decisions are in redesign-0.4.md.

## Findings addressed

Rows are grouped by principle and ordered by severity within each group. Locations refer to the delivered source.

| Severity | Location                                                                                          | Before                                                                                                     | After                                                                                                                                | Why                                                                              |
| -------- | ------------------------------------------------------------------------------------------------- | ---------------------------------------------------------------------------------------------------------- | ------------------------------------------------------------------------------------------------------------------------------------ | -------------------------------------------------------------------------------- |
| HIGH     | src-tauri/build.rs:4                                                                              | A frontend-only rebuild could retain an older embedded preview, including temporary stress-test text/size. | Changes in dist invalidate the native embed; the final release was opened and showed English at normal text size.                    | A verified preview must represent the actual build.                              |
| HIGH     | src-tauri/capabilities/default.json:17; src-tauri/src/lib.rs:311; src/App.tsx:65                  | A confirmed close lacked destroy permission; macOS predefined Quit bypassed the draft handler.             | Scoped destroy permission and a standard-looking Quit menu action route close through draft confirmation.                            | Finish the user's close action while preserving a chance to retain input.        |
| HIGH     | src/styles.css:1356; src/styles.css:1413; src/components/Calendar.tsx                             | Enlarged text split two-digit calendar days and compressed direct-entry dates.                             | Day numbers remain unbroken; date fields stack at their required width; RTL keyboard progression mirrors.                            | Critical dates and Apply remain available under enlarged text and narrow layout. |
| MEDIUM   | src/styles.css:296; src/styles.css:771; src/styles.css:1066                                       | Equal boxes and repeated outlines competed with the timer and primary statistic.                           | Quiet rail, flat facts, inline continuation controls and one working timer surface.                                                  | Group with space and give the primary answer a clear leading position.           |
| MEDIUM   | src/main.tsx:3; src/styles.css:119; src/styles.css:688                                            | Generic typography and inconsistent visual emphasis.                                                       | Source Serif 4 headings, Source Sans 3 body/clock, tabular values and three retained font preferences.                               | Roles make scanning predictable without relying on decorative color.             |
| MEDIUM   | src/themes.css; src/lib/themes.ts; src/components/Settings.tsx                                    | Prior themes had uneven tint, control and chart emphasis.                                                  | Three carbon and three paper families with distinct secondary/accent tokens and consistent semantic roles.                           | Color variance follows the same hierarchy in every theme.                        |
| MEDIUM   | src/components/SessionEditor.tsx:68; src/components/Subjects.tsx:103; src/components/Feedback.tsx | Invalid local input relied on broad feedback; empty views lacked a concise visual anchor.                  | Inline icon errors with field association/focus, and a small original line illustration with a direct action.                        | Show the repair next to the input and make first use understandable.             |
| MEDIUM   | src/App.tsx:48; src/components/SessionEditor.tsx; src/components/Subjects.tsx                     | Route changes and dismissing edited dialogs could silently lose input.                                     | Timer setup survives route changes; changed forms ask before discard; Cancel preserves exact values.                                 | Abandonment must be reversible within the current window.                        |
| MEDIUM   | src/lib/store.ts:64; src/components/Settings.tsx                                                  | A failed mutation could encourage an unsafe repeat; export/restore recovery was unclear.                   | Refresh saved state before further action; retain the original failure; export and restore have explicit retry paths.                | Recovery should not duplicate writes or hide failures.                           |
| LOW      | src/styles.css:2403                                                                               | Interactive motion and theme changes could vary across surfaces.                                           | Explicit 120ms color response, enabled-only .96 press over 150ms, reduced-motion gate and suppressed transitions during theme swaps. | Consistent feedback without a page-wide color smear.                             |

## Verification

- Strict TypeScript, ESLint and frontend/native release builds pass.
- 30 JavaScript tests pass in each of New York, UTC, Kathmandu and Lord Howe; 26 Rust tests pass. Clippy denies warnings; Rust formatting passes.
- 180 declared semantic contrast pairs pass: 4.5:1 text and 3:1 control/focus/chart roles. Custom subject colors and every rendered pixel are outside this token measurement.
- Native macOS: all six themes, all three font choices, empty and populated Today, History, Overview, Calendar and Study mix inspected. Monthly recap traversed all three panels with recorded totals.
- Native first-use Add time continued through subject creation into manual entry. Negative duration showed a field error. Canceling discard retained the entered value.
- Timer Start/Pause, mini Resume, Finish with intention/type, and fullscreen Escape passed in a separate test database. The mini remains always on top.
- A prepared timer draft survived page changes. Cmd-Q showed a close confirmation; cancel retained the text and discard exited.
- Around 320 CSS px, Today, History, Statistics and date dialog reflowed. Dialog scroll exposed Apply/Clear/Cancel. Charts/tables retain an explicit overflow cue.
- A temporary German-label/RTL build at 200% root text size exposed and then verified the calendar fixes. RTL Right moved Nov 11 to Nov 10; Left returned. Tab reached Apply. This was a text-size simulation, not a browser zoom test. Stress code is excluded from the final build.
- Final installed 0.4.0 opened in English with normal text size and the existing production font. Its study rows were preserved; no test sessions were copied into production. The ad-hoc signature and DMG integrity checks pass.

Screenshots in screenshots/0.4 are actual native captures. Populated examples use an isolated QA database. stress-* images document temporary diagnostic settings and are not the default interface.

Not verified: actual browser/native 200% zoom, full VoiceOver operation, animation playback at 10% speed, all theme/font/state combinations, Dock Quit draft interception, forced termination draft recovery, forced disk failures/timeouts, hardware sleep/wake, Windows or Intel runtime. Offline behavior follows the existing bundled-font/local SQLite architecture; an airplane-mode test was not performed. No remote server flow was introduced.

## Verdict

Approve for the inspected native Apple Silicon macOS layouts and interactions. No HIGH finding remains in that scope. The limits above are not approved coverage.
