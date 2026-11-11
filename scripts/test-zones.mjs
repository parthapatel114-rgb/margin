import { spawnSync } from 'node:child_process';
import { resolve } from 'node:path';
for (const TZ of ['America/New_York','UTC','Asia/Kathmandu','Australia/Lord_Howe']) {
  console.log(`Analytics time zone: ${TZ}`);
  const result=spawnSync(process.execPath,[resolve('node_modules/vitest/vitest.mjs'),'run'],{stdio:'inherit',env:{...process.env,TZ}});
  if(result.status!==0)process.exit(result.status??1);
}
