# Builds and publication

## Local build

`npm run desktop:build` produces an Apple Silicon macOS app bundle and DMG on this machine. The configured minimum macOS version is 12.0. The deliverable is ad-hoc signed, without Developer ID signing or notarization; users may need to explicitly approve it in macOS Privacy & Security. No Developer ID signing or notarization is claimed.

`releases/` contains the disk image, an application ZIP, a complete source ZIP and checksums. Development tools and test data are excluded from the source archive. `Margin.app` can be copied to Applications without installing Node.js, Rust or SQLite separately.

Windows x64 NSIS/MSI and Intel macOS release jobs are configured. They have not run locally and must pass on the appropriate runners before those installers can be treated as verified. GitHub Actions creates a draft prerelease, so a maintainer can inspect the outputs before publishing them. This project has no app-store publishing setup.

## GitHub status

GitHub CLI was checked during delivery and had no authenticated hosts. No remote repository or release was created. All source, documentation, icons, migrations, tests and workflow files are preserved locally.

From the source repository, after authenticating with GitHub CLI:

```sh
gh auth login
gh repo create margin-study --public --source=. --remote=origin --push
```

Inspect the first Check and package workflow. Once it passes, create a version tag to prepare draft installers:

```sh
git tag v0.2.0
git push origin v0.2.0
```

Review the draft release and its platform artifacts before publishing it. For signed releases, configure platform signing credentials using [Tauri’s distribution guides](https://v2.tauri.app/distribute/) and update the release workflow; never commit certificates, passwords or API keys.

## 0.2.0

Coordinated interface redesign; Stopwatch, Pomodoro and Countdown; persisted break/cycle recovery; always-pinned mini timer. Schema 3 upgrades existing session records. Version 1/2 JSON backups remain supported. The release contains no verification records. Older application archives are retained in `releases/`.
