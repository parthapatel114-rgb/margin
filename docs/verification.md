# Verification

The initial checks below describe 0.1.0. The 0.2.0 results are recorded in the following section.

Verification was performed on Apple Silicon macOS on November 10, 2026. Test records were created in a separate debug data directory. Packaged release builds do not load those records.

## Automated checks

- Strict TypeScript check and ESLint pass.
- Frontend production build passes.
- All 15 Rust tests pass. They cover timer start/pause/resume/finish/cancel, duplicate prevention, backward clock rejection, persistence/recovery, manual entry validation and overlap rejection, stale edits, session deletion, subject/type rename and archival, deletion of unused subjects/types, settings persistence, JSON restore validation, legacy backups and CSV escaping.
- A populated v1 migration test verifies preservation of existing session notes and pause intervals when adding study types. A newer-schema test verifies refusal to open without resetting data.
- All 10 analytics cases pass in each configured time zone. They cover hourly and midnight splitting, pauses, period clipping, subject/type distributions, empty datasets, comparisons, calendar periods, recap active-day counts, running/paused recovery durations and DST transitions. They run under America/New_York, UTC, Asia/Kathmandu and Australia/Lord_Howe, including the half-hour fall-back case.
- Rust Clippy runs with warnings denied. Rust formatting is checked.
- npm dependency audit reports no known vulnerabilities in the installed dependency tree.

## Native app checks

The actual Tauri application was launched as a macOS app bundle and inspected visually.

| Workflow                    | Observed result                                                                                       |
| --------------------------- | ----------------------------------------------------------------------------------------------------- |
| First run                   | Clean empty state; no fabricated history                                                              |
| Inline subject + study type | Data Structures + Reviewing started a real session                                                    |
| Pause / resume / finish     | Timer changed state; finished session appeared in History                                             |
| Optional note               | Note saved without replacing recorded pause intervals                                                 |
| Native mini timer           | Separate compact window displayed the same elapsed time                                               |
| Cross-window controls       | Pausing in mini immediately changed the main window to paused                                         |
| Mini close                  | Session remained intact; reopening used the same session                                              |
| Fullscreen                  | Timer-only view; Escape returned to the main window                                                   |
| Manual history              | Past Practice and Reading entries saved and displayed under their dates                               |
| Type statistics             | Distribution showed recorded time separately for each study type                                      |
| Monthly Wrapped             | All three story panels used saved session data                                                        |
| Appearance                  | Light, Dark, Warm, Slate, Forest and Rose inspected; all three font options changed immediately       |
| JSON / CSV export           | Native save dialogs wrote valid files containing study types                                          |
| Restore preview             | Validated file contents were summarized before a separate confirmation; cancel preserved current data |
| Unexpected termination      | Process was killed with a running timer; restart preserved it and showed the recovery notice          |

The delivered macOS bundle passes `codesign --verify --deep --strict` with its ad-hoc signature, and its disk image passes `hdiutil verify`. This verifies local integrity, not Apple notarization.

Screenshots in `docs/screenshots/` are actual app captures. UI-verification records are excluded from delivery. Backup replacement and destructive database operations are covered by Rust tests; the native restore confirmation was not used to replace user records.

## Limits

Windows and Intel macOS have packaging workflows but were not run or manually tested on this host. Developer ID signing, Windows publisher signing and macOS notarization are not configured. macOS bundles use ad-hoc signing for local integrity. System sleep timekeeping is verified through the timestamp model and paused/running interval tests; an actual hardware sleep/wake cycle was not performed. Native UI automation exercised the current macOS version and common layouts, not every monitor arrangement, OS version or possible window size.

Optional system tray integration, automatic scheduled backups and PNG recap export are omitted. JSON/CSV exports and automatic safety backups before restore are implemented.

## 0.2.0 UI and timers

- TypeScript, ESLint and the production frontend build pass.
- 23 native Rust tests pass, including exact timed completion, paused gaps, fourth-focus long break, sleep/restart reconciliation, paused break restore, target/settings validation and populated schema-2 migration.
- 15 JavaScript tests pass in each of America/New_York, UTC, Asia/Kathmandu and Australia/Lord_Howe. The new cases cover remaining-time display, saved mode defaults, break pauses and capping live analytics at a target across a date boundary.
- Declared theme contrast: 108 semantic foreground/background pairs measured, zero below the applicable 4.5:1 text or 3:1 focus/control/chart threshold. This is a token-pair measurement, not a claim that every possible custom subject color or rendered pixel was audited.
- Native isolated Preview bundle: edited duration then immediately started a one-minute Countdown; it completed and saved exactly one minute. A one-minute Pomodoro focus saved exactly one minute and automatically entered its break. Pausing from the mini timer updated the main window. Skipping a paused break returned to Ready. Break time did not increase study totals.
- Native screens inspected: Today, History, populated and empty Insights, settings, mini and fullscreen. Escape returned from fullscreen. Main window resized from wide desktop to roughly 320 CSS px; Today/History reflowed and scrolled vertically. Native captures are in `docs/screenshots/`.
- The Preview app uses a separate identifier and data directory. Its records are not copied into the production app.

Not verified in this revision: 200% text zoom, RTL/pseudo-localized strings, full VoiceOver interaction, every theme/state combination, Windows/Intel runtime, and an actual hardware sleep/wake cycle. These remain explicit boundaries; tests simulate timestamp advancement and restart.

The packaged 0.2.0 release was opened successfully against the normal application-data folder. Its populated preferences were retained (Forest / IBM Plex Mono), schema 2 upgraded to 3, and the pre-existing zero-session history remained zero; no Preview records appeared. The packaged app passed strict deep codesign verification, and the DMG checksum was valid under `hdiutil verify`.
