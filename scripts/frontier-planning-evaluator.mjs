// Supplemental artifact screen for Kiran / Leela. Synthetic facts only.
// Deterministic plan constraints, not a semantic review, live worker or full rubric.
import {canonicalHash} from './frontier-admission.mjs';
const variants=['normal','edge','adversarial'];
const roles=['kiran-pjm-a','leela-pjm-b'];
const base='a'.repeat(40), old='b'.repeat(40);
const NOW=1000;
const task=(id,owner,lane,dependsOn,resources,observed='pending',generation=0,evidence=null)=>(
 {id,owner,lane,dependsOn,resources,observed,generation,evidence});
export function planningFixture(role,variant){
  if(!roles.includes(role)||!variants.includes(variant)) throw Error('unknown planning case');
  const tasks=[
    task('contract','maya-ai-pm','shared',[],[],'complete',0,'contract-lock-1'),
    task('architecture','arjun-cpto','shared',['contract'],[],'complete',0,'architecture-lock-1'),
    task('tests','quinn-qa','shared',['architecture'],[],'complete',0,'tests-lock-1'),
    task('api','dev-coder','A',['tests'],['api:board','file:board.mjs','product:reminder-visibility']),
    task('database','tara-database','A',['tests'],['schema:reminders']),
    task('ui','iris-design','B',['tests'],['file:board.html']),
    task('integration','ravi-integration','B',['tests'],['api:notification']),
    task('qa','quinn-qa','shared',['api','database','ui','integration'],[]),
    task('review','rex-reviewer','shared',['qa'],[]),
    task('release','sam-release','shared',['review'],[])
  ];
  const find=id=>tasks.find(t=>t.id===id);
  if(variant==='edge'){
    Object.assign(find('database'),{observed:'blocked',blocker:'migration-lock'});
    Object.assign(find('api'),{observed:'expired',generation:3,priorWorker:'worker-old',priorBase:old});
    if(role==='leela-pjm-b')find('integration').resources=['api:board','file:board.mjs','product:reminder-visibility','schema:reminders'];
  }
  if(variant==='adversarial'){
    Object.assign(find('api'),{observed:'reconcile',generation:4,priorWorker:'worker-old',
      priorBase:old,existingPr:'synthetic-pr-41',completionEvidence:null});
    Object.assign(find('integration'),{observed:'reconcile',generation:7,priorWorker:'worker-stale',
      priorBase:old,existingPr:'synthetic-pr-42',completionEvidence:null});
    find('integration').resources=['api:board','file:board.mjs','product:reminder-visibility','schema:reminders'];
  }
  return {schema:1,role,variant,base,now:NOW,leaseUntil:NOW+60,capacity:2,
    dispatchBudget:variant==='adversarial'?1:2,ci:variant==='normal'?'not-run':'unknown',tasks};
}
const sorted=a=>[...a].sort();
const equal=(a,b)=>canonicalHash(a)===canonicalHash(b);
const sameSet=(a,b)=>Array.isArray(a)&&a.every(x=>typeof x==='string')&&equal(sorted(a),sorted(b));
const validObject=o=>o!==null&&typeof o==='object'&&!Array.isArray(o);
const keys=(o,k)=>validObject(o)&&sameSet(Object.keys(o),k);
const overlaps=(a,b)=>sorted(a.resources.filter(x=>b.resources.includes(x)));
function conflictsOf(tasks){
  const pairs=[];
  for(let i=0;i<tasks.length;i++)for(let j=i+1;j<tasks.length;j++){
    const a=tasks[i],b=tasks[j],resources=overlaps(a,b);
    if(resources.length)pairs.push({tasks:sorted([a.id,b.id]),resources,mode:'serialize'});
  }
  return pairs.sort((a,b)=>a.tasks.join(':').localeCompare(b.tasks.join(':')));
}
function parseFile(files,path){
  const file=files.find(x=>x.path===path);
  if(!file||typeof file.content!=='string'||Buffer.byteLength(file.content)>24000)throw Error('missing or oversized '+path);
  const result=JSON.parse(file.content);
  if(!validObject(result))throw Error('invalid object '+path);
  return result;
}
export function evaluatePlanningArtifact(role,variant,files){
  const fixture=planningFixture(role,variant);
  const checks={};
  const fail=(id,msg)=>checks[id]={pass:false,reason:msg};
  const check=(id,condition,msg)=>condition?checks[id]={pass:true}:fail(id,msg);
  let plan,register;
  try{
    if(!Array.isArray(files)||files.length!==2||!sameSet(files.map(f=>f?.path),role==='kiran-pjm-a'?['task-graph.json','handover.md']:['lane-plan.json','conflict-register.json'])||
       files.some(f=>!keys(f,['path','content'])||typeof f.content!=='string'||!f.content.trim()||Buffer.byteLength(f.content)>24000))throw Error('invalid artifact manifest');
    plan=parseFile(files,role==='kiran-pjm-a'?'task-graph.json':'lane-plan.json');
    if(role==='leela-pjm-b')register=parseFile(files,'conflict-register.json');
    if(!keys(plan,['fixtureHash','nodes','dispatch','reconcile','ci'])||!Array.isArray(plan.nodes)||!Array.isArray(plan.dispatch)||!Array.isArray(plan.reconcile))throw Error('invalid plan shape');
  }catch(e){return {schema:1,role,variant,fixtureHash:canonicalHash(fixture),qualified:false,checks:{P00:{pass:false,reason:String(e.message).slice(0,150)}},qualification:false};}
  const tasks=fixture.tasks, byId=new Map(tasks.map(t=>[t.id,t]));
  const planNodes=plan.nodes;
  const nodesValid=planNodes.every(n=>keys(n,['id','owner','lane','dependsOn','observed','evidence'])&&typeof n.id==='string'&&byId.has(n.id));
  const byNode=new Map(planNodes.filter(validObject).map(t=>[t.id,t]));
  check('P01',plan.fixtureHash===canonicalHash(fixture),'wrong fixture identity');
  check('P02',nodesValid&&sameSet(planNodes.map(n=>n?.id),tasks.map(t=>t.id)),'missing/duplicate/unknown task');
  check('P03',nodesValid&&tasks.every(t=>{const n=byNode.get(t.id);return n&&n.owner===t.owner&&n.lane===t.lane;}),'owner or lane changed');
  check('P04',nodesValid&&tasks.every(t=>sameSet(byNode.get(t.id)?.dependsOn,t.dependsOn)),'dependency changed or missing');
  check('P05',nodesValid&&tasks.every(t=>{const n=byNode.get(t.id);return n&&n.observed===t.observed&&n.evidence===t.evidence;}),'invented completion or changed observed state/evidence');
  check('P06',plan.ci===fixture.ci,'unknown/unrun CI cannot be promoted');
  const ready=tasks.filter(t=>['pending','expired'].includes(t.observed)&&t.dependsOn.every(d=>byId.get(d)?.observed==='complete'));
  const choose=plan.dispatch;
  const knownDispatch=choose.every(d=>keys(d,['taskId','worker','generation','base','expiresAt'])&&byId.has(d.taskId)&&typeof d.worker==='string'&&d.worker.trim()===d.worker&&d.worker.length>0&&d.worker.length<=64);
  check('P07',knownDispatch&&choose.every(d=>ready.some(t=>t.id===d.taskId)),'blocked/reconcile/dependency-unready dispatch');
  check('P08',knownDispatch&&new Set(choose.map(d=>d.taskId)).size===choose.length&&new Set(choose.map(d=>d.worker)).size===choose.length&&choose.length<=fixture.dispatchBudget&&choose.length<=fixture.capacity,'duplicate dispatch, worker or over-capacity');
  check('P09',knownDispatch&&choose.every(d=>{const t=byId.get(d.taskId);return d.generation===t.generation+1&&d.base===fixture.base&&d.expiresAt===fixture.leaseUntil&&d.worker!==t.priorWorker;}),'stale lease, worker or base');
  check('P10',knownDispatch&&choose.every((d,i)=>choose.slice(i+1).every(e=>!overlaps(byId.get(d.taskId),byId.get(e.taskId)).length)),'conflicting tasks dispatched concurrently');
  // This fixture has capacity <=2, so enumerate pairs rather than depend on a scheduler.
  let max=ready.length?1:0;
  if(fixture.dispatchBudget>=2&&ready.some((a,i)=>ready.slice(i+1).some(b=>!overlaps(a,b).length)))max=2;
  max=Math.min(max,fixture.dispatchBudget);
  check('P11',choose.length===max,'unnecessary serialization or idle capacity');
  const rec=tasks.filter(t=>t.observed==='reconcile').map(t=>({taskId:t.id,fencedGeneration:t.generation,existingPr:t.existingPr,base:fixture.base,action:'inspect-pr-and-fence'})).sort((a,b)=>a.taskId.localeCompare(b.taskId));
  const candidateRec=plan.reconcile.every(r=>keys(r,['taskId','fencedGeneration','existingPr','base','action'])&&typeof r.taskId==='string')? [...plan.reconcile].sort((a,b)=>a.taskId.localeCompare(b.taskId)):null;
  check('P12',candidateRec!==null&&equal(candidateRec,rec),'existing PR / stale worker must reconcile before redispatch');
  if(role==='leela-pjm-b'){
    const expected=conflictsOf(tasks);
    const valid=keys(register,['fixtureHash','conflicts'])&&register.fixtureHash===canonicalHash(fixture)&&Array.isArray(register.conflicts)&&register.conflicts.every(c=>keys(c,['tasks','resources','mode'])&&Array.isArray(c.tasks)&&c.tasks.length===2&&c.tasks.every(x=>typeof x==='string')&&Array.isArray(c.resources)&&c.resources.every(x=>typeof x==='string'));
    const actual=valid?register.conflicts.map(c=>({...c,tasks:sorted(c.tasks),resources:sorted(c.resources)})).sort((a,b)=>a.tasks.join(':').localeCompare(b.tasks.join(':'))):null;
    check('P13',actual!==null&&equal(actual,expected),'missing, spurious or unserialized resource conflict');
    const crossLane=max===2&&ready.some((a,i)=>ready.slice(i+1).some(b=>a.lane!==b.lane&&!overlaps(a,b).length));
    check('P14',!crossLane||(knownDispatch&&choose.length===2&&byId.get(choose[0].taskId).lane!==byId.get(choose[1].taskId).lane),'both delivery lanes must progress when an independent pair exists');
  }
  const passed=Object.values(checks).filter(c=>c.pass).length;
  return {schema:1,role,variant,fixtureHash:canonicalHash(fixture),artifactHash:canonicalHash([...files].sort((a,b)=>a.path.localeCompare(b.path))),
    checks,passed,expected:Object.keys(checks).length,qualified:Object.values(checks).every(c=>c.pass),qualification:false};
}
