import { spawnSync } from 'node:child_process';
import { existsSync } from 'node:fs';
import { resolve, delimiter } from 'node:path';
const env={...process.env}; const local=resolve('work/toolchain');
if(existsSync(`${local}/cargo/bin/cargo`)){env.CARGO_HOME=`${local}/cargo`;env.RUSTUP_HOME=`${local}/rustup`;env.PATH=`${local}/cargo/bin${delimiter}${env.PATH}`;}
const result=spawnSync('cargo',['fmt','--manifest-path','src-tauri/Cargo.toml',...process.argv.slice(2)],{stdio:'inherit',env});process.exit(result.status??1);
