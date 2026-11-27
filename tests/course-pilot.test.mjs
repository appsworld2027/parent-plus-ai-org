import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { spawnSync } from 'node:child_process';
const read=(p)=>readFileSync(new URL('../'+p,import.meta.url),'utf8');
process.env.TRIAL_PROFILE='course-pilot';
const { TRIAL, patchProblems, builderPrompt, reviewerPrompt, verdict, parseRaw, courseContractProblems }=await import('../scripts/safe-trial.mjs');
const { checkBaseline }=await import('../scripts/course-pilot/baseline.mjs');
const { extractReview }=await import('../scripts/course-pilot/review.mjs');
const { checkEligibility }=await import('../scripts/course-pilot/eligibility.mjs');
const M=(path,status='M')=>({status,path});
test('course profile is pinned to exact MM revision; six locked cases and approved independent models',()=>{
  assert.match(TRIAL.base,/^[0-9a-f]{40}$/);
  assert.equal(TRIAL.base,'710082b2d8cf3c1007086df31f87b34ae8e02573');
  assert.equal(TRIAL.acceptanceCount,6);
  assert.equal(TRIAL.builder,'groq/openai/gpt-oss-120b');
  assert.equal(TRIAL.reviewer,'groq/qwen/qwen3.8-27b');
  assert.notEqual(TRIAL.builder,TRIAL.reviewer);
  const spec=read(TRIAL.spec);
  assert.equal((spec.match(/test\('CRS-01-SC-/g)||[]).length,6);
  const contract=read('trial/controls/coach-course-management.CONTRACT.md');
  for(let i=1;i<=6;i++)assert.ok(contract.includes('CRS-01-SC-00'+i));
});
test('course candidate cannot touch controls, backend, auth, production or unrelated code',()=>{
  assert.deepEqual(patchProblems([M('App.tsx'),M('src/courses/model.ts','A'),M('src/courses/CourseScreen.tsx','A'),M('tests/course-model.test.ts','A')]),[]);
  for(const row of [M('e2e/support/backend.ts'),M(TRIAL.spec),M('e2e/acceptance/coach-course-management.spec.ts'),M('src/auth/AuthProvider.tsx'),M('src/parent/ParentApp.tsx'),M('supabase/candidates/example.sql','A'),M('.github/workflows/foo.yml','A'),M('package.json'),M('tests/old.test.ts'),M('src/courses/folder/../model.ts','A'),M('src/courses/AGENTS.md','A'),M('App.tsx','D'),M('src/courses/malicious.ts','D')])assert.ok(patchProblems([row]).length>0,row.path);
  assert.ok(patchProblems(parseRaw(':000000 120000 000 abc A\tsrc/courses/link.ts')).length>0);
  assert.ok(patchProblems([]).length>0);
});
test('baseline rejects wrong failures, missing cases, or failing unrelated regressions',()=>{
  const spec=(i,msg='Courses toBeVisible')=>({title:'CRS-01-SC-00'+i,tests:[{status:'unexpected',results:[{error:{message:msg}}]}]});
  const report=(specs)=>({suites:[{file:'test.spec.ts',specs}]});
  const acc=report(Array.from({length:6},(_,i)=>spec(i+1)));
  const good=report([{title:'old',tests:[{status:'expected'}]}]);
  assert.deepEqual(checkBaseline(acc,good),{courseRed:6,regressionGreen:1});
  assert.throws(()=>checkBaseline(report([spec(1)]),good));
  assert.throws(()=>checkBaseline(report(Array.from({length:6},(_,i)=>spec(i+1,'syntax error'))),good));
  assert.throws(()=>checkBaseline(acc,report([{title:'old',tests:[{status:'flaky'}]}])));
  assert.throws(()=>checkBaseline(acc,report([])));
});
test('no independent approval on malformed, failed, ambiguous or negative review',()=>{
  const wrap=(result,is_error=false,subtype='success')=>JSON.stringify({type:'result',result,is_error,subtype});
  assert.equal(extractReview(wrap('evidence\nVERDICT: APPROVE')).approved,true);
  assert.equal(extractReview(wrap('evidence\nVERDICT: CHANGES')).approved,false);
  assert.throws(()=>extractReview(wrap('VERDICT: APPROVE',true)));
  assert.throws(()=>extractReview(wrap('VERDICT: APPROVE\nVERDICT: CHANGES')));
  assert.throws(()=>extractReview(wrap('VERDICT: APPROVE'),'sam'));
  assert.equal(extractReview(wrap('evidence\nRELEASE: BLOCK_PRODUCTION'),'sam').approved,true);
});
test('course grader requires all six and no existing regressions',()=>{
  const expected=Object.fromEntries(Array.from({length:6},(_,i)=>['AC'+i,'expected']));
  const good={problems:[],checkExit:0,acceptance:expected,before:{old:'expected'},after:{old:'expected'}};
  assert.equal(verdict(good).result,'PROVISIONAL PASS');
  for(const change of [{acceptance:{}},{checkExit:1},{problems:['unsafe path']},{after:{old:'unexpected'}}])assert.equal(verdict({...good,...change}).result,'FAIL');
});
test('course workflow is owner-only for inference, read-only GitHub, isolated; PR validates contract without secrets',()=>{
  const flow=read('.github/workflows/course-pilot.yml');
  assert.match(flow,/\npermissions:\n  contents: read\n/);
  assert.match(flow,/github.event_name == 'workflow_dispatch'/);
  assert.match(flow,/inputs.confirm == 'COURSE PILOT ONLY'/);
  assert.match(flow,/github.ref == 'refs\/heads\/main'/);
  assert.match(flow,/github.actor == github.repository_owner/);
  assert.match(flow,/github.triggering_actor == github.repository_owner/);
  assert.match(flow,/vars.UNATTENDED_AGENTS == 'on'/);
  assert.match(flow,/persist-credentials: false/);
  assert.doesNotMatch(flow,/NVIDIA_NIM_API_KEY|OPENAI_API_KEY|ANTHROPIC_API_KEY|CODEX_AUTH|git push|gh pr merge|gh workflow run/);
  assert.doesNotMatch(flow.slice(flow.indexOf('\n  grade:'),flow.indexOf('\n  review:')),/secrets\.|engine\.sh|agent\.sh/);
  assert.match(flow,/needs: \[baseline, eligibility, prebuild-lock\]/);
  assert.match(flow,/needs: \[build, grade, review\]/);
  for(const stage of ['course-build','course-grade','course-review','course-release-simulation'])assert.ok(flow.includes(stage));
  assert.match(read('scripts/course-pilot/engine.sh'),/groq\/openai\/gpt-oss-120b\|groq\/qwen\/qwen3\.8-27b/);
  assert.match(read('scripts/course-pilot/engine.sh'),/free-claude-code==6\.19\.56/);
  assert.match(read('scripts/course-pilot/engine.sh'),/REASONING_POLICY=medium/);
  assert.match(read('scripts/course-pilot/engine.sh'),/as_proxy/);
  assert.match(read('scripts/course-pilot/scan.sh'),/GROQ_API_KEY/);
  assert.match(read('scripts/safe-trial/lib.sh'),/EXPO_PUBLIC_COURSE_PILOT/);
  assert.ok(builderPrompt().includes('mock-only'));
  assert.ok(reviewerPrompt('grade').includes('defaults off'));
});
test('all course shell scripts parse; no onboarding/install work performed here',()=>{
  for(const path of ['scripts/course-pilot/engine.sh','scripts/course-pilot/scan.sh','scripts/course-pilot/plan.sh','scripts/safe-trial/prepare.sh','scripts/safe-trial/agent.sh','scripts/safe-trial/lib.sh'])assert.equal(spawnSync('bash',['-n',new URL('../'+path,import.meta.url).pathname]).status,0,path);
});

test('PRD free-only gate rejects missing, unknown, expired or unqualified routes before inference',()=>{
  const now=Date.parse('2026-11-27T00:00:00Z');
  const link='https://github.com/appsworld2027/parent-plus-ai-org/actions/runs/1';
  const x={schema:'course-provider-eligibility/v1',provider:'groq',adapter:'free-claude-code@6.19.56',billingGuard:'provider-enforced-no-charge',paidFallback:false,dataClass:'public-source-and-synthetic-only',privateOrCustomerData:false,verifiedAt:'2026-11-26T00:00:00Z',expiresAt:'2026-12-01T00:00:00Z',billingEvidence:link,termsEvidence:link,routes:['groq/openai/gpt-oss-120b','groq/qwen/qwen3.8-27b'].map(id=>({id,observedIdentity:id.slice(5),toolArtifactVerified:true,syntheticQualificationPassed:true,receiptSha256:'a'.repeat(64),run:link,adapterQualificationPassed:true,adapterObservedIdentity:id.slice(5),adapterReceiptSha256:'b'.repeat(64),adapterRun:'https://github.com/appsworld2027/parent-plus-ai-org/actions/runs/2'}))};
  assert.throws(()=>checkEligibility('',now));
  assert.throws(()=>checkEligibility('not JSON',now));
  assert.equal(checkEligibility(JSON.stringify(x),now).routeIds.length,2);
  for(const ch of [{billingGuard:'unknown'},{paidFallback:true},{dataClass:'private'},{privateOrCustomerData:true},{expiresAt:'2026-11-26T23:00:00Z'},{billingEvidence:''},{routes:x.routes.slice(1)},{routes:[{...x.routes[0],observedIdentity:'different'},x.routes[1]]},{routes:[{...x.routes[0],toolArtifactVerified:false},x.routes[1]]},{routes:[{...x.routes[0],adapterQualificationPassed:false},x.routes[1]]},{routes:[{...x.routes[0],adapterObservedIdentity:'unknown'},x.routes[1]]},{routes:[{...x.routes[0],adapterRun:link},x.routes[1]]},{routes:[{...x.routes[0],adapterReceiptSha256:'a'.repeat(64)},x.routes[1]]}])assert.throws(()=>checkEligibility(JSON.stringify({...x,...ch}),now));
  const flow=read('.github/workflows/course-pilot.yml');
  assert.match(flow,/course-provider-eligibility/);
  assert.match(flow,/needs: \[baseline, eligibility, prebuild-lock\]/);
  assert.equal((flow.match(/COURSE_PILOT_PROVIDER_ELIGIBILITY: /g)||[]).length,4);
  assert.match(read('scripts/course-pilot/engine.sh'),/node "\$J\/scripts\/course-pilot\/eligibility\.mjs"/);
});

test('canonical Course lock rejects skipped/focused new tests and absent actual patch',()=>{
  const changes=[M('tests/course-model.test.ts','A')];
  assert.ok(courseContractProblems(changes,'').length);
  assert.ok(courseContractProblems(changes,'+++ b/tests/course-model.test.ts\n+test.skip("pretend",()=>{});').length);
  assert.ok(courseContractProblems(changes,'+++ b/tests/course-model.test.ts\n+test.only("pretend",()=>{});').length);
  assert.deepEqual(courseContractProblems(changes,'+++ b/tests/course-model.test.ts\n+test("invariant",()=>{});'),[]);
});
test('prebuild lock requires exact hashes, separate canonical roles and intended RED proof',async()=>{
  const {validateLock}=await import('../scripts/course-pilot/prebuild-lock.mjs');
  const h='a'.repeat(64),source=TRIAL.base,inputs={source,contractHash:h,testHash:h,supportHash:h};
  const stages=[['ai:tests','quinn-qa','author'],['ai:tests-review','quinn-qa','challenger'],['ai:tests-signoff','arjun-cpto','accountable']].map(([stage,role,seat],i)=>({...inputs,stage,role,seat,passed:true,attempt:'test-attempt-'+i,contextSha256:String(i).repeat(64),artifactSha256:String(i+3).repeat(64),run:'https://github.com/appsworld2027/parent-plus-ai-org/actions/runs/'+(i+1)}));
  const lock={...inputs,schema:'course-test-lock/v1',stages,intendedRed:true,redRun:'https://github.com/appsworld2027/parent-plus-ai-org/actions/runs/9',redReceiptSha256:h,criticalMutationControlsPassed:true};
  assert.equal(validateLock(lock,inputs),true);
  assert.throws(()=>validateLock(null,inputs));
  assert.throws(()=>validateLock({...lock,testHash:'b'.repeat(64)},inputs));
  assert.throws(()=>validateLock({...lock,stages:[stages[0],{...stages[1],contextSha256:stages[0].contextSha256},stages[2]]},inputs));
  assert.throws(()=>validateLock({...lock,intendedRed:false},inputs));
  assert.throws(()=>validateLock({...lock,criticalMutationControlsPassed:false},inputs));
  const flow=read('.github/workflows/course-pilot.yml');assert.match(flow,/needs: \[baseline, eligibility, prebuild-lock\]/);
});
