#!/usr/bin/env node
import {spawnSync} from 'node:child_process';
import {mkdirSync, writeFileSync} from 'node:fs';
import {dirname} from 'node:path';

const command = process.argv.slice(2).join(' ');
const retries = Number(process.env.QUALITY_RETRIES || 2);
if (!command) { console.error('Usage: node scripts/quality-loop.mjs "command"'); process.exit(2); }
const attempts=[];
for (let i=1;i<=retries+1;i++) {
  const started=new Date().toISOString();
  const r=spawnSync(command,{shell:true,stdio:'inherit'});
  attempts.push({attempt:i,started,exitCode:r.status});
  if (r.status===0) { mkdirSync('evidence',{recursive:true}); writeFileSync('evidence/quality-loop.json',JSON.stringify({command,retries,success:true,attempts},null,2)+'\n'); process.exit(0); }
}
mkdirSync('evidence',{recursive:true}); writeFileSync('evidence/quality-loop.json',JSON.stringify({command,retries,success:false,attempts,nextAction:'Create an issue with this evidence; do not claim completion.'},null,2)+'\n');
process.exit(1);
