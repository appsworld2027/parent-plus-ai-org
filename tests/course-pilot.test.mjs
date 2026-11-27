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

test('disabled direct tool primitive binds exact paths, bytes, hash, and independent read/write allowlists',async()=>{
  const {mkdtempSync,mkdirSync,writeFileSync,readFileSync,symlinkSync,linkSync,rmSync}=await import('node:fs');
  const {tmpdir}=await import('node:os');
  const {join}=await import('node:path');
  const {executeBoundedTool:tool}=await import('../scripts/course-pilot/bounded-tool.mjs');
  const root=mkdtempSync(join(tmpdir(),'course-bounded-tool-'));
  try {
    mkdirSync(join(root,'src'));writeFileSync(join(root,'src/a.ts'),'old value\nold repeated repeated\n');
    writeFileSync(join(root,'src/read.ts'),'read only');
    writeFileSync(join(root,'outside.ts'),'do not touch');
    symlinkSync(join(root,'outside.ts'),join(root,'src/link.ts'));
    linkSync(join(root,'outside.ts'),join(root,'src/hard.ts'));
    symlinkSync(root,join(root,'alias'));
    const policy={root,read:['src/a.ts','src/read.ts','src/link.ts','src/hard.ts','alias/outside.ts'],write:['src/a.ts','src/new.ts','src/link.ts','src/hard.ts','alias/outside.ts']};
    const original=tool(policy,{tool:'Read',path:'src/a.ts'});
    assert.equal(original.content,'old value\nold repeated repeated\n');
    for(const path of ['../outside.ts','/etc/passwd','outside.ts','src/link.ts','src/hard.ts','alias/outside.ts','src/../outside.ts'])assert.throws(()=>tool(policy,{tool:'Read',path}),undefined,path);
    const patch={tool:'Replace',path:'src/a.ts',sha256:original.sha256,old:'old value',replacement:'new value ✓'};
    assert.throws(()=>tool(policy,{...patch,sha256:'0'.repeat(64)}),/Stale/);
    assert.throws(()=>tool(policy,{...patch,old:'repeated'}),/unique/);
    assert.throws(()=>tool(policy,{...patch,old:'old value',replacement:'old value'}),/No-op/);
    assert.throws(()=>tool(policy,{...patch,path:'src/read.ts'}),/allowlist/);
    assert.throws(()=>tool(policy,{tool:'Run',command:'echo x'}),/Unapproved/);
    assert.equal(readFileSync(join(root,'src/a.ts'),'utf8'),original.content);
    const result=tool(policy,patch);
    const after=tool(policy,{tool:'Read',path:'src/a.ts'});
    assert.equal(after.content,'new value ✓\nold repeated repeated\n');
    assert.equal(result.afterSha256,after.sha256);
    assert.throws(()=>tool(policy,patch),/Stale/);
    const created=tool(policy,{tool:'Create',path:'src/new.ts',content:'export const n=1;\n'});
    assert.match(created.sha256,/^[a-f0-9]{64}$/);
    assert.equal(readFileSync(join(root,'src/new.ts'),'utf8'),'export const n=1;\n');
    assert.throws(()=>tool(policy,{tool:'Create',path:'src/new.ts',content:'overwrite'}));
    assert.throws(()=>tool(policy,{tool:'Create',path:'outside.ts',content:'bad'}));
    assert.equal(readFileSync(join(root,'outside.ts'),'utf8'),'do not touch');
  }finally{rmSync(root,{recursive:true,force:true})}
});

