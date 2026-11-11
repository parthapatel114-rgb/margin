# Builds and publication

## Local build

`npm run desktop:build` produces an Apple Silicon macOS app bundle and DMG on this machine. The configured minimum macOS version is 12.0. The deliverable is ad-hoc signed, without Developer ID signing or notarization; users may need to explicitly approve it in macOS Privacy & Security. No Developer ID signing or notarization is claimed.

`releases/` retains the current app, disk image and checksums. The GitHub release also includes an application ZIP and a complete source ZIP. Development tools and test data are excluded from the source archive. `Margin.app` can be copied to Applications without installing Node.js, Rust or SQLite separately.

Windows x64 NSIS/MSI and Intel macOS release jobs are configured. They have not run locally and must pass on the appropriate runners before those installers can be treated as verified. GitHub Actions creates a draft prerelease, so a maintainer can inspect the outputs before publishing them. This project has no app-store publishing setup.

## GitHub status

Published releases are available at [GitHub Releases](https://github.com/parthapatel114-rgb/margin/releases). Version 0.4.0 includes the locally verified Apple Silicon macOS DMG and app ZIP, a source archive and SHA-256 checksums. The installer is ad-hoc signed, not Developer ID signed or notarized. Windows and Intel macOS binaries are not included in this release.

Local databases, exports, build output, tools and signing credentials are excluded by .gitignore. Source archives come from the release commit, without local tools or study data.

The tag workflow can prepare draft builds for other platforms; inspect their checks and artifacts before publishing them. For signed releases, configure platform signing credentials using [Tauri’s distribution guides](https://v2.tauri.app/distribute/) and update the release workflow; never commit certificates, passwords or API keys.

## 0.2.0

Coordinated interface redesign; Stopwatch, Pomodoro and Countdown; persisted break/cycle recovery; always-pinned mini timer. Schema 3 upgrades existing session records. Version 1/2 JSON backups remain supported. The release contains no verification records. Older application archives are retained in `releases/`.

## 0.3.0

Compact study workspace and first-session choices; optional intentions and daily targets; repeat preparation; searchable/sortable History; shared themed date-range picker; filtered statistics with chart drilldown, subject-by-study-type matrix, monthly activity calendar and yearly overview. Schema 4 and backup version 4 preserve versions 1–3. Original appearance preferences, history and native timer behavior are retained. The full selected improvement list and research are in docs/improvement-plan.md.

## 0.4.0

A local visual and recovery revision: study-ledger typography and layout; three Carbon and three Paper palettes; bundled Source Serif 4 / Source Sans 3; clearer inline validation, protected drafts, and safe refresh/retry actions. No timer mode, history/statistics function, backup format or database schema is removed or changed. macOS menu Quit uses the normal close-request path to protect unsaved input. Native builds now invalidate embedded UI assets after frontend changes. Verification is recorded in verification.md. The 0.4.0 GitHub release contains the verified Apple Silicon build; other platform binaries remain outside the verified release scope.
