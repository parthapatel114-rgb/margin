import { spawnSync } from 'node:child_process';
import { existsSync } from 'node:fs';
import { resolve, delimiter } from 'node:path';
const env = { ...process.env };
const local = resolve('work/toolchain');
if (existsSync(`${local}/cargo/bin/cargo`)) {
  env.CARGO_HOME = `${local}/cargo`; env.RUSTUP_HOME = `${local}/rustup`;
  env.PATH = `${local}/cargo/bin${delimiter}${env.PATH}`;
}
const cli = resolve('node_modules/@tauri-apps/cli/tauri.js');
const result = spawnSync(process.execPath, [cli, ...process.argv.slice(2)], { stdio: 'inherit', env });
process.exit(result.status ?? 1);
