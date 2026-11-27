// Fresh no-key runner. Candidate is untrusted code executed in a networkless low-privilege namespace.
import {strict as assert} from 'node:assert';
import {createHash} from 'node:crypto';
import {readFileSync} from 'node:fs';
import {pathToFileURL} from 'node:url';
const dir=process.argv[2],receipt=JSON.parse(readFileSync(dir+'/receipt.json','utf8')),bytes=readFileSync(dir+'/candidate.mjs');
const hash=createHash('sha256').update(bytes).digest('hex');
assert.equal(receipt.candidateSha256,hash);
assert.equal(receipt.syntheticOnly,true);
assert.equal(receipt.schema,'course-native-adapter-qualification-candidate/v1');
assert(['smoke','actual'].includes(receipt.mode));
assert.equal(receipt.providerIdentityVerified,receipt.mode==='actual');
assert.equal(receipt.session.readCount,1);assert.equal(receipt.session.writeCount,1);
assert.equal(receipt.session.model,receipt.model);
assert.equal(receipt.adapterQualification,false);
assert.equal(receipt.toolEvents.length,2);
assert.equal(receipt.toolEvents[0].tool,'Read');
assert.equal(receipt.toolEvents[1].tool,'Replace');
assert.equal(receipt.toolEvents[0].hash,receipt.baselineSha256);
assert.equal(receipt.toolEvents[1].beforeSha256,receipt.baselineSha256);
assert.equal(receipt.toolEvents[1].afterSha256,hash);
assert.equal(receipt.negativeControls.length,5);
assert.notEqual(receipt.baselineSha256,hash);
assert(receipt.receipt.every(r=>r.model===receipt.model));
const {decide}=await import(pathToFileURL(dir+'/candidate.mjs'));
assert.equal(typeof decide,'function');
const base={actorOwner:'A',courseOwner:'A',role:'coach',title:'Demo',expectedRevision:1,currentRevision:1,requestKnown:false};
const cases=[
  ['create',{},'CREATED',1],
  ['owner denial',{courseOwner:'B'},'DENIED',0],
  ['parent denial',{role:'parent'},'DENIED',0],
  ['deny before blank',{title:' ',courseOwner:'B'},'DENIED',0],
  ['deny before blank parent',{title:'',role:'parent'},'DENIED',0],
  ['blank',{title:' '},'INVALID',0],
  ['blank before replay',{title:'',requestKnown:true},'INVALID',0],
  ['replay',{requestKnown:true},'REPLAY',0],
  ['replay before stale',{requestKnown:true,expectedRevision:2},'REPLAY',0],
  ['stale',{expectedRevision:2},'STALE',0],
  ['reverse ownership',{actorOwner:'B'},'DENIED',0],
  ['other coach',{actorOwner:'B',courseOwner:'B'},'CREATED',1]
];
for(const [id,change,outcome,writes] of cases){const x=Object.freeze({...base,...change});assert.deepEqual(decide(x),{outcome,writes},id)}
console.log(JSON.stringify({schema:'canonical-native-independent-grade/v1',mode:receipt.mode,actualProviderIdentity:receipt.providerIdentityVerified,adapterSha256:receipt.adapterSha256,helperSha256:receipt.helperSha256,model:receipt.model,artifactSha256:hash,casesPassed:cases.length,casesTotal:cases.length,negativeControlCount:receipt.negativeControls.length,passed:true,syntheticOnly:true,roleAdmission:false,adapterQualification:false}));
