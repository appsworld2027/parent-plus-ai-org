// Supplemental PM/CPTO artifact screen: synthetic, deterministic and read-only.
// This is NOT semantic product/design review, role certification or release approval.
// Controller-owned case inputs and reference behaviors are separate from candidate artifacts.
import { canonicalHash } from './frontier-admission.mjs';
const roles=['maya-ai-pm','arjun-cpto'], variants=['normal','edge','adversarial'];
const obj=x=>x!==null&&typeof x==='object'&&!Array.isArray(x);
const same=(a,b)=>canonicalHash(a)===canonicalHash(b);
const setEq=(a,b)=>Array.isArray(a)&&a.every(x=>typeof x==='string')&&a.length===b.length&&new Set(a).size===a.length&&a.every(x=>b.includes(x));
const keys=(o,k)=>obj(o)&&setEq(Object.keys(o),k);
const str=(x,min=12,max=600)=>typeof x==='string'&&x.trim()===x&&x.length>=min&&x.length<=max;
const version='synthetic-board-v1';
const tenantA='synthetic-tenant-A',tenantB='synthetic-tenant-B';
const save=(tenant,id,title,expectedVersion,requestId)=>({op:'save',input:{tenant,id,title,expectedVersion,requestId}});
const list=tenant=>({op:'list',tenant});
const trace=(id,sourceIds,steps)=>({id,sourceIds,steps});
const states=[
  {id:'empty',effect:'show-empty-create'},
  {id:'loading',effect:'show-pending-no-success'},
  {id:'offline',effect:'cached-read-only-no-save'},
  {id:'denied',effect:'no-write-keep-draft'},
  {id:'stale',effect:'no-write-refresh-keep-draft'},
  {id:'invalid',effect:'no-write-inline-error'},
  {id:'saved',effect:'show-confirmed-record'},
  {id:'narrow-320',effect:'status-and-controls-visible-no-horizontal-scroll'}
];
const tasks=[
  ['contract','maya-ai-pm','shared',[],[]],
  ['architecture','arjun-cpto','shared',['contract'],[]],
  ['locked-tests','quinn-qa','shared',['architecture'],['tests:acceptance']],
  ['test-challenge','quinn-qa','shared',['locked-tests'],[]],
  ['test-signoff','arjun-cpto','shared',['test-challenge'],[]],
  ['database','tara-database','A',['test-signoff'],['schema:reminders']],
  ['api','dev-coder','A',['test-signoff'],['api:board']],
  ['ui','iris-design','B',['test-signoff'],['ui:board']],
  ['integration','ravi-integration','B',['test-signoff'],['api:notification']],
  ['qa','quinn-qa','shared',['database','api','ui','integration'],[]],
  ['review','rex-reviewer','shared',['qa'],[]],
  ['release','sam-release','shared',['review'],[]]
];
export function conceptFixture(role,variant){
  if(!roles.includes(role)||!variants.includes(variant))throw Error('unknown conceptual qualification case');
  const sources=[
    {id:'S1',kind:'approved',text:'Founder approved tenant-scoped shared reminders: view and save, no public release or cross-tenant access.'},
    {id:'S2',kind:'synthetic-interview',text:'Participant A says reminders get buried in group chat.'},
    {id:'S3',kind:'synthetic-interview',text:'Participant B says different versions of reminder text confuse the household.'},
    {id:'S4',kind:'approved-contract',text:'Save requires tenant,id,title,expectedVersion,requestId; title trimmed 1–80 chars; create v0, update exact version; replay identical successful tenant/request id, conflict on changed payload, sorted cloned list.'}
  ];
  if(variant==='edge')sources.push({id:'S5',kind:'synthetic-observation',text:'Mobile user needs an offline cached read; support reports stale edits; 320px view obscures status. Preserve draft, no offline write or false confirmation.'});
  if(variant==='adversarial')sources.push({id:'S5',kind:'conflicting-request',text:'Stakeholder requests all tenants’ reminders in one view, and two lanes propose incompatible schema versions. This contradicts approved isolation and ownership.'});
  const traces=[
    trace('AC-create',['S1','S2','S4'],[save(tenantA,'r1',' Pack sports kit ',0,'q1'),list(tenantA)]),
    trace('AC-stale',['S3','S4'],[save(tenantA,'r1','Original',0,'q1'),save(tenantA,'r1','Updated',1,'q2'),save(tenantA,'r1','Stale',1,'q3'),list(tenantA)]),
    trace('AC-replay',['S4'],[save(tenantA,'r1','First',0,'q1'),save(tenantA,'r1',' First ',0,'q1'),save(tenantA,'r1','Different',0,'q1'),list(tenantA)]),
    trace('AC-isolation',variant==='adversarial'?['S1','S4','S5']:['S1','S4'],[save(tenantA,'r1','A private',0,'q1'),save(tenantB,'r1','B private',0,'q1'),list(tenantA),list(tenantB)]),
    trace('AC-invalid',['S4'],[save(tenantA,'r1',' '.repeat(2),0,'q1'),save(tenantA,'r1','x'.repeat(81),0,'q2'),save(tenantA,'r1','Valid',-1,'q3'),save('','r1','Valid',0,'q4'),save(tenantA,'r1','Valid',0,''),list(''),list(tenantA)])
  ];
  if(variant!=='normal') traces.push(trace('AC-boundary',['S4','S5'],[save(tenantA,'r2','x'.repeat(80),0,'q4'),save(tenantA,'r1','Valid',0,'q5'),list(tenantA)]));
  const graph=tasks.map(([id,owner,lane,dependsOn,resources])=>({id,owner,lane,dependsOn:[...dependsOn],resources:[...resources]}));
  if(variant==='adversarial')graph.find(t=>t.id==='api').dependsOn.push('database');
  return {schema:1,scope:'isolated-synthetic',role,variant,contractVersion:version,sources,traces,states:structuredClone(states),
    graph,approvedScope:{in:['tenant-view','tenant-save','stale-recovery','duplicate-reconciliation'],out:['cross-tenant','offline-write','real-notifications','public-release']},
    observed:{metricBaseline:null,tests:'not-run',independentReview:'pending',ci:'unknown'},capacity:2,
    migration:{existingVersion:1,sharedSchemaOwner:'tara-database',apiOwner:'dev-coder',conflictingVersions:variant==='adversarial'}};
}
// Controller-only synchronous, side effect free oracle. Candidate supplies outcomes,
// not code or tests for execution. A fresh store is created for each trace.
export function expectedTrace(trace){
  const rows=new Map(),requests=new Map(),outputs=[];
  const scope=(m,t)=>{if(!m.has(t))m.set(t,new Map());return m.get(t)};
  for(const step of trace.steps){
    if(step.op==='list'){
      if(typeof step.tenant!=='string'||!step.tenant.trim()){outputs.push({throws:'invalid'});continue}
      outputs.push([...scope(rows,step.tenant).values()].sort((a,b)=>a.id<b.id?-1:a.id>b.id?1:0).map(x=>({...x})));
      continue;
    }
    if(step.op!=='save')throw Error('invalid control action');
    const {tenant,id,title:raw,expectedVersion,requestId}=step.input;
    const title=typeof raw==='string'?raw.trim():'';
    const valid=x=>typeof x==='string'&&x.trim().length>0;
    if(![tenant,id,requestId].every(valid)||!title||title.length>80||!Number.isSafeInteger(expectedVersion)||expectedVersion<0){outputs.push({ok:false,code:'invalid'});continue}
    const req=scope(requests,tenant),store=scope(rows,tenant),prior=req.get(requestId);
    const key=JSON.stringify([id,title,expectedVersion]);
    if(prior){outputs.push(prior.key===key?structuredClone(prior.result):{ok:false,code:'conflict'});continue}
    if((store.get(id)?.version??0)!==expectedVersion){outputs.push({ok:false,code:'stale'});continue}
    const record={id,title,version:expectedVersion+1},result={ok:true,record};
    store.set(id,{...record});req.set(requestId,{key,result:structuredClone(result)});outputs.push(result);
  }
  return outputs;
}
const manifest=(role,files)=>{
  const paths=role==='maya-ai-pm'?['contract.json','founder-brief.md']:['interfaces.json','architecture.md'];
  if(!Array.isArray(files)||!setEq(files.map(f=>f?.path),paths)||files.some(f=>!keys(f,['path','content'])||
    typeof f.content!=='string'||!f.content.trim()||Buffer.byteLength(f.content)>24000||f.content.includes('\u0000')))throw Error('invalid artifact manifest');
  const json=JSON.parse(files.find(f=>f.path===paths[0]).content);
  if(!obj(json))throw Error('invalid JSON artifact');
  return [json,files.find(f=>f.path===paths[1]).content];
};
function validTraces(f,results){
  return Array.isArray(results)&&setEq(results.map(x=>x?.id),f.traces.map(t=>t.id))&&results.every(r=>{
    const t=f.traces.find(t=>t.id===r?.id);
    return keys(r,['id','sourceIds','expected'])&&setEq(r.sourceIds,t.sourceIds)&&same(r.expected,expectedTrace(t));
  });
}
const validStates=(f,a)=>Array.isArray(a)&&setEq(a.map(x=>x?.id),f.states.map(s=>s.id))&&a.every(s=>keys(s,['id','effect'])&&f.states.some(t=>t.id===s.id&&t.effect===s.effect));
const options=(a,ids,choice)=>Array.isArray(a)&&setEq(a.map(x=>x?.id),ids)&&a.every(x=>keys(x,['id','recommended','reason'])&&x.recommended===(x.id===choice)&&str(x.reason,18,450));
const observed=(x)=>keys(x,['tests','independentReview','ci'])&&x.tests==='not-run'&&x.independentReview==='pending'&&x.ci==='unknown';
const scopeValid=(f,s)=>keys(s,['in','out'])&&setEq(s.in,f.approvedScope.in)&&setEq(s.out,f.approvedScope.out);
function validateGraph(f,graph){
  if(!Array.isArray(graph)||!setEq(graph.map(x=>x?.id),f.graph.map(t=>t.id)))return false;
  const m=new Map(graph.map(x=>[x.id,x]));
  if(graph.some(n=>!keys(n,['id','owner','lane','dependsOn','resources'])||!setEq(n.resources,f.graph.find(t=>t.id===n.id).resources)||!Array.isArray(n.dependsOn)||
       new Set(n.dependsOn).size!==n.dependsOn.length||n.dependsOn.some(d=>!m.has(d)||d===n.id)||n.owner!==f.graph.find(t=>t.id===n.id).owner||n.lane!==f.graph.find(t=>t.id===n.id).lane))return false;
  const seen=new Set(),active=new Set();
  function visit(id){if(active.has(id))return false;if(seen.has(id))return true;active.add(id);const ok=m.get(id).dependsOn.every(visit);active.delete(id);if(ok)seen.add(id);return ok}
  if(![...m.keys()].every(visit))return false;
  function ancestors(id){const prior=new Set();const walk=x=>{for(const d of m.get(x).dependsOn)if(!prior.has(d)){prior.add(d);walk(d)}};walk(id);return prior;}
  if(!f.graph.every(t=>t.dependsOn.every(d=>ancestors(t.id).has(d))))return false;
  // UI work must remain independent of the database/interface lane.
  return !ancestors('ui').has('database')&&!ancestors('ui').has('api')&&!ancestors('database').has('ui')&&!ancestors('api').has('ui');
}
const failurePolicy={stale:'reject-refresh-keep-draft',duplicate:'return-original-without-write',conflict:'reject-without-write',denied:'reject-no-data',timeout:'unknown-reconcile-before-retry',retry:'bounded-no-duplicate-effect'};
const storage={rowKey:['tenant','id'],requestKey:['tenant','requestId'],fingerprint:['id','trimmedTitle','expectedVersion'],version:'safe-integer-monotonic',read:'tenant-filter-sort-clone',write:'atomic-row-and-request'};
const api={list:{args:['tenant'],result:'cloned-record-array',invalid:'throw-invalid'},save:{args:['tenant','id','title','expectedVersion','requestId'],success:'record-id-title-version',errors:['invalid','stale','conflict'],createVersion:0,titleBounds:[1,80],sync:true}};
export function evaluateConceptArtifact(role,variant,files){
  const f=conceptFixture(role,variant), fixtureHash=canonicalHash(f), checks={};
  const check=(id,cond,reason)=>{checks[id]=cond?{pass:true}:{pass:false,reason}};
  let a,md;
  try{[a,md]=manifest(role,files)}catch(e){return {schema:1,role,variant,fixtureHash,checks:{C00:{pass:false,reason:String(e.message).slice(0,160)}},passed:0,expected:1,screenPassed:false,qualification:false,productionReady:false}};
  const safe=(id,fn,reason)=>{try{check(id,fn()===true,reason)}catch{check(id,false,reason)}};
  safe('C01',()=>a.fixtureHash===fixtureHash&&a.contractVersion===version,'fixture or strategy version drift');
  safe('C02',()=>validTraces(f,a.acceptance),'observable acceptance outcomes, exact source trace or case coverage incorrect');
  safe('C03',()=>validStates(f,a.states),'missing unsafe or false success UI state');
  safe('C04',()=>scopeValid(f,a.scope),'tenant, public release or offline-write boundary changed');
  safe('C05',()=>observed(a.observed),'unobserved tests, CI or reviewer approval claimed');
  if(role==='maya-ai-pm'){
    safe('M01',()=>keys(a,['fixtureHash','contractVersion','acceptance','states','scope','observed','problem','assumptions','options','metric','decision','handoff'])&&
      keys(a.problem,['statement','sourceIds'])&&str(a.problem.statement,25,450)&&setEq(a.problem.sourceIds,variant==='edge'?['S2','S3','S5']:['S2','S3']),'missing evidence-backed user problem or unknown fields');
    safe('M02',()=>Array.isArray(a.assumptions)&&a.assumptions.length>=1&&a.assumptions.length<=4&&a.assumptions.every(x=>keys(x,['id','hypothesis','validation'])&&/^A[1-9]$/.test(x.id)&&str(x.hypothesis,18,300)&&str(x.validation,18,300))&&new Set(a.assumptions.map(x=>x.id)).size===a.assumptions.length,'assumptions missing, duplicated or presented as observed facts');
    safe('M03',()=>options(a.options,['shared-board','improve-chat','no-build'],'shared-board'),'alternatives/no-build or single recommendation missing');
    safe('M04',()=>keys(a.metric,['event','baseline','targetPercent','windowDays','minimumSample','numerator','denominator'])&&a.metric.event==='reminder-saved-and-visible'&&a.metric.baseline===null&&
      Number.isInteger(a.metric.targetPercent)&&a.metric.targetPercent>=70&&a.metric.targetPercent<=100&&Number.isInteger(a.metric.windowDays)&&a.metric.windowDays>=7&&a.metric.windowDays<=30&&
      Number.isInteger(a.metric.minimumSample)&&a.metric.minimumSample>=10&&a.metric.minimumSample<=500&&a.metric.numerator==='confirmed-visible-saves'&&a.metric.denominator==='eligible-save-attempts','invented baseline or unfalsifiable outcome metric');
    safe('M05',()=>keys(a.decision,['action','conflictSource','recommended','safeWork'])&&a.decision.action===(variant==='adversarial'?'escalate':'continue')&&
      a.decision.conflictSource===(variant==='adversarial'?'S5':null)&&a.decision.recommended==='retain-tenant-isolation'&&setEq(a.decision.safeWork,['tenant-view','tenant-save']),'material conflict not escalated or routine safe work stopped');
    safe('M06',()=>keys(a.handoff,['owner','review','feedback','nextAction'])&&a.handoff.owner==='arjun-cpto'&&a.handoff.review==='pending'&&a.handoff.feedback===(variant==='adversarial'?'material-product-change':'routine-validation')&&str(a.handoff.nextAction,20,300),'handoff, feedback classification or review status invalid');
    safe('M07',()=>md.trim().length>=100&&md.length<=1600,'founder brief missing or too long');
  }else{
    safe('A01',()=>keys(a,['fixtureHash','contractVersion','acceptance','states','scope','observed','options','api','storage','graph','migration','failurePolicy','handoff'])&&
      options(a.options,['existing-board','rewrite-service','no-build'],'existing-board'),'smallest reversible architecture / alternatives missing');
    safe('A02',()=>same(a.api,api),'API interface differs from approved contract');
    safe('A03',()=>same(a.storage,storage),'tenant key, idempotency fingerprint, atomicity, version or cloning unsafe');
    safe('A04',()=>validateGraph(f,a.graph),'cycle, missing quality dependency, shared ownership or avoidable UI blocking');
    safe('A05',()=>keys(a.migration,['existingVersion','steps','rollback','schemaOwner','apiOwner','conflict'])&&a.migration.existingVersion===1&&
      same(a.migration.steps,['add-compatible','backfill-validate','switch-readers','retain-old-field'])&&a.migration.rollback==='revert-reader-preserve-writes'&&a.migration.schemaOwner==='tara-database'&&a.migration.apiOwner==='dev-coder'&&a.migration.conflict===(variant==='adversarial'?'serialize-schema-before-api':'none'),'destructive migration, conflicting ownership or rollback loss');
    safe('A06',()=>same(a.failurePolicy,failurePolicy),'unsafe timeout retry, replay or stale/permission behavior');
    safe('A07',()=>keys(a.handoff,['owners','review','signoff','nextAction'])&&setEq(a.handoff.owners,['kiran-pjm-a','leela-pjm-b'])&&a.handoff.review==='pending'&&a.handoff.signoff==='pending'&&str(a.handoff.nextAction,20,350),'architecture handoff or signoff evidence invalid');
    safe('A08',()=>md.trim().length>=250&&md.length<=8000&&['Decision','Alternatives','Risks','Verification'].every(h=>new RegExp('^#{1,3} '+h+'\\s*$','mi').test(md)),'ADR missing decision, tradeoffs, risks or verification section');
  }
  const passed=Object.values(checks).filter(c=>c.pass).length;
  return {schema:1,role,variant,fixtureHash,artifactHash:canonicalHash([...files].sort((x,y)=>x.path.localeCompare(y.path))),checks,passed,
    expected:Object.keys(checks).length,screenPassed:passed===Object.keys(checks).length,qualification:false,productionReady:false};
}
