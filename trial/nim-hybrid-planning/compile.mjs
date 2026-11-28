// Synthetic hybrid planning system: deterministic facts, bounded model choices.
// Never presented as standalone model artifact authorship or actual lease execution.
import {canonicalHash} from '../../scripts/frontier-admission.mjs';
import {planningFixture,evaluatePlanningArtifact} from '../../scripts/frontier-planning-evaluator.mjs';
const object=x=>x!==null&&typeof x==='object'&&!Array.isArray(x);
const sorted=x=>[...x].sort();
const exact=(x,keys)=>object(x)&&JSON.stringify(sorted(Object.keys(x)))===JSON.stringify(sorted(keys));
const conflicts=tasks=>{
 const rows=[];
 for(let i=0;i<tasks.length;i++)for(let j=i+1;j<tasks.length;j++){
  const a=tasks[i],b=tasks[j],resources=sorted(a.resources.filter(r=>b.resources.includes(r)));
  if(resources.length)rows.push({tasks:sorted([a.id,b.id]),resources,mode:'serialize'});
 }
 return rows.sort((a,b)=>a.tasks.join(':').localeCompare(b.tasks.join(':')));
};
export function compilePlanningDelta(role,variant,raw){
 if(typeof raw!=='string'||Buffer.byteLength(raw)>12000)throw Error('delta-boundary');
 let delta;try{delta=JSON.parse(raw)}catch{throw Error('delta-invalid-json')}
 if(!exact(delta,['dispatchTaskIds','handover'])||!Array.isArray(delta.dispatchTaskIds)
    ||delta.dispatchTaskIds.length>2||!delta.dispatchTaskIds.every(x=>typeof x==='string'&&/^[a-z][a-z-]{0,63}$/.test(x))
    ||new Set(delta.dispatchTaskIds).size!==delta.dispatchTaskIds.length
    ||typeof delta.handover!=='string'||delta.handover.trim().length<80||Buffer.byteLength(delta.handover)>6000)
    throw Error('delta-invalid-shape');
 const fixture=planningFixture(role,variant),fixtureHash=canonicalHash(fixture);
 const byId=new Map(fixture.tasks.map(t=>[t.id,t]));
 if(delta.dispatchTaskIds.some(id=>!byId.has(id)))throw Error('delta-unknown-task');
 // The model cannot override identity, dependency, observed state, evidence, lease generation,
 // worker identity, base, CI, conflicts, or mandatory fencing of interrupted work.
 const graph={fixtureHash,nodes:fixture.tasks.map(({id,owner,lane,dependsOn,observed,evidence})=>({id,owner,lane,dependsOn,observed,evidence})),
  dispatch:delta.dispatchTaskIds.map(id=>({taskId:id,worker:'synthetic-controller-'+id,generation:byId.get(id).generation+1,base:fixture.base,expiresAt:fixture.leaseUntil})),
  reconcile:fixture.tasks.filter(t=>t.observed==='reconcile').map(t=>({taskId:t.id,fencedGeneration:t.generation,existingPr:t.existingPr,base:fixture.base,action:'inspect-pr-and-fence'})),
  ci:fixture.ci};
 const json=x=>JSON.stringify(x,null,2)+'\n';
 const files=role==='kiran-pjm-a'?[{path:'task-graph.json',content:json(graph)},{path:'handover.md',content:delta.handover}]:
  [{path:'lane-plan.json',content:json(graph)},{path:'conflict-register.json',content:json({fixtureHash,conflicts:conflicts(fixture.tasks)})}];
 const grade=evaluatePlanningArtifact(role,variant,files);
 return {files,grade,deltaHash:canonicalHash(delta),authorship:'hybrid-controller-facts-model-decisions',qualification:false};
}
