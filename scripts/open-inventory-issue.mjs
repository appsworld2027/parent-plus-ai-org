#!/usr/bin/env node
import {readFileSync} from 'node:fs';
const repo=process.env.TARGET_REPOSITORY || 'appsworld2027/Parent-plus-';
const token=process.env.GITHUB_TOKEN;
if(!token){console.log('No GITHUB_TOKEN; inventory remains artifact-only.');process.exit(0);}
const inv=JSON.parse(readFileSync(process.env.INVENTORY_PATH || 'evidence/feature-inventory.json','utf8'));
const signals=inv.files || [];
if(!signals.length){console.log('No actionable inventory signals.');process.exit(0);}
const [owner,name]=repo.split('/');
const headers={Authorization:`Bearer ${token}`,Accept:'application/vnd.github+json','Content-Type':'application/json'};
const marker='<!-- autonomous-inventory -->';
const list=await fetch(`https://api.github.com/repos/${owner}/${name}/issues?state=open&per_page=100`,{headers}).then(r=>r.json());
if(list.some(i=>i.body?.includes(marker))){console.log('Existing autonomous inventory issue found; no duplicate created.');process.exit(0);}
const body=`${marker}\n\nAutomated Parent Plus inventory detected ${signals.length} file(s) with feature, requirement, acceptance, TODO, FIXME or BUG signals.\n\nEvidence is attached to the AI-organization workflow artifact. Review and classify before implementation.\n\nFiles:\n${signals.slice(0,100).map(x=>`- ${x.file} (${x.signals} signal(s))`).join('\n')}`;
const res=await fetch(`https://api.github.com/repos/${owner}/${name}/issues`,{method:'POST',headers,body:JSON.stringify({title:'[AI inventory] Review newly detected product and quality signals',body,labels:['ai-inventory']})});
if(!res.ok){console.error(await res.text());process.exit(1);} console.log('Created inventory issue:',(await res.json()).html_url);
