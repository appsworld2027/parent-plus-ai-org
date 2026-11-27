// Course pilot direct adapter tool primitive. No network, provider key, shell, or arbitrary program.
// A trusted controller must invoke this with an isolated low-privilege UID and an empty environment.
// The controller owns the task manifest. This module does not confer product/model eligibility.
import {constants,openSync,closeSync,fstatSync,lstatSync,realpathSync,readFileSync,writeFileSync,writeSync,ftruncateSync} from 'node:fs';
import {resolve,dirname,sep,isAbsolute} from 'node:path';
import {createHash} from 'node:crypto';
import {pathToFileURL} from 'node:url';
const hash=x=>createHash('sha256').update(x).digest('hex');
const keys=(x,expected)=>x&&typeof x==='object'&&!Array.isArray(x)&&Object.keys(x).sort().join()===expected;
const MAX=256*1024;
function makePolicy(policy) {
  if(!keys(policy,'read,root,write')||typeof policy.root!=='string'||!isAbsolute(policy.root)||realpathSync(policy.root)!==policy.root||!lstatSync(policy.root).isDirectory())throw Error('Untrusted workspace root');
  const valid=x=>typeof x==='string'&&x.length<=240&&!x.includes('\\')&&x.split('/').every(c=>c&&c!=='.'&&c!=='..')&&!isAbsolute(x)&&!x.includes('\0');
  for(const list of [policy.read,policy.write])if(!Array.isArray(list)||list.length>100||list.some(x=>!valid(x))||new Set(list).size!==list.length)throw Error('Invalid explicit task allowlist');
  function target(p,mode){
    if(!valid(p)||!(mode==='read'?policy.read:policy.write).includes(p))throw Error('Path denied by exact task allowlist');
    const full=resolve(policy.root,p);
    if(!full.startsWith(policy.root+sep)||realpathSync(dirname(full))!==dirname(full))throw Error('Path traversal or symlink parent denied');
    return full;
  }
  return {target};
}
function checkFd(fd){const s=fstatSync(fd);if(!s.isFile()||s.nlink!==1||s.size>MAX)throw Error('Nonregular, linked or oversized file');return s;}
function text(x,max=MAX){if(typeof x!=='string'||Buffer.byteLength(x)>max||x.includes('\0'))throw Error('Invalid bounded text');return x;}
function readUtf8(fd){checkFd(fd);const b=readFileSync(fd);const s=b.toString('utf8');if(!Buffer.from(s).equals(b))throw Error('Non-UTF8 file');return s;}
export function executeBoundedTool(policy,request){
  const {target}=makePolicy(policy);
  if(request?.tool==='Read'&&keys(request,'path,tool')){
    const fd=openSync(target(request.path,'read'),constants.O_RDONLY|constants.O_NOFOLLOW);
    try{const content=readUtf8(fd);return {path:request.path,content,sha256:hash(content)}}finally{closeSync(fd)}
  }
  if(request?.tool==='Replace'&&keys(request,'old,path,replacement,sha256,tool')){
    const full=target(request.path,'write');
    target(request.path,'read'); // cannot edit unseen/non-readable files
    const fd=openSync(full,constants.O_RDWR|constants.O_NOFOLLOW);
    try{
      const prev=readUtf8(fd),beforeSha256=hash(prev),old=text(request.old),replacement=text(request.replacement);
      if(request.sha256!==beforeSha256)throw Error('Stale exact artifact hash');
      if(!old.length||prev.split(old).length!==2)throw Error('Replacement anchor must be nonempty and unique');
      const next=text(prev.replace(old,replacement));if(next===prev)throw Error('No-op replacement denied');
      // Fixed positional write avoids the descriptor cursor left at EOF by readFileSync.
      const b=Buffer.from(next);ftruncateSync(fd,0);let offset=0;while(offset<b.length){const n=writeSync(fd,b,offset,b.length-offset,offset);if(n<=0)throw Error('Incomplete write');offset+=n;}ftruncateSync(fd,b.length);
      return {path:request.path,beforeSha256,afterSha256:hash(next)};
    }finally{closeSync(fd)}
  }
  if(request?.tool==='Create'&&keys(request,'content,path,tool')){
    const full=target(request.path,'write'),content=text(request.content);
    if(!content.length)throw Error('Empty new file denied');
    const fd=openSync(full,constants.O_WRONLY|constants.O_CREAT|constants.O_EXCL|constants.O_NOFOLLOW,0o600);
    try{writeFileSync(fd,content);return {path:request.path,sha256:hash(content)}}finally{closeSync(fd)}
  }
  throw Error('Unapproved tool or malformed request');
}
if(process.argv[1]&&import.meta.url===pathToFileURL(process.argv[1]).href){
  try{
    const input=JSON.parse(readFileSync(0,'utf8'));
    if(!keys(input,'policy,request'))throw Error('Invalid bounded tool envelope');
    const result=executeBoundedTool(input.policy,input.request);
    console.log(JSON.stringify({ok:true,result}));
  }catch(e){console.log(JSON.stringify({ok:false,error:String(e.message).slice(0,200)}));process.exitCode=1}
}
