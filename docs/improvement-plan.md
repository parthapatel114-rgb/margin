# Margin 0.3 improvement plan

The user asked for a fuller, clearer visual experience, easier statistics, competitor research and implementation of the improvements that preserve the core. This is the concrete, bounded implementation list for this pass. It keeps the local flow: subject → study type → timer → saved history → statistics.

## Research, November 10, 2026

| Product                                                                            | Official evidence                                                           | Decision for Margin                                                                   |
| ---------------------------------------------------------------------------------- | --------------------------------------------------------------------------- | ------------------------------------------------------------------------------------- |
| [Toggl](https://toggl.com/features)                                                | Time targets, filtered reports and calendar-based records                   | Optional daily target, direct date filters and chart-to-history drilldown             |
| [Toggl timer page](https://support.toggl.com/en-us/article/the-timer-page-x46p31/) | Timer above log views; date range picker; reusable favorites                | Compact timer workspace, recent subject/type shortcuts and shared range calendar      |
| [Session](https://www.stayinsession.com/)                                          | Stated focus and post-session review                                        | Optional intention stored in the existing session note, editable after finishing      |
| [Focus To-Do](https://www.focustodo.cn/?lang=en_US)                                | Pomodoro plus daily/weekly/monthly time reports and project shares          | Preserve timer modes; improve the hierarchy of recorded-time reports                  |
| [Study-Track](https://docs.study-track.app/features/stats/)                        | Saved-session date ranges, heatmaps, subject breakdowns and hourly patterns | Unify filters, improve the activity calendar and make details progressively available |

These are observations from official feature pages and documentation, not hands-on claims about competitors' full apps. The subject-by-study-type matrix is a Margin-specific synthesis of the user's studying/reviewing request; no claim of worldwide novelty is made.

## Complete implementation list

1. A compact workspace with an app navigation rail, smaller timer and consistent content alignment; responsive top navigation on narrow windows.
2. A first-session path with selectable subject suggestions, clear study-type choices and one useful next action; no fabricated records.
3. Reusable recent subject/study-type combinations that prepare a new session, without starting time unexpectedly.
4. Optional session intention before Start, saved locally as the session note and editable afterward.
5. Optional daily study-minute target with actual progress, edit and disable controls; disabled by default.
6. History search across subject, type and notes, plus newest/oldest/longest sorting and a visible filter reset.
7. One themed, keyboard-operable date-range calendar with presets, range preview, Apply and Clear; used in History and statistics.
8. Subject/type/date filters in statistics, meaningful zero states, and chart/day actions that open the matching history.
9. A compact statistics overview with total time, sessions, active days, readable labeled trend bars and secondary patterns behind disclosure.
10. A subject-by-study-type time matrix and timer-mode breakdown using real saved durations, with no productivity scores.
11. A usable monthly activity calendar with day totals and day details, plus a separate yearly overview; styles shared with date selection.
12. Keyboard navigation shortcuts, focus restoration and verified narrow layouts; preserve existing themes, fonts, mini/fullscreen, backups and timer correctness.

## Product boundary

This pass does not turn Margin into a task manager, cloud service, social leaderboard or surveillance tool. Competitor features involving accounts, integrations, billing or website blocking are not selected improvements. No new permission-heavy service or dependency is necessary for the selected list.

## Completion evidence

All 12 selected improvements are implemented in 0.3.0.

| Item | Completed implementation                                    | Evidence                                                                       |
| ---- | ----------------------------------------------------------- | ------------------------------------------------------------------------------ |
| 1    | Navigation rail, horizontal timer workbench, compact totals | Native desktop and narrow Today captures                                       |
| 2    | Suggested subjects and study-type chips                     | First session created only after Start                                         |
| 3    | Continue cards and repeat actions                           | Native repeat prepared Mathematics / Reviewing in Ready                        |
| 4    | Session intention saved as note                             | Native note appeared in History; Rust validation and backup test               |
| 5    | Optional daily target                                       | Native 60-minute target; persistence, bounds and legacy backup tests           |
| 6    | History search, sorting, reset and interval-based dates     | Native note search; clipped date analytics tests                               |
| 7    | Shared themed range calendar                                | Reversed selection, Last 7 days, month-boundary keys and narrow dialog checked |
| 8    | Statistics filters and History drilldown                    | Mathematics / Practice opened 10 sessions totaling 4h 10m                      |
| 9    | Overview with three metrics and readable charts             | Populated native Overview and 320px scroll cue inspected                       |
| 10   | Subject/type matrix and separate timer/manual methods       | Native matrix drilldown; method regression test                                |
| 11   | Monthly calendar, selected-day detail and yearly overview   | Native Month and Year views inspected                                          |
| 12   | Route/subject/mini shortcuts and responsive focus behavior  | Native keyboard checks, fullscreen exit, mini and narrow layouts               |

Verification: 26 Rust tests; 21 JavaScript tests in each of four time zones; strict TypeScript, lint, production build, Clippy and Rust formatting; 108 declared contrast pairs pass. See verification.md and ui-review.md for the tested scope and explicit limits. Populated captures use an isolated QA database; fixtures are not shipped.
