// Trusted strategy selection; not a provider or billing authorization mechanism.
import {readFileSync} from 'node:fs';
const load=name=>JSON.parse(readFileSync(new URL('../governance/'+name,import.meta.url),'utf8'));
export const EXECUTION_STRATEGIES=load('EXECUTION_STRATEGIES.json');
const authority=load('AUTONOMY_POLICY.json');
const required=['lockedAcceptance','independentReview','regressionTests','securityChecks','evidenceBoundCheckpoint','founderReleaseGate','noPaidFallback'];
const packetKeys={inputTokenTarget:[1,100000],completionTokenLimit:[1,32000],maxFiles:[1,30],maxToolCalls:[1,100],maxWallSeconds:[1,3600],repairRounds:[0,10]};
const workerKeys={maxTurns:[1,150],wallSeconds:[1,5400],outputTokenCap:[1,16000],embeddedReviewOutputTokenCap:[1,16000]};
const quotaKeys={maxInlineRetrySeconds:[0,120],maxTransientRetries:[0,3],interPacketDelaySeconds:[0,120]};
const validNum=(v,[min,max])=>Number.isSafeInteger(v)&&v>=min&&v<=max;
function validateNums(obj,keys,label,partial=false){
 if(!obj||typeof obj!=='object'||Array.isArray(obj))throw Error('Invalid '+label);
 for(const [k,range] of Object.entries(keys))if(!partial||Object.hasOwn(obj,k))if(!validNum(obj[k],range))throw Error('Invalid '+label+'.'+k);
}
export function validateExecutionStrategies(config){
 if(config?.schema!=='ai-org-execution-strategies/v1')throw Error('Unknown strategy schema');
 if(required.some(k=>config.sharedQuality?.[k]!==true))throw Error('Mandatory quality gate cannot be relaxed');
 if(config.defaults?.free!=='free-packeted'||config.defaults?.claude!=='frontier-loop'||config.defaults?.codex!=='frontier-loop')throw Error('Engine/profile boundary changed');
 const F=config.profiles?.['free-packeted'],P=config.profiles?.['frontier-loop'];
 if(!F||!P||F.enabled!==true||typeof P.enabled!=='boolean'||F.engines?.join()!=='free'||P.engines?.join()!=='claude,codex'||F.mode!=='bounded-packets'||P.mode!=='iterative-product-loop'||F.contextMode!=='fresh-per-packet'||P.contextMode!=='persistent-with-compaction'||F.requiresExplicitSpendApproval!==false||P.requiresExplicitSpendApproval!==true)throw Error('Invalid engine strategy profile');
 for(const [name,p] of Object.entries(config.profiles)){
  validateNums(p.packet,packetKeys,name+'.packet');validateNums(p.worker,workerKeys,name+'.worker');validateNums(p.quota,quotaKeys,name+'.quota');
  if(p.quota.pauseOnExhaustion!==true||p.quota.retryAfterRequired!==true)throw Error('Quota exhaustion must pause and respect provider');
  for(const [task,over] of Object.entries(p.taskOverrides??{})){if(!['planning','authoring','review','integration'].includes(task)||Object.keys(over).some(k=>!Object.hasOwn(packetKeys,k)))throw Error('Unknown task override');validateNums(over,packetKeys,'task override',true);}
  for(const [model,over] of Object.entries(p.modelAdjustments??{})){if(!model||Object.keys(over).some(k=>!['completionTokenLimit','reasoningEffort'].includes(k))||!validNum(over.completionTokenLimit,packetKeys.completionTokenLimit)||!['low','medium','high','provider-default'].includes(over.reasoningEffort))throw Error('Invalid model tuning');}
 }
 if(F.worker.outputTokenCap>=1000||F.worker.embeddedReviewOutputTokenCap>=1000||F.packet.inputTokenTarget>8000||F.packet.completionTokenLimit>3000||F.quota.maxTransientRetries>1)throw Error('Free limits exceed bounded policy');
 if(!config.stageClasses||Object.values(config.stageClasses).some(v=>!['planning','authoring','review','integration'].includes(v)))throw Error('Unknown stage class');
 return true;
}
validateExecutionStrategies(EXECUTION_STRATEGIES);
export function selectExecutionStrategy({engine,stage,model='',config=EXECUTION_STRATEGIES,policy=authority,spendAuthorization=null}={}){
 validateExecutionStrategies(config);
 const execution=policy?.execution;
 if(!Array.isArray(execution?.allowedEngines)||!execution.allowedEngines.includes(engine)||execution.allowPaidFallback!==false)throw Error('Engine not authorized by canonical policy');
 const id=config.defaults[engine],profile=config.profiles[id];
 if(!profile?.enabled||!profile.engines.includes(engine))throw Error('Strategy profile disabled or incompatible');
 if(engine!=='free'){
  // A future paid worker needs independently approved policy, runtime and budget.
  // A caller's label, model adjustment or profile cannot authorize spend.
  if(execution.providerPolicy?.mode==='free-only'||spendAuthorization?.trustedRuntimeQualified!==true||spendAuthorization?.founderApproved!==true||!Number.isFinite(spendAuthorization?.budgetUsd)||spendAuthorization.budgetUsd<=0||typeof spendAuthorization?.approvalRef!=='string'||!spendAuthorization.approvalRef.startsWith('https://github.com/appsworld2027/'))throw Error('Paid strategy is not authorized for execution');
 }
 const taskClass=config.stageClasses[stage];if(!taskClass)throw Error('Unknown working stage');
 const modelKey=typeof model==='string'?model.split('@')[0]:'';
 const packet={...profile.packet,...(profile.taskOverrides?.[taskClass]??{}),...(profile.modelAdjustments?.[modelKey]??{})};
 validateNums(packet,packetKeys,'effective packet');
 if(engine==='free'&&(packet.inputTokenTarget>8000||packet.completionTokenLimit>3000))throw Error('Free effective packet exceeds bounds');
 return {id,engine,taskClass,mode:profile.mode,contextMode:profile.contextMode,progressMode:profile.progressMode,packet,worker:{...profile.worker},quota:{...profile.quota},quality:{...config.sharedQuality},requiresExplicitSpendApproval:profile.requiresExplicitSpendApproval};
}
export function strategyPrompt(s){
 if(!s)throw Error('Missing strategy');
 const p=s.packet;
 const method=s.mode==='bounded-packets'
  ? 'Work one dependency-ready packet at a time. Load only the exact source excerpts and acceptance obligations needed; start a fresh context for each packet when the controller supports it. Preserve verified evidence hashes; resume without recomputing accepted work. Stop when blocked; never bypass a locked quality check.'
  : 'Use an iterative feature loop: inspect source and requirements, implement a coherent increment, execute acceptance checks, get independent critique, repair only failed requirements, checkpoint and compact context before proceeding.';
 return ['## Selected execution strategy: '+s.id+' ('+s.taskClass+')',method,
 'Packet targets (not measured usage): '+p.inputTokenTarget+' input tokens; '+p.completionTokenLimit+' completion tokens; '+p.maxFiles+' relevant files; '+p.maxToolCalls+' tool calls; '+p.maxWallSeconds+' seconds; '+p.repairRounds+' bounded repair rounds.',
 'All profiles: preserve the locked contract and evidence, run regression/security checks, insist on independent review and founder release gates. Never enable a paid fallback.'].join('\n');
}
