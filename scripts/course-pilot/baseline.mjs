// Baseline checks are evaluator-owned. Fail closed if a test is missing or failed for another reason.
import { readFileSync } from 'node:fs';
import { outcomes } from '../safe-trial.mjs';
export function checkBaseline(acceptance, full) {
  const cases=Object.entries(outcomes(acceptance));
  const fullCases=Object.entries(outcomes(full));
  if(cases.length!==6 || cases.some(([name,status])=>!name.includes('CRS-01-SC-')||status!=='unexpected')) throw new Error('All six Course acceptance cases must fail on healthy baseline');
  const failures=[];
  const walk=(s)=>{for(const spec of s.specs||[])for(const t of spec.tests||[])for(const r of t.results||[])if(r.error?.message)failures.push(r.error.message);for(const q of s.suites||[])walk(q);};
  for(const s of acceptance.suites||[])walk(s);
  if(failures.length!==6 || failures.some(m=>!m.includes('Courses')||!m.includes('toBeVisible'))) throw new Error('Course baseline failures must be the missing Courses entry hook, not setup errors');
  const regression=fullCases.filter(([n])=>!n.includes('CRS-01-SC-'));
  if(!regression.length || regression.some(([,s])=>s!=='expected')) throw new Error('Baseline regression is not fully green; no model may run');
  return {courseRed:cases.length,regressionGreen:regression.length};
}
if(process.argv[1]?.endsWith('/baseline.mjs')) {
  const result=checkBaseline(JSON.parse(readFileSync(process.argv[2],'utf8')),JSON.parse(readFileSync(process.argv[3],'utf8')));
  console.log('Course RED baseline validated:', JSON.stringify(result));
}
