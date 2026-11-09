import {spawnSync} from 'node:child_process';
const run=args=>{const r=spawnSync(process.execPath,['node_modules/wrangler/bin/wrangler.js',...args],{stdio:'inherit',env:{...process.env,CI:'true'}});if(r.error)throw r.error;if(r.status!==0)process.exit(r.status||1);};
// Database migrations run before serving requests; repeated deploys preserve data.
run(['d1','migrations','apply','DB','--remote','--config','wrangler.json']);
// Vite writes .wrangler/deploy/config.json pointing to its generated output config.
run(['deploy']);
