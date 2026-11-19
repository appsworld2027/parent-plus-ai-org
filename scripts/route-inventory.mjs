#!/usr/bin/env node
import {readFileSync,writeFileSync,mkdirSync} from 'node:fs';
const input=process.env.INVENTORY_PATH||'evidence/feature-inventory.json';
const output=process.env.ROUTING_PATH||'evidence/inventory-routing.json';
const data=JSON.parse(readFileSync(input,'utf8'));
const routes={database:[],integration:[],coding:[],qa:[],pm:[]};
for(const item of data.files||[]){const p=item.file.toLowerCase();let role='coding';if(/supabase|sql|schema|migration|database/.test(p))role='database';else if(/api|integration|webhook|service|auth/.test(p))role='integration';else if(/test|qa|validation|security/.test(p))role='qa';else if(/prd|product|roadmap|requirement|founder/.test(p))role='pm';routes[role].push(item);}
mkdirSync('evidence',{recursive:true});writeFileSync(output,JSON.stringify({generatedAt:new Date().toISOString(),routes},null,2)+'\n');
console.log(`Routed ${Object.values(routes).reduce((n,v)=>n+v.length,0)} signals:`,Object.entries(routes).map(([k,v])=>`${k}=${v.length}`).join(', '));
