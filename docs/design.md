# Margin

A small desktop study journal. A timer in the foreground; a useful history accumulating quietly behind it.

## Research · November 10, 2026

- [My Study Diary](https://www.mystudydiary.com/diary): inspected the live interface. Clear large stopwatch, subject selection, chronological sessions. Its goals, exams, flashcards, account prompts and onboarding make the first view crowded. Margin keeps subject creation beside Start and needs no onboarding.
- [tudy statistics](https://tudyapp.com/en/features/stats): read the feature page and inspected its supplied screenshot. Useful period comparisons and subject percentages. Margin uses time consistently, without XP or task-completion metrics.
- [Study-Track](https://docs.study-track.app/features/stats/): documentation describes saved sessions feeding period filters, heatmaps, subject splits and peak hours. These are appropriate quiet, automatic insights. Account/social/AI features are outside this brief.
- [Rize](https://rize.io/): the current site describes automatic background tracking for teams and shows timeline and project reports. Margin records only explicit study sessions; no app surveillance or productivity scores.
- [LearnHarness](https://github.com/amosblomqvist/learnharness): inspected the README and branding. Restrained geometric mark, confident type, clear prose and direct installation caveats. Margin uses its own mark and wording.
- [Last.fm](https://www.last.fm/features): historical listening as a personal record is the model for accumulated study history. A specific public yearly report was inaccessible; no claims about that report's exact interface.
- [Spotify Wrapped](https://newsroom.spotify.com/2025-12-03/2025-wrapped-user-experience/): use a short sequence of factual stories and ranked subjects, without personality labels or social features.
- [GitHub contribution graph](https://docs.github.com/en/account-and-profile/reference/profile-contributions-reference): a compact calendar makes long-term activity legible. Margin measures actual duration per local day.
- [Things](https://culturedcode.com/things/), [Raycast](https://www.raycast.com/), [Linear](https://linear.app/): reviewed official pages and Things imagery. Take restrained hierarchy, keyboard access, and compact secondary actions as design principles, without copying layouts.
- “Fable 5.2-style” is treated as the brief's quality direction. Search did not establish a primary interface design specification, so no invented design observations are used.

## Identity and composition

Margin refers to the time made for learning and the small notes that accumulate into a record. Original mark: three offset vertical strokes with a small terminal square, suggesting recorded time and a page margin. Single-color construction works at 16px.

Default: warm off-white, ink, muted sage; an editorial heading and large tabular timer. A narrow top navigation has Today, History, Insights. No sidebar. On wide windows, a compact overview and recent sessions sit beside the timer; narrow windows stack in reading order. The November UI revision removes slogans, decorative footer copy and explanatory empty-state paragraphs. All layouts use shared color, spacing, typography and focus tokens. Six full palettes, bundled Inter / DM Sans / IBM Plex Mono. No remote font requests.

## Architecture and policies

Tauri 2 + React + strict TypeScript + Tailwind. Rust owns one SQLite connection behind a mutex. Native commands perform transactional mutations; both windows reread the same snapshot after a native change event. A unique partial SQLite index prevents duplicate active sessions. A single-instance plugin prevents competing processes.

Study types are independent of subjects: Studying, Reviewing, Practice and Reading are editable defaults. Custom types can be created inline. Sessions store their type, History filters by it, Insights switches its distribution between subjects and types, and JSON/CSV preserve it. This implements the user’s follow-up request.

Sessions contain UTC millisecond timestamps and active intervals. Pause closes an interval; resume opens one. Timestamp differences include system sleep while running. Interrupted sessions remain intact and can be paused, finished, edited or discarded by the user. A recovery notice explains this policy. Clock reversal is rejected rather than saving negative time.

Analytics intersect active intervals with period, day and hour boundaries in the viewer's current time zone. Repeated DST hours are aggregated by hour label and retain actual elapsed duration. Original IANA recording zone is retained for context. Historical totals may move between calendar days when the viewer changes zones; elapsed totals do not change.

SQLite lives in the OS application-data directory. WAL, foreign keys, full synchronous writes, versioned transactional migration, parameterized SQL and post-mutation events. Subject deletion archives subjects referenced by history. Backup imports are validated before a transaction; a complete JSON safety backup is written before restore. Active sessions must be finished or discarded before restore. No data is sent over the network.

## Scope

Implement the eight phases in the supplied Project Brief.md. Optional tray and recap image export can be omitted to protect core reliability. Windows installers require a Windows runner; local macOS builds use ad-hoc signing without Developer ID or notarization unless credentials are available. Do not claim platform tests or publication that did not happen.

## November UI revision

Applied the installed [jakubkrehel interface skills](https://github.com/jakubkrehel/skills): better-interface, better-ui, better-typography, better-colors, better-accessibility, better-layout and better-writing. All existing screens share the revised tokens and control styles. Settings separates appearance, timer defaults, data and app details; infrequent detail stays behind native disclosure controls. The mini timer is always pinned and has no pin toggle, per the user’s request.

Timer modes are a first-class choice beside the subject/type workflow. Pomodoro offers explicit focus and break durations, a four-focus cycle and automatic break transition. Starting the next focus remains explicit to prevent unrecorded absence becoming study time. Countdown is a single bounded session. See [UI review](ui-review.md) for evidence and unverified boundaries.
