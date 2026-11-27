// Trusted controller. Candidate HTML is an untrusted document, never a Node module.
// Only bounded fictional functions cross the browser boundary; no real services.
import { chromium } from 'playwright';
import { readFileSync } from 'node:fs';
import { createHash } from 'node:crypto';
import assert from 'node:assert/strict';
const html=readFileSync('/work/board.html','utf8');
const ids=['I01-loading-empty','I02-create-confirmation','I03-edit-version','I04-invalid','I05-stale-recovery','I06-denied','I07-offline','I08-load-retry','I09-narrow-keyboard','I10-no-external-request'];
const seed=createHash('sha256').update(html).digest('hex').slice(0,10);
const synthetic=(prefix)=>prefix+' '+seed;
const clone=x=>structuredClone(x);
const gate=()=>{let release;const wait=new Promise(r=>{release=r});return {wait,release}};
const checks={};
let browser,networkAttempts=0;
const visible=(loc)=>loc.waitFor({state:'visible',timeout:2500});
const status=(p,re)=>visible(p.getByRole('status').filter({hasText:re}));
const alert=(p,re)=>visible(p.getByRole('alert').filter({hasText:re}));
const title=p=>p.getByRole('textbox',{name:'Reminder title',exact:true});
const save=p=>p.getByRole('button',{name:'Save reminder',exact:true});
const retry=p=>p.getByRole('button',{name:'Retry loading',exact:true});
const refresh=p=>p.getByRole('button',{name:'Refresh reminders',exact:true});
const record=(p,t)=>p.getByRole('list',{name:'Reminders',exact:true}).getByText(t,{exact:true});
const edit=(p,t)=>p.getByRole('button',{name:'Edit reminder '+t,exact:true});
const bounds=async (p,l)=>{await visible(l);const b=await l.boundingBox();const w=p.viewportSize().width;assert.ok(b&&b.x>=-1&&b.x+b.width<=w+1,'horizontal bounds')};
async function session({records=[],listMode='ok',saveMode='ok',holdList=false,holdSave=false,width=800}={}){
  const ctx=await browser.newContext({viewport:{width,height:760},serviceWorkers:'block',acceptDownloads:false,javaScriptEnabled:true});
  ctx.setDefaultTimeout(3000);
  const lg=gate(),sg=gate();
  let calls=[],listCalls=0,rows=clone(records),lm=listMode,sm=saveMode;
  const p=await ctx.newPage();
  await ctx.route('**/*',async route=>{networkAttempts++;await route.abort()});
  await p.exposeFunction('boardList',async()=>{
    listCalls++;
    if(holdList)await lg.wait;
    return {state:lm,records:lm==='ok'||lm==='offline'?clone(rows):[]};
  });
  await p.exposeFunction('boardSave',async input=>{
    const shape=input&&typeof input==='object'&&!Array.isArray(input)&&Object.keys(input).sort().join(',')==='expectedVersion,id,title'&&
      (input.id===null||(typeof input.id==='string'&&input.id.length<=80))&&typeof input.title==='string'&&input.title.length<=1024&&Number.isSafeInteger(input.expectedVersion);
    if(!shape){calls.push({invalidShape:true});return {state:'invalid'}}
    const i={id:input.id,title:input.title,expectedVersion:input.expectedVersion};calls.push(i);
    if(holdSave)await sg.wait;
    if(sm==='denied'||sm==='error'||sm==='offline')return {state:sm};
    if(sm==='stale'){
      const row=rows.find(r=>r.id===i.id);
      if(row){row.title=synthetic('Updated elsewhere');row.version++;return {state:'stale',record:clone(row)}}
      return {state:'stale'};
    }
    const t=i.title.trim(),row=rows.find(r=>r.id===i.id);
    if(!t||t.length>80||i.expectedVersion<0)return {state:'invalid'};
    if(i.id===null&&i.expectedVersion===0){const added={id:'new-'+seed,title:t,version:1};rows.push(added);return {state:'ok',record:clone(added)}}
    if(!row||row.version!==i.expectedVersion)return {state:'stale',record:row?clone(row):null};
    row.title=t;row.version++;return {state:'ok',record:clone(row)};
  });
  try{await p.setContent(html,{waitUntil:'domcontentloaded',timeout:5000})}
  catch(e){lg.release();sg.release();await ctx.close();throw e}
  return {p,ctx,calls,rows,listCalls:()=>listCalls,releaseList:()=>lg.release(),releaseSave:()=>sg.release(),setList:v=>lm=v,setSave:v=>sm=v,
    close:async()=>{lg.release();sg.release();await ctx.close()}};
}
const withPage=async(opts,fn)=>{let s;try{s=await session(opts);await fn(s)}finally{if(s)await s.close()}};
async function check(id,fn){try{await fn();checks[id]={pass:true}}catch(e){checks[id]={pass:false,reason:e?.name==='TimeoutError'?'required visible state or interaction timed out':'locked interaction assertion failed'}}}
const initial={id:'existing-'+seed,title:synthetic('Existing reminder'),version:2};
try{
 browser=await chromium.launch({headless:true,chromiumSandbox:true,args:['--disable-dev-shm-usage']});
 // Every test uses a new context and controller-side mock service.
 await check(ids[0],()=>withPage({holdList:true},async s=>{
   await visible(s.p.getByRole('heading',{name:'Reminder board',exact:true}));await status(s.p,/^Loading/i);
   assert.equal(s.listCalls(),1);assert.equal(s.calls.length,0);
   s.releaseList();await visible(s.p.getByText('No reminders',{exact:true}));await visible(title(s.p));
 }));
 await check(ids[1],()=>withPage({holdSave:true},async s=>{
   await visible(s.p.getByText('No reminders',{exact:true}));const t=synthetic('New reminder');
   await title(s.p).fill(' '+t+' ');await save(s.p).click();await status(s.p,/^Saving/i);
   assert.deepEqual(s.calls,[{id:null,title:t,expectedVersion:0}]);assert.equal(await record(s.p,t).count(),0);
   s.releaseSave();await status(s.p,/^Saved/i);await visible(record(s.p,t));
   assert.equal(s.rows[0].version,1);assert.equal(s.calls.length,1);
 }));
 await check(ids[2],()=>withPage({records:[initial]},async s=>{
   await visible(record(s.p,initial.title));await edit(s.p,initial.title).click();assert.equal(await title(s.p).inputValue(),initial.title);
   const t=synthetic('Edited reminder');await title(s.p).fill(t);await save(s.p).click();await status(s.p,/^Saved/i);await visible(record(s.p,t));
   assert.deepEqual(s.calls,[{id:initial.id,title:t,expectedVersion:2}]);assert.equal(s.rows[0].version,3);
 }));
 await check(ids[3],()=>withPage({},async s=>{
   await visible(s.p.getByText('No reminders',{exact:true}));
   await title(s.p).fill('   ');await save(s.p).click();await alert(s.p,/title|enter/i);assert.equal(s.calls.length,0);
   await title(s.p).fill('x'.repeat(81));
   if((await title(s.p).inputValue()).length<=80){
     assert.equal(await title(s.p).getAttribute('maxlength'),'80');await visible(s.p.getByText(/1.?80|80 characters/i).first());assert.equal(s.calls.length,0);
   }else{await save(s.p).click();await alert(s.p,/80|title/i);assert.equal(s.calls.length,0)}
 }));
 await check(ids[4],()=>withPage({records:[initial],saveMode:'stale'},async s=>{
   await visible(record(s.p,initial.title));await edit(s.p,initial.title).click();const t=synthetic('My pending edit');
   await title(s.p).fill(t);await save(s.p).click();await alert(s.p,/changed|stale|updated elsewhere/i);
   assert.equal(await title(s.p).inputValue(),t);assert.equal(s.calls.length,1);
   assert.equal(await s.p.getByRole('status').filter({hasText:/^Saved/i}).count(),0);
   s.setSave('ok');await refresh(s.p).click();await visible(record(s.p,synthetic('Updated elsewhere')));
   assert.equal(await title(s.p).inputValue(),t);await save(s.p).click();await status(s.p,/^Saved/i);await visible(record(s.p,t));
   assert.deepEqual(s.calls,[{id:initial.id,title:t,expectedVersion:2},{id:initial.id,title:t,expectedVersion:3}]);
 }));
 await check(ids[5],()=>withPage({saveMode:'denied'},async s=>{
   await visible(s.p.getByText('No reminders',{exact:true}));const t=synthetic('Unsaved draft');await title(s.p).fill(t);await save(s.p).click();
   await alert(s.p,/permission|denied/i);assert.equal(await title(s.p).inputValue(),t);
   assert.equal(await s.p.getByRole('status').filter({hasText:/^Saved/i}).count(),0);assert.equal(s.rows.length,0);assert.equal(s.calls.length,1);
 }));
 await check(ids[6],()=>withPage({records:[initial],listMode:'offline'},async s=>{
   await status(s.p,/^Offline/i);await visible(record(s.p,initial.title));assert.ok(await save(s.p).isDisabled());assert.equal(s.calls.length,0);
 }));
 await check(ids[7],()=>withPage({records:[initial],listMode:'error'},async s=>{
   await alert(s.p,/could not load|unable to load|load failed/i);assert.equal(s.listCalls(),1);s.setList('ok');await retry(s.p).click();
   await visible(record(s.p,initial.title));assert.equal(s.listCalls(),2);assert.equal(s.calls.length,0);
 }));
 await check(ids[8],()=>withPage({records:[{...initial,title:'L'.repeat(80)}],width:320},async s=>{
   const p=s.p;await visible(record(p,'L'.repeat(80)));await bounds(p,title(p));await bounds(p,save(p));await bounds(p,p.getByRole('status'));
   assert.ok(await p.evaluate(()=>document.documentElement.scrollWidth<=document.documentElement.clientWidth+1));
   let focused=false;for(let i=0;i<10&&!focused;i++){await p.keyboard.press('Tab');focused=await title(p).evaluate(el=>el===document.activeElement)}
   assert.ok(focused,'keyboard cannot reach title');const t=synthetic('Keyboard reminder');await p.keyboard.type(t);await p.keyboard.press('Enter');
   await status(p,/^Saved/i);await visible(record(p,t));assert.equal(s.calls.length,1);
 }));
 await check(ids[9],()=>assert.equal(networkAttempts,0));
 console.log(JSON.stringify({schema:1,checks,networkAttempts,browserSandbox:true}));
 if(!ids.every(id=>checks[id]?.pass===true))process.exitCode=1;
}catch(e){
 // Launch errors are controller-owned. Never emit candidate-influenced raw messages.
 const m=browser?'':String(e?.message??'');
 const failure=browser?'controller-failure':/No usable sandbox|namespace|Operation not permitted|zygote/i.test(m)?'sandbox-unavailable':/read-only|permission denied|EACCES|crashpad/i.test(m)?'runtime-filesystem':/executable|missing dependencies|not found/i.test(m)?'browser-runtime-unavailable':'browser-launch-failure';
 console.log(JSON.stringify({schema:1,infrastructureFailure:true,browserSandboxRequested:true,failure}));process.exitCode=2;
}finally{if(browser)await browser.close()}
