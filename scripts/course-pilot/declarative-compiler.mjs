// Bounded compiler: validates operations without inventing or inserting substantive checks.
import {COURSE_IDS as ids,assertCourseCoverage} from './declarative-coverage.mjs';
export const buttons=['Courses','Create course','Save draft','Add stage','Add objective to stage 1','Add objective to stage 2','Edit course','Publish version','Confirm publish','View history','Keep editing','Discard and leave'];
export const tabs=['Today','Schedule','Feedback','Students','Fees'];
export const labels=['Course title','Stage 1 title','Stage 1 objective 1','Stage 1 objective 2','Stage 2 title','Stage 2 objective 1'];
const esc=x=>JSON.stringify(x),txt=x=>typeof x==='string'&&x.length>0&&x.length<=200;
const exact=(r,n)=>'page.getByRole('+esc(r)+', { name: '+esc(n)+', exact: true })';
const text=x=>'page.getByText('+esc(x)+', { exact: true })';
const field=x=>'page.getByLabel('+esc(x)+', { exact: true })';
export function compileCourseOperation(op){
 if(!Array.isArray(op)||typeof op[0]!=='string')throw Error('Bad test operation');
 const [k,v,w]=op, len=op.length;
 if(k==='B'&&v==='Add objective'&&len===3&&[0,1].includes(w))return 'await '+exact('button','Add objective to stage '+(w+1))+'.click();';
 if(k==='B'&&buttons.includes(v)&&len===2)return 'await '+exact('button',v)+'.click();';
 if(k==='T'&&tabs.includes(v)&&len===2)return 'await '+exact('tab',v)+'.click();';
 if(k==='F'&&labels.includes(v)&&typeof w==='string'&&w.length<=200&&len===3)return 'await '+field(v)+'.fill('+esc(w)+');';
 if(k==='V'&&labels.includes(v)&&typeof w==='string'&&w.length<=200&&len===3)return 'await expect('+field(v)+').toHaveValue('+esc(w)+');';
 if(k==='I'&&labels.includes(v)&&len===2)return 'await expect('+field(v)+').toBeVisible();';
 if(k==='H'&&txt(v)&&len===2)return 'await expect('+exact('heading',v)+').toBeVisible();';
 if(['X','NX'].includes(k)&&txt(v)&&len===2)return 'await expect('+text(v)+')'+(k==='NX'?'.not':'')+'.toBeVisible();';
 if(['VB','NB'].includes(k)&&buttons.includes(v)&&len===2)return 'await expect('+exact('button',v)+')'+(k==='NB'?'.not':'')+'.toBeVisible();';
 if(k==='VT'&&tabs.includes(v)&&len===2)return 'await expect('+exact('tab',v)+').toBeVisible();';
 if(k==='N'&&txt(v)&&Number.isSafeInteger(w)&&w>=0&&w<=10&&len===3)return 'await expect('+text(v)+').toHaveCount('+w+');';
 if(k==='O'&&Array.isArray(v)&&v.length>=2&&v.length<=6&&v.every(x=>labels.includes(x))&&len===2)return '{ const order=await page.evaluate(()=>Array.from(document.querySelectorAll("input, textarea")).map(el=>el.getAttribute("aria-label")||el.id)); const indices='+esc(v)+'.map(name=>order.indexOf(name)); for(let i=0;i<indices.length;i++){ expect(indices[i]).toBeGreaterThanOrEqual(0); if(i>0) expect(indices[i-1]).toBeLessThan(indices[i]); } }';
 if(k==='NET'&&len===1)return '{ const calls=await page.evaluate(()=>window.__coachFixture.calls); expect(calls.filter(c=>/course|curriculum/i.test(c))).toHaveLength(0); expect(networkRequests).toHaveLength(0); }';
 throw Error('Invalid or unapproved test operation: '+JSON.stringify(op).slice(0,200));
}
const header="import { test, expect } from '@playwright/test';\nimport { backend, login } from '../support/backend';\n";
const pre='    const networkRequests:string[]=[];\n    page.on("request", req=>{if(/course|curriculum/i.test(req.url()))networkRequests.push(req.url());});\n    await backend(page,{academy:true}); await login(page);\n';
function render(id,a){
 const ops=a.cases[id];
 if(!Array.isArray(ops)||ops.length<3||ops.length>46)throw Error('Wrong operation count '+id);
 const body=ops.map(compileCourseOperation).map(s=>'    '+s).join('\n');
 const isGuard=id.startsWith('GUARD');
 if((isGuard||id.endsWith('006'))&&!ops.some(o=>o[0]==='NET'))throw Error('Required real network proof absent '+id);
 return 'test('+esc(id)+', async ({page})=>{\n'+pre+(isGuard?'':'    await expect(page.getByRole("button",{name:"Courses",exact:true})).toBeVisible();\n')+body+'\n});\n';
}
export function compileCourseCases(a){ assertCourseCoverage(a); return {spec:header+ids.slice(0,6).map(id=>render(id,a)).join('\n'),guard:header+render(ids[6],a)}; }
