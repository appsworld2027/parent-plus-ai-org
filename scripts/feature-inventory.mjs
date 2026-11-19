#!/usr/bin/env node
import {readdirSync,readFileSync,writeFileSync,mkdirSync } from 'node:fs';
import {join,relative} from 'node:path';
const roots=process.argv.slice(2).length?process.argv.slice(2):['.']; const rows=[];
function walk(dir){for(const name of readdirSync(dir,{withFileTypes:true})){if(['.git','node_modules'].includes(name.name))continue;const p=join(dir,name.name);if(name.isDirectory())walk(p);else if(/\.(md|tsx?|jsx?|sql|json)$/.test(name.name)){const text=readFileSync(p,'utf8');const hits=(text.match(/##?\s+(Feature|Requirement|User journey|Acceptance|TODO|FIXME|BUG)\b/gi)||[]).length;if(hits)rows.push({file:relative('.',p),signals:hits});}}}
for(const root of roots)walk(root); mkdirSync('evidence',{recursive:true}); writeFileSync('evidence/feature-inventory.json',JSON.stringify({generatedAt:new Date().toISOString(),files:rows},null,2)+'\n'); console.log(`Indexed ${rows.length} feature-signal files.`);
