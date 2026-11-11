# Requirements and amendments

The original user brief is preserved verbatim in `Project Brief.md`.

Follow-up: study types (Studying, Reviewing and other user-defined activities) must be recorded with sessions and used in statistics. Implemented as a separate dimension from subjects, with inline creation, rename/archive, persistence, History filters, Insights distribution and both export formats.

No further product scope has been added. Optional tray integration, automatic scheduled backups and recap PNG export are omitted. Safety backups before restore are implemented. Runtime remains local and offline.

## User amendments: UI and timers (November 10)

- One coordinated UI pass across Today, History, Insights, settings, subjects/types, dialogs, recap, mini and fullscreen timer.
- Reduce unused desktop space with a wide timer/overview arrangement and compact spacing; retain responsive stacking.
- Remove slogans, decorative footer and unnecessary explanatory subtext. Empty states contain a short factual label and useful action.
- Install and apply the relevant jakubkrehel/skills interface skills.
- Add switchable Stopwatch, Pomodoro and Countdown modes, with editable durations and correct persisted statistics. Breaks contribute no study time.
- Always pin the native mini timer and remove the pin toggle and preference.

## User amendments: compact experience, research and calendars

- Address the remaining empty space and the first-session experience across the app.
- Simplify the statistics view and make its important information easier to scan.
- Research competitors, list a concrete set of improvements that preserve the core, and implement the selected list completely.
- Improve History's date-filter calendar and make it match every app theme.
- The implemented list is in docs/improvement-plan.md. No cloud, account, social, surveillance or task-management system is introduced.
