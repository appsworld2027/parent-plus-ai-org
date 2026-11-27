// Synthetic calibration of the exact canonical adapter. SMOKE is deterministic, never actual model proof.
import {createHash} from 'node:crypto';
import {execFileSync} from 'node:child_process';
import {mkdtempSync,chmodSync,writeFileSync,readFileSync,realpathSync,mkdirSync} from 'node:fs';
import {join} from 'node:path';
import {runDirectSession,isolatedBoundedExecutor,nativeGroqTransport,DIRECT_MODELS} from '../../scripts/course-pilot/native-adapter.mjs';
const model=process.env.ROUTE_MODEL,mode=process.env.QUAL_MODE;
if(!DIRECT_MODELS.includes(model)||!['smoke','actual'].includes(mode))throw Error('Trusted qualification configuration required');
const sha=x=>createHash('sha256').update(x).digest('hex'),root=realpathSync(mkdtempSync('/tmp/canonical-course-native-'));
chmodSync(root,0o755);
const path='course-policy.mjs',file=join(root,path);
const source="export function decide(x) {\n  if (!x.title.trim()) return {outcome:'INVALID',writes:0};\n  if (x.actorOwner !== x.courseOwner || x.role !== 'coach') return {outcome:'DENIED',writes:0};\n  if (x.requestKnown) return {outcome:'REPLAY',writes:0};\n  if (x.expectedRevision !== x.currentRevision) return {outcome:'STALE',writes:0};\n  return {outcome:'CREATED',writes:1};\n}\n";
writeFileSync(file,source,{mode:0o600});
execFileSync('/usr/bin/sudo',['-n','chown','trialagent:trialagent',file],{env:{PATH:'/usr/bin:/bin'}});
const policy={root,read:[path],write:[path]},helper='/opt/course-native-qualification/bounded-tool.mjs';
const execute=isolatedBoundedExecutor({node:process.execPath,helper});
const r=()=>execute(policy,{tool:'Read',path});
const baseline=r();
if(!baseline.ok||baseline.result.sha256!==sha(source))throw Error('Actual UID isolated Read failed');
const rejected=(label,req)=>{const a=execute(policy,req);if(a.ok)throw Error('Negative control accepted '+label);return label};
const neg=[rejected('traversal',{tool:'Read',path:'../course-policy.mjs'}),rejected('absolute',{tool:'Read',path:'/etc/passwd'}),rejected('stale',{tool:'Replace',path,sha256:'0'.repeat(64),old:'export',replacement:'oops'}),rejected('nonunique',{tool:'Replace',path,sha256:sha(source),old:'x',replacement:'oops'}),rejected('outside-write',{tool:'Create',path:'outside.mjs',content:'oops'})];
if(r().result.sha256!==sha(source))throw Error('Negative controls changed baseline');
const out=join(process.env.RUNNER_TEMP,'native-qualified');mkdirSync(out,{recursive:true});
const prompt='Repair synthetic course-policy.mjs. Policy precedence: first deny if actor and owner mismatch or role not coach, even with blank title. Then blank INVALID, then known request REPLAY, then stale revision STALE, otherwise CREATED. Preserve exported decide(x) and outcome/write field shape. Use exact Read then Replace with hash and unique old text. Exactly one write. No new files, no other changes or APIs. After actual tool success respond briefly.';
let index=0;
const deterministic=async body=>{
 const old="  if (!x.title.trim()) return {outcome:'INVALID',writes:0};\n  if (x.actorOwner !== x.courseOwner || x.role !== 'coach') return {outcome:'DENIED',writes:0};";
 const replacement=old.split('\n').reverse().join('\n'),calls=[{name:'Read',arguments:JSON.stringify({path})},{name:'Replace',arguments:JSON.stringify({path,sha256:sha(source),old,replacement})}];
 const i=index++,message=i<2?{tool_calls:[{id:'smoke-'+i,type:'function',function:calls[i]}]}:{content:'Deterministic adapter calibration'};
 if(i>2)throw Error('Unexpected mock call');return {body:{model,usage:{total_tokens:100},choices:[{finish_reason:i<2?'tool_calls':'stop',message}]}};
};
let session;
try{
 session=await runDirectSession({model,prompt,policy,allowWrite:true,execute,transport:mode==='smoke'?deterministic:body=>nativeGroqTransport(body,process.env.GROQ_API_KEY),maxRounds:5,completionLimit:2000,tokenBudget:16000});
}catch(e){writeFileSync(join(out,'provider-status.json'),JSON.stringify({mode,model,status:e.status??null,rate:e.rate??null,error:e.message,retried:false},null,2));throw e}
if(session.readCount!==1||session.writeCount!==1||session.toolEvents.length!==2||session.toolEvents[0].tool!=='Read'||session.toolEvents[1].tool!=='Replace')throw Error('Expected actual exact Read then Replace');
const candidate=r();if(!candidate.ok||candidate.result.sha256!==session.toolEvents[1].artifactSha256||candidate.result.sha256===sha(source))throw Error('Final artifact mismatch');
const record={schema:'course-native-adapter-qualification-candidate/v1',mode,model,syntheticOnly:true,roleAdmission:false,adapterQualification:false,providerIdentityVerified:mode==='actual',baselineSha256:sha(source),candidateSha256:candidate.result.sha256,adapterSha256:sha(readFileSync(new URL('../../scripts/course-pilot/native-adapter.mjs',import.meta.url))),helperSha256:sha(readFileSync(helper)),negativeControls:neg,session,toolEvents:[{tool:'Read',path,hash:session.toolEvents[0].artifactSha256},{tool:'Replace',path,beforeSha256:sha(source),afterSha256:candidate.result.sha256}],receipt:session.events,awaitingIndependentExecution:true};
writeFileSync(join(out,'candidate.mjs'),candidate.result.content);writeFileSync(join(out,'receipt.json'),JSON.stringify(record,null,2));console.log(JSON.stringify({...record,session:{...session,final:undefined}},null,2));
