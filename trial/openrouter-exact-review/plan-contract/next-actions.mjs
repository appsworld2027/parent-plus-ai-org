// Qualification-only future plan contract. Each requires entry denotes COMPLETION, not mere readiness.
const same=(a,b)=>a.length===b.length&&new Set(a).size===a.length&&a.every(x=>b.includes(x));
export function verifyNextActions({fixture,steps}={}){
 const fail=reason=>({valid:false,reason,qualification:false});
 if(!Array.isArray(fixture?.tasks)||!Array.isArray(steps))return fail('invalid-input');
 const tasks=new Map(fixture.tasks.map(t=>[t.id,t]));
 if(tasks.size!==fixture.tasks.length)return fail('duplicate-fixture-task');
 const pending=fixture.tasks.filter(t=>t.observed!=='complete');
 if(steps.length!==pending.length)return fail('incomplete-future-plan');
 const completed=new Set(fixture.tasks.filter(t=>t.observed==='complete').map(t=>t.id)),planned=new Set();
 for(const step of steps){
  if(!step||Object.keys(step).sort().join()!=='requires,task,unblock'||!Array.isArray(step.requires))return fail('invalid-step');
  const task=tasks.get(step.task);if(!task||completed.has(task.id)||planned.has(task.id)||!Array.isArray(task.dependsOn))return fail('unknown-or-duplicate-task');
  const required=task.dependsOn.filter(id=>!completed.has(id));
  if(!same(step.requires,required)||!required.every(id=>planned.has(id)))return fail('missing-or-premature-prerequisite-completion');
  if(task.observed==='blocked'){
   if(typeof task.blocker!=='string'||!task.blocker||step.unblock!==task.blocker)return fail('blocked-task-must-resolve-real-blocker');
  }else if(step.unblock!==null)return fail('invented-blocker');
  planned.add(task.id);
 }
 return {valid:true,reason:'dependency-completion-plan-pass',qualification:false,executionObserved:false};
}
