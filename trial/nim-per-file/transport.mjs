// Generic bounded, checkpointed per-file transport. Never modifies model bytes.
import {mkdirSync,existsSync,openSync,writeFileSync,readFileSync,fsyncSync,closeSync,constants} from 'node:fs';
import {join} from 'node:path';
import {createHash} from 'node:crypto';
export const sha=x=>createHash('sha256').update(x).digest('hex');
const obj=x=>x&&typeof x==='object'&&!Array.isArray(x);
const validPath=x=>typeof x==='string'&&/^[-a-zA-Z0-9_]+(?:\.test)?\.(json|md|html|mjs|sql)$/.test(x);
function saveOnce(path,value,root){
 const fd=openSync(path,'wx',0o600);
 try{writeFileSync(fd,value);fsyncSync(fd)}finally{closeSync(fd)}
 const d=openSync(root,constants.O_RDONLY|constants.O_DIRECTORY);try{fsyncSync(d)}finally{closeSync(d)}
}
function contentOK(content,format){
 if(typeof content!=='string'||!content.trim()||Buffer.byteLength(content)>24000||content.includes('\u0000'))return false;
 if(format==='json_object'){try{return !!obj(JSON.parse(content))}catch{return false}}
 return format==='text';
}
export async function materializeFiles({root,requiredPaths,steps,model,outputBudget,scope,buildPrompt,invoke}){
 if(!Array.isArray(requiredPaths)||!requiredPaths.length||requiredPaths.length>4||!requiredPaths.every(validPath)||
   new Set(requiredPaths).size!==requiredPaths.length||!Array.isArray(steps)||steps.length!==requiredPaths.length||
   !steps.every((s,i)=>obj(s)&&s.path===requiredPaths[i]&&s.format===(s.path.endsWith('.json')?'json_object':'text')&&Number.isSafeInteger(s.maxTokens)&&s.maxTokens>=64&&s.maxTokens<=3600)||
   !Number.isSafeInteger(outputBudget)||steps.reduce((n,s)=>n+s.maxTokens,0)>outputBudget||typeof model!=='string'||!model||typeof scope!=='string'||!scope)throw Error('invalid per-file strategy');
 mkdirSync(root,{recursive:true,mode:0o700});
 const files=[],receipts=[];
 for(const [i,step] of steps.entries()){
  const prompt=buildPrompt(step,files);
  if(typeof prompt!=='string'||!prompt.trim()||Buffer.byteLength(prompt)>40000)throw Error('prompt-boundary');
  const metadata={schema:1,scope,model,path:step.path,format:step.format,maxTokens:step.maxTokens,promptHash:sha(prompt),priorHashes:files.map(f=>({path:f.path,hash:sha(f.content)}))};
  const prefix=join(root,String(i+1).padStart(2,'0'));
  const attempted=prefix+'.attempt.json',receiptPath=prefix+'.receipt.json',rawPath=prefix+'.raw.txt';
  let receipt,content;
  if(existsSync(receiptPath)){
   receipt=JSON.parse(readFileSync(receiptPath,'utf8'));
   if(Object.entries(metadata).some(([k,v])=>JSON.stringify(receipt[k])!==JSON.stringify(v))||receipt.status!=='accepted')throw Error('prior-attempt-held');
   content=readFileSync(rawPath,'utf8');
   if(sha(content)!==receipt.rawHash||!contentOK(content,step.format)||receipt.reportedModel!==model||receipt.httpStatus!==200||receipt.finishReason!=='stop')throw Error('checkpoint-integrity');
  }else{
   if(existsSync(attempted))throw Error('incomplete-attempt-held');
   saveOnce(attempted,JSON.stringify(metadata)+'\n',root);
   let response;
   try{response=await invoke({model,prompt,format:step.format,maxTokens:step.maxTokens})}catch{response={failure:'transport-or-timeout'}}
   receipt={...metadata,status:'rejected',httpStatus:response?.httpStatus??null,reportedModel:response?.reportedModel??null,finishReason:response?.finishReason??null,responseHash:response?.responseHash??null,usage:response?.usage??null,failure:response?.failure??null};
   content=response?.content;
   if(typeof content==='string'&&Buffer.byteLength(content)<=64000){saveOnce(rawPath,content,root);receipt.rawHash=sha(content)}
   if(!receipt.failure&&receipt.httpStatus===200&&receipt.reportedModel===model&&receipt.finishReason==='stop'&&contentOK(content,step.format))receipt.status='accepted';
   else receipt.failure=receipt.failure||'identity-finish-or-format';
   saveOnce(receiptPath,JSON.stringify(receipt,null,2)+'\n',root);
   if(receipt.status!=='accepted')throw Error('provider-or-artifact-blocked:'+receipt.failure);
  }
  files.push({path:step.path,content});receipts.push(receipt);
 }
 return {files,receipts};
}
