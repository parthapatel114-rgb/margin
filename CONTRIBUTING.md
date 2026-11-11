# Contributing

Margin is a small local study tracker. Keep changes focused on making recording time easier or the history more useful.

Read `docs/design.md` for the product decisions and `docs/architecture.md` for persistence and timer policies. Install Node.js 24+ and stable Rust, plus the operating-system prerequisites linked in the README. Run `npm ci` and `npm run dev`.

Before opening a pull request:

```
npm run lint
npm run typecheck
npm run test:zones
npm run test:rust
npm run check:rust
npm run build
```

Format TypeScript with `npm run format` and Rust with `npm run format:rust`. Exercise any affected native windows on your platform. Say which operating systems you actually tested.

Never commit a study database, personal backup, credential, local file path or generated installer. Test fixtures belong in an explicitly isolated development directory. Do not add telemetry or network dependencies to the runtime. Database changes need a new transactional migration and a test that preserves existing records.