test('declarative QA coverage rejects false approvals and compiles exact stage selectors',async()=>{
  const {coverageIssues,assertCourseCoverage,COURSE_IDS}=await import('../scripts/course-pilot/declarative-coverage.mjs');
  const {compileCourseCases,compileCourseOperation}=await import('../scripts/course-pilot/declarative-compiler.mjs');
  const [a,b,c,d,e,f,g]=COURSE_IDS;
  const form=[['B','Courses'],['B','Create course']],initial=[['F','Course title','A'],['F','Stage 1 title','S'],['F','Stage 1 objective 1','O']];
  const confirm=[['B','Publish version'],['VB','Confirm publish'],['B','Confirm publish']];
  const leave=[['T','Today'],['X','Leave your unsaved changes?']];
  const fields=['Course title','Stage 1 title','Stage 1 objective 1','Stage 1 objective 2','Stage 2 title','Stage 2 objective 1'];
  // Controller-authored unit fixture calibrates the gate only, not Quinn role evidence.
  const cases={
    [a]:[['B','Courses'],['H','Courses'],['X','Course pilot — not synced'],['X','No courses yet'],['VB','Create course'],...['Today','Schedule','Feedback','Students','Fees'].map(x=>['VT',x])],
    [b]:[...form,...fields.slice(0,3).map(x=>['I',x]),...initial.slice(1),['B','Save draft'],['X','Course title is required'],['V','Stage 1 title','S'],['V','Stage 1 objective 1','O'],...leave,['B','Discard and leave'],['B','Courses'],['X','No courses yet']],
    [c]:[...form,...initial,['B','Add objective to stage 1'],['F','Stage 1 objective 2','O2'],['B','Add stage'],['F','Stage 2 title','S2'],['F','Stage 2 objective 1','O3'],['B','Save draft'],['X','A'],['X','Draft'],['B','Edit course'],...fields.map((x,i)=>['V',x,['A','S','O','O2','S2','O3'][i]]),['O',fields]],
    [d]:[...form,...initial,['B','Save draft'],...confirm,['X','Version 1'],['B','Edit course'],['F','Course title','B'],['B','Save draft'],...confirm,['X','Version 2'],['B','View history'],...['Version 1','Version 2','A','B'].flatMap(x=>[['X',x],['N',x,1]])],
    [e]:[...form,...initial,...leave,['B','Keep editing'],...initial.map(x=>['V',x[1],x[2]]),...leave,['B','Discard and leave'],['B','Courses'],['X','No courses yet']],
    [f]:[...form,...initial,['B','Save draft'],['X','A'],['T','Today'],['B','Courses'],['X','A'],['X','Course pilot — not synced'],['NET']],
    [g]:[['VT','Today'],['NB','Courses'],['NET']]
  };
  const artifact={cases,limitations:'controller grammar control only'};
  assert.deepEqual(coverageIssues(artifact),[]);
  const {spec,guard}=compileCourseCases(artifact);
  assert.match(spec,/name: "Add objective to stage 1", exact: true/);
  assert.match(guard,/window.__coachFixture.calls/);
  assert.equal(compileCourseOperation(['B','Add objective',0]),compileCourseOperation(['B','Add objective to stage 1']));
  assert.equal(compileCourseOperation(['B','Add objective',1]),compileCourseOperation(['B','Add objective to stage 2']));
  assert.throws(()=>compileCourseOperation(['B','Add objective']));
  assert.throws(()=>compileCourseOperation(['B','Add objective to stage 3']));
  const defects=[
    [a,op=>op[1]==='Course pilot — not synced'],
    [b,op=>op[0]==='V'],
    [c,op=>op[0]==='O'],
    [d,op=>op[0]==='N'],
    [e,op=>op[1]==='Leave your unsaved changes?'],
    [f,op=>op[0]==='NET'],
    [g,op=>op[0]==='NB']
  ];
  for(const [id,drop] of defects){const bad=structuredClone(artifact);bad.cases[id]=bad.cases[id].filter(o=>!drop(o));assert.ok(coverageIssues(bad).some(x=>x.id===id),id);assert.throws(()=>assertCourseCoverage(bad));assert.throws(()=>compileCourseCases(bad));}
  const reordered=structuredClone(artifact);const secondSave=reordered.cases[d].findLastIndex(o=>o[0]==='B'&&o[1]==='Save draft');reordered.cases[d].splice(secondSave,1);assert.ok(coverageIssues(reordered).some(x=>x.id===d));
  const sameTitle=structuredClone(artifact);sameTitle.cases[d].find(o=>o[0]==='F'&&o[2]==='B')[2]='A';assert.ok(coverageIssues(sameTitle).some(x=>x.id===d));
  const badGuard=structuredClone(artifact);delete badGuard.cases[g];assert.throws(()=>assertCourseCoverage(badGuard));

  const {checkCourseChallenge}=await import('../scripts/course-pilot/declarative-challenge-gate.mjs');
  const {createHash}=await import('node:crypto');
  const mk=(ar,changed=[])=>{
    const artifactSha256=createHash('sha256').update(JSON.stringify(ar)).digest('hex');
    const author={artifactSha256,model:'openai/gpt-oss-120b',contextSha256:'1'.repeat(64),receiptSha256:'2'.repeat(64)};
    const reviewer={schema:'course-challenge/v2',role:'quinn-qa',seat:'challenger',model:'qwen/qwen3.8-27b',contextSha256:'3'.repeat(64),receiptSha256:'4'.repeat(64),artifactSha256,verdict:changed.length?'CHANGES':'APPROVE',reviews:COURSE_IDS.map(id=>({id,verdict:changed.includes(id)?'CHANGES':'APPROVE',defects:changed.includes(id)?['Known contract requirement missing']:[],evidence:[0,1].map(index=>({index,operation:ar.cases[id][index],rationale:'Exact operation evidence for gate unit test'}))}))};
    return {author,reviewer};
  };
  const good=mk(artifact);assert.equal(checkCourseChallenge(artifact,good.author,good.reviewer).eligibleForIndependentExecutableGrade,true);
  const bad=structuredClone(artifact);bad.cases[a]=bad.cases[a].filter(o=>o[1]!=='Course pilot — not synced');bad.cases[d]=bad.cases[d].filter(o=>o[0]!=='N');
  const falseApproval=mk(bad);assert.throws(()=>checkCourseChallenge(bad,falseApproval.author,falseApproval.reviewer),/False approval/);
  const partial=mk(bad,[a]);assert.throws(()=>checkCourseChallenge(bad,partial.author,partial.reviewer,{calibration:true}),/missed known/);
  const caught=mk(bad,[a,d]);assert.equal(checkCourseChallenge(bad,caught.author,caught.reviewer,{calibration:true}).eligibleForIndependentExecutableGrade,false);
  const fabricated=structuredClone(good.reviewer);fabricated.reviews[0].evidence[0].operation=['X','I made this up'];assert.throws(()=>checkCourseChallenge(artifact,good.author,fabricated),/Fabricated/);
  assert.throws(()=>checkCourseChallenge(artifact,good.author,{...good.reviewer,model:good.author.model}),/Independent distinct/);
  assert.throws(()=>checkCourseChallenge(artifact,good.author,{...good.reviewer,artifactSha256:'0'.repeat(64)}),/provenance mismatch/);
  assert.throws(()=>checkCourseChallenge(artifact,good.author,good.reviewer,{calibration:true}),/genuinely deficient/);
});

