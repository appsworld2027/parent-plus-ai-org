#!/usr/bin/env node
import {mkdirSync,writeFileSync,existsSync} from 'node:fs';
import {join,resolve} from 'node:path';
const target=resolve(process.argv[2]||'.'); const apply=process.argv.includes('--apply');
const files={'.ai-org/manifest.json':JSON.stringify({organization:'appsworld',adapterVersion:'1',source:'appsworld2027/parent-plus-ai-org',protectedActions:['production','destructive','paid','credentials','legal-privacy']},null,2)+'\n','.ai-org/README.md':'# AppsWorld AI Organization adapter\n\nThis product repository inherits the product-agnostic AppsWorld AI Organization. Run the organization workflows before feature work.\n'};
if(!apply){console.log('DRY RUN for',target);for(const f of Object.keys(files))console.log('would create',join(target,f));process.exit(0);}
for(const [f,c] of Object.entries(files)){const p=join(target,f);mkdirSync(join(p,'..'),{recursive:true});if(!existsSync(p))writeFileSync(p,c);}
console.log('Bootstrapped AppsWorld adapter at',target);
