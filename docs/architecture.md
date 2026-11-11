# Architecture

## Ownership

Rust owns a single SQLite connection protected by a mutex. Frontend windows invoke typed commands and receive snapshots. No window independently creates a timer or uses localStorage. All database changes run in transactions. A partial unique index permits one unfinished session. Tauri’s single-instance plugin prevents independent processes from competing over it.

Every successful mutation increments a process-local revision and emits `margin:changed` to all windows. Each listener reloads the database snapshot and ignores revisions older than the latest it has accepted. Listeners are installed before initial load, removed on unmount, and refresh on focus. The mini window has one label (`mini`); repeated opens focus the existing window.

## Time model

UTC timestamps are stored as signed millisecond integers. A session owns active intervals. Start opens an interval; pause closes it; resume opens another; finish closes any open interval and records the end. Timestamp differences determine duration. A 500 ms UI tick only redraws elapsed time; it does not accumulate time or write the database.

Sleep and closed-app time count while running. Paused sessions remain paused. On startup, an unfinished session receives a recovery notice. Finishing and editing its duration is the explicit correction path. The database refuses negative durations and backward-clock timer transitions. Time-zone changes affect display buckets rather than elapsed time. Ordinary NTP/system clock jumps can affect timestamp-based duration; correcting a session in History is the recovery path.

Sessions record their original IANA time-zone label for context. Current-zone day/hour splitting is implemented centrally in `analytics.ts`. Actual elapsed slices accumulate into local hours, including repeated fall-back hours and half-hour transitions. Paused gaps are never allocated. Period statistics use intervals intersecting the selected range, and counts include sessions with positive time in that range. Averages and longest durations refer to portions inside that period. Comparisons use the previous complete calendar period; an ongoing current period is not extrapolated.

## Subjects and study types

These are independent dimensions. Each session points to a subject and a study type. Both can be created inline, renamed, colored and archived. Unused choices can be deleted; foreign keys prevent deleting a choice referenced by history. Archival hides the choice from new timers while preserving history. Renames apply to the complete historical record. The four initial study types are configuration defaults, not fabricated study history.

Manual entries have one continuous interval and cannot overlap existing active intervals. Notes alone preserve a timer session’s pause structure. Editing time replaces that structure with a continuous manual entry; the editor explains this. Stale edits are rejected by comparing the stored update timestamp. Any active session prevents another timer from starting.

## Persistence and migration

Database path: Tauri `app_data_dir()/margin.sqlite3`. Debug builds alone may redirect it with `MARGIN_TEST_DATA_DIR`. The development toolchain, local test databases and installers are ignored by Git.

SQLite foreign keys, WAL, full synchronous writes, a five-second busy timeout and parameterized SQL are enabled. `user_version` selects ordered migrations, each applied in a transaction. A newer schema is rejected without resetting it. Migration 2 rebuilds the session and interval tables transactionally to add study-type foreign keys while retaining existing intervals. The test suite constructs a populated v1 database and verifies its upgrade.

## Backups

JSON version 2 includes subjects, types, sessions, intervals and settings. Version 1 imports default existing sessions to Studying. Imports reject unknown formats, missing references, duplicates, invalid interval order, future dates, invalid settings and multiple active timers before mutating anything. Input size is limited to 100 MB. Choosing an import only stages validated data; replacement requires a separate confirmation. Current timers must be finished or discarded first.

A safety JSON snapshot is written using a temporary file in the destination directory, flushed and atomically renamed before restore. The restore then replaces records inside a single SQLite transaction. No live SQLite file is copied. A restore failure leaves the prior records intact. An unfinished timer contained in a backup is restored with a recovery notice. Export uses the same atomic write path. CSV includes finished sessions and neutralizes spreadsheet formula prefixes in text fields.

## Native behavior

Tauri controls the mini window and fullscreen. A narrow capability file grants only the window operations needed by the local windows. File selection/export and opening the safety-backup directory go through Rust and native plugins. No HTTP plugin, remote font, network telemetry, account system or cloud service is included. A CSP restricts packaged content to local assets and Tauri IPC.

The main window remembers size, position and maximized state. The mini window is fixed-size, draggable and always-on-top. Closing it does not change the session. Closing the main window exits all windows; stored session state remains available on the next launch.

## Packaging

macOS and Windows are configured. The local machine can exercise Apple Silicon macOS. GitHub-hosted Windows and Intel macOS builds are configured but must actually run before release claims are made. Signing/notarization are separate release work and are not claimed by an ad-hoc-signed local build.

## Timer modes, schema 3

Migration 3 adds timer mode and optional target duration to sessions, timer preferences, and a single persisted runtime row for Pomodoro cycles, break state and completion notices. Existing sessions become stopwatches with their original intervals unchanged. Version 3 JSON backups preserve these fields; versions 1 and 2 remain importable. Old pin preferences are accepted for backup compatibility but the mini window always uses the native always-on-top flag.

A native 250 ms reconciliation loop checks the one active timed session, independently of either webview’s render cadence. It closes the last interval at its exact remaining-active-time deadline. A late tick or restart uses that deadline rather than the wake time. A Pomodoro break starts at that timestamp; an already elapsed break completes without starting another session. Breaks live outside the sessions table and cannot enter analytics. Paused sessions and breaks remain paused across restart. Commands also reconcile before acting so Finish/Pause races at a deadline return the completed snapshot. Snapshot revision checks prevent an older response overwriting newer state.

The live analytics view caps a timed session at its target even between native completion ticks. Manual changes to timing replace the interval model and clear its timer mode/target; note-only edits preserve them.

## Schema 4 and the study workspace

Migration 4 adds the optional `dailyGoalMinutes` preference with a disabled default of zero. JSON backups are version 4 and still accept versions 1–3. Goal values are validated from 0–1440; the UI uses a separate disable action. The existing note field stores an optional session intention supplied at Start, so no separate task entity or mandatory metadata is introduced.

The shared MonthCalendar supports arrow, Home/End and Page Up/Down navigation with focus transfer across months. DateRangePicker normalizes reversed selections and validates direct entries before Apply. History selects sessions whose active intervals intersect the local date range, so an overnight session can be found on either active date. Its summary reports time within the range; individual rows retain complete session duration. Statistics use the same local-day bounds and pass subject/type/date filters to History when a chart bar, day or study-mix cell is selected.

Study mix computes the intersections of saved intervals by subject, study type and session method. Manual entries are their own method. Median session length uses the durations that contribute to the selected period. Existing stopwatch/Pomodoro/countdown reconciliation and break accounting remain native and unchanged.