test('native controller binds exact model, actual Read/Replace hashes, and no fallback',async()=>{
  const {runDirectSession}=await import('../scripts/course-pilot/native-adapter.mjs');
  const {executeBoundedTool}=await import('../scripts/course-pilot/bounded-tool.mjs');
  const {mkdtempSync,writeFileSync,readFileSync,rmSync,realpathSync}=await import('node:fs');
  const {tmpdir}=await import('node:os');const {join}=await import('node:path');const {createHash}=await import('node:crypto');
  const root=realpathSync(mkdtempSync(join(tmpdir(),'native-pilot-'))),p={root,read:['task.txt'],write:['task.txt']};
  const sha=x=>createHash('sha256').update(x).digest('hex'), model='openai/gpt-oss-120b';
  const call=(id,name,args)=>({type:'function',id,function:{name,arguments:JSON.stringify(args)}});
  const tools=(...tool_calls)=>({body:{model,usage:{total_tokens:100},choices:[{finish_reason:'tool_calls',message:{tool_calls}}]}});
  const stop=(text='done',m=model)=>({body:{model:m,usage:{total_tokens:100},choices:[{finish_reason:'stop',message:{content:text}}]}});
  const read=tools(call('r','Read',{path:'task.txt'}));
  const replace=tools(call('w','Replace',{path:'task.txt',sha256:sha('before'),old:'before',replacement:'after'}));
  const exec=(policy,req)=>({ok:true,result:executeBoundedTool(policy,req)});
  const run=(replies,extra={})=>{
    let i=0;return runDirectSession({model,prompt:'Synthetic exact artifact task',policy:p,allowWrite:true,execute:exec,transport:async body=>{
      assert.equal(body.model,model);assert.equal(body.reasoning_effort,'medium');assert.equal(body.temperature,0);assert.equal(body.tool_choice,i===0?'required':'auto');
      if(i===1&&replies[0]===read)assert.equal(JSON.parse(body.messages.at(-1).content).result.content,'before');
      if(i>=replies.length)throw Error('Unexpected retry or fallback');return replies[i++];
    },...extra});
  };
  try{
    writeFileSync(join(root,'task.txt'),'before');
    const passed=await run([read,replace,stop()]);
    assert.equal(passed.readCount,1);assert.equal(passed.writeCount,1);assert.equal(passed.totalTokens,300);
    assert.equal(passed.toolEvents[1].artifactSha256,sha('after'));assert.equal(readFileSync(join(root,'task.txt'),'utf8'),'after');
    writeFileSync(join(root,'task.txt'),'before');
    await assert.rejects(run([stop('done','proxy-alias')]),/identity/);
    await assert.rejects(run([stop()]),/required tool/);
    await assert.rejects(run([replace,stop()]),/without exact prior read/);
    await assert.rejects(run([read,replace,stop()],{allowWrite:false}),/Unapproved tool/);
    await assert.rejects(run([tools(call('r','Read',{path:'../secret'})),stop()]),/denied/);
    await assert.rejects(run([tools(call('r','Read',{path:'task.txt',secret:'x'})),stop()]),/Malformed/);
    await assert.rejects(run([read,tools(call('r','Read',{path:'task.txt'})),stop()]),/Unapproved tool/);
    await assert.rejects(run([read,replace,replace,stop()]),/Unapproved tool/);
    writeFileSync(join(root,'task.txt'),'before');
    await assert.rejects(run([read,replace,stop()],{execute:(policy,req)=>req.tool==='Read'?{ok:true,result:{path:req.path,content:'tampered',sha256:sha('before')}}:exec(policy,req)}),/hash mismatch/);
    let count=0;await assert.rejects(run([],{transport:async()=>{count++;throw Error('HTTP 429')}}),/429/);assert.equal(count,1);
    await assert.rejects(run([stop()],{model:'paid-model'}),/Invalid trusted/);
  }finally{rmSync(root,{recursive:true,force:true})}
});
