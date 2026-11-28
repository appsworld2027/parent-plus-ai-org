// Independent deterministic simulator of the declared synthetic candidate API contract.
// No evaluator-answer imports; only caller-supplied fixture operations and public invariants.
const nonempty=x=>typeof x==='string'&&x.trim().length>0;
const clone=x=>structuredClone(x);
export function simulateTrace(trace){
 const tenants=new Map(),requests=new Map();
 const map=(outer,key)=>{if(!outer.has(key))outer.set(key,new Map());return outer.get(key);};
 const fail=code=>({ok:false,code});
 const save=input=>{
  const {tenant,id,title,expectedVersion,requestId}=input??{};
  const trimmed=typeof title==='string'?title.trim():'';
  if(![tenant,id,requestId].every(nonempty)||!trimmed||trimmed.length>80||!Number.isSafeInteger(expectedVersion)||expectedVersion<0)return fail('invalid');
  const ledger=map(requests,tenant),rows=map(tenants,tenant),fingerprint=JSON.stringify([id,trimmed,expectedVersion]);
  if(ledger.has(requestId)){const prior=ledger.get(requestId);return prior.fingerprint===fingerprint?clone(prior.result):fail('conflict');}
  const prior=rows.get(id),version=prior?.version??0;
  if(expectedVersion!==version)return fail('stale');
  if(!Number.isSafeInteger(version+1))return fail('invalid');
  const record={id,title:trimmed,version:version+1},result={ok:true,record};
  rows.set(id,clone(record));ledger.set(requestId,{fingerprint,result:clone(result)});return clone(result);
 };
 const list=tenant=>!nonempty(tenant)?{throws:'invalid'}:[...(tenants.get(tenant)?.values()??[])].sort((a,b)=>a.id<b.id?-1:a.id>b.id?1:0).map(clone);
 return trace.steps.map(step=>{if(step.op==='save')return save(step.input);if(step.op==='list')return list(step.tenant);throw Error('unknown trace operation');});
}
export function deriveToolFields(fixture,fixtureHash){
 return {fixtureHash,contractVersion:fixture.contractVersion,acceptance:fixture.traces.map(trace=>({id:trace.id,sourceIds:clone(trace.sourceIds),expected:simulateTrace(trace)})),states:clone(fixture.states),scope:clone(fixture.approvedScope),observed:{tests:'not-run',independentReview:'pending',ci:'unknown'}};
}
