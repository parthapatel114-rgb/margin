<p align="center"><img src="assets/app-icon.svg" alt="Margin logo" width="76"></p>
<h1 align="center">Margin</h1>
<p align="center">A simple timer. A meaningful history.</p>

Margin is a small desktop app for keeping track of study time and seeing where the hours go. It runs locally, saves your sessions as you study, and turns your history into a useful record. There are no accounts or cloud services.

Choose a subject and a study type, then start. Reviewing calculus and practicing calculus belong to the same subject, but tell different stories about how you spend your time. You can use the built-in study types or add your own.

<p align="center"><img src="docs/screenshots/today.png" alt="Margin’s native desktop timer" width="880"></p>

## What it does

- Stopwatch with pause, resume, restart recovery and optional notes.
- Subjects and study types you can create inline, rename, color and archive. Unused choices can be deleted.
- A separate native mini timer, optional always-on-top, and fullscreen focus.
- Editable session history, manual entries, subject and study-type filters.
- Period totals, subject/type distribution, hourly activity and a study calendar.
- Monthly and yearly Study Wrapped recaps based on recorded sessions.
- Six appearance presets and three fonts, all available offline.
- JSON backups, CSV history and validated restore with a safety backup.

<p align="center"><img src="docs/screenshots/mini.png" alt="Margin’s native mini timer" width="348"></p>

## Install

The local release folder contains an ad-hoc-signed Apple Silicon macOS application and disk image. Open the disk image and drag Margin to Applications. It runs without Node.js, Rust or a separate database installation. macOS 12 or newer is the configured minimum; the native build has been exercised on Apple Silicon macOS.

macOS builds use an ad-hoc signature for local bundle integrity. They are not Developer ID signed or notarized. macOS may block them until you explicitly approve the app in Privacy & Security. Do not treat them as signed releases.

Windows x64 packaging is configured for NSIS and MSI. The Windows workflow must run on Windows before a Windows installer can be called verified. Intel macOS builds are configured in the release workflow but have not been run locally. See [verification](docs/verification.md) for the exact tested scope.

## Using Margin

Type a subject beside the timer, choose a study type, and press Start. New names are created inline. Finish saves with one click; adding a note is optional. Use History to add forgotten time, correct a session or remove it.

The small window icon opens the mini timer. Both windows control the same session. Closing the mini window leaves the timer alone. Closing the main window exits the app; an unfinished session is restored next time.

Running time includes computer sleep and time while Margin is closed. Paused time does not count. If you forget to stop a session, finish it and edit its start or study minutes in History. Changing a session’s time replaces its pause intervals with a continuous manual entry; note-only edits preserve all intervals.

Space pauses or resumes when you are not typing or using a control. Command/Ctrl K focuses the subject, Command/Ctrl M opens the mini timer, Command/Ctrl 1 returns to Today, and Escape leaves fullscreen.

## Insights

Choose Week, Month, Year or All time. Step through earlier periods to explore your record. Switch Time distribution between Subjects and Study types. Hover chart bars for durations; select a calendar day for its subject breakdown. Wrapped becomes available after at least three sessions across three days in the selected month or year.

Insights use finished sessions. Today also includes the current timer. Active intervals are split at day and hour boundaries, so a session across midnight or a pause contributes only its actual time to each bucket. Calendar views use the computer’s current time zone; changing zones can move history between days without changing elapsed totals. Original recording zones are preserved.

<p align="center"><img src="docs/screenshots/insights.png" alt="Study-type distribution and historical insights in the native app" width="880"></p>

Screenshots show the actual macOS application using an isolated UI-verification database. Test sessions are not included in an installed app or the source repository.

## Your data

The SQLite database is stored in the operating system’s application-data directory under `app.margin.study`, outside the installation and source folders. On macOS this is `~/Library/Application Support/app.margin.study/`; on Windows it is normally `%APPDATA%\app.margin.study\`. Updates run versioned migrations without replacing your database.

Settings → Data & backups exports all records as JSON, including any unfinished timer. CSV contains finished sessions with subjects, study types, UTC start/end times, active and paused seconds, notes and recording zones. Spreadsheet-formula prefixes in text are escaped in CSV.

Restoring a JSON backup replaces current data after validation and confirmation. First finish or discard any active timer. Margin writes a complete safety backup before restoring, then applies the replacement in one SQLite transaction. Open safety backups shows the local folder. Backups are not uploaded anywhere.

Local storage survives clearing browser data. It does not protect against a failed or lost computer. Export a backup to a place you keep safe.

## Development

Install Node.js 24 or later, stable Rust (at least 1.90), and [Tauri’s platform prerequisites](https://v2.tauri.app/start/prerequisites/). macOS needs Xcode Command Line Tools. Windows needs the Microsoft C++ build tools and WebView2.

```sh
npm ci
npm run dev
```

This opens a native Tauri application. Vite is used only to serve the embedded UI during development; there is no hosted website or standalone browser database.

To keep test records separate, set `MARGIN_TEST_DATA_DIR` to a scratch directory when running a debug build. Release builds ignore that variable. The development scripts also recognize a project-local Rust toolchain under `work/toolchain` when present; a normal checkout simply uses Rust on PATH.

```sh
npm run lint
npm run typecheck
npm run test:zones
npm run test:rust
npm run check:rust
npm run build
npm run desktop:build
```

Native bundles are written to `src-tauri/target/release/bundle/`. Build on Windows for Windows installers and on macOS for macOS bundles. GitHub Actions checks both platforms and prepares draft release assets when a `v*` tag is pushed. Signing credentials are not configured. See [release notes](docs/releases.md) for publication commands and platform limits.

## Source

`src/components/` contains the native window UI. `src/lib/analytics.ts` is the shared analytics engine. `src-tauri/src/` owns session mutations, SQLite and native dialogs. `src-tauri/migrations/` contains transactional schema upgrades. [Architecture](docs/architecture.md) explains the boundaries; [design notes](docs/design.md) record the research and product decisions.

Contributions are welcome. Read [CONTRIBUTING.md](CONTRIBUTING.md) and keep changes focused on recording study time and making the history useful.

## License

MIT. The bundled Inter, DM Sans and IBM Plex Mono fonts use the SIL Open Font License; copies are in `assets/licenses/`. Other dependency licenses remain with their respective packages.
