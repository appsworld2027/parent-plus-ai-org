// Isolated behavior screen for standalone synthetic Iris HTML.
// Never execute candidate markup in a signed-in human browser or mount product/credentials.
import { execFile } from 'node:child_process';
import { promisify } from 'node:util';
import { mkdtemp,mkdir,writeFile,readFile,rm } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { fileURLToPath } from 'node:url';
import { createHash,randomUUID } from 'node:crypto';
const exec=promisify(execFile), hash=x=>createHash('sha256').update(x).digest('hex');
const seccomp=fileURLToPath(new URL('../fixtures/frontier/iris-runner/seccomp_profile.json',import.meta.url));
export const IRIS_CHECKS=Object.freeze(['I01-loading-empty','I02-create-confirmation','I03-edit-version','I04-invalid','I05-stale-recovery','I06-denied','I07-offline','I08-load-retry','I09-narrow-keyboard','I10-no-external-request']);
const imagePattern=/^sha256:[a-f0-9]{64}$/;
const BASE_SECCOMP_SHA='cc3e61cabda6bbc1e53e54d27ba4d55a9d3be829b6dd1a596f4a7b31b1cc7849';
// Chromium chroots its zygote inside an unprivileged child user namespace.
// Docker resolves the upstream CAP_SYS_CHROOT inclusion at container start,
// when we intentionally have no capabilities. Permit only this syscall;
// the kernel still requires CAP_SYS_CHROOT in the caller's own namespace.
export function deriveIrisSeccompProfile(raw){
  if(hash(raw)!==BASE_SECCOMP_SHA)throw Error('sandbox profile digest mismatch');
  const base=JSON.parse(raw);
  if(base.defaultAction!=='SCMP_ACT_ERRNO')throw Error('unexpected sandbox default');
  const rules=base.syscalls.filter(r=>r.names.includes('chroot'));
  if(rules.length!==1||rules[0].action!=='SCMP_ACT_ALLOW'||rules[0].includes?.caps?.join()!=='CAP_SYS_CHROOT')throw Error('unexpected upstream chroot rule');
  base.syscalls.push({names:['chroot'],action:'SCMP_ACT_ALLOW',args:[]});
  return JSON.stringify(base);
}
const obj=x=>x&&typeof x==='object'&&!Array.isArray(x);
export function validateIrisReceipt(raw,exitCode){
  try{
    const x=JSON.parse(raw.trim());
    if(!obj(x)||Object.keys(x).length!==4||x.schema!==1||x.browserSandbox!==true||!obj(x.checks)||Object.keys(x.checks).length!==IRIS_CHECKS.length||
       !IRIS_CHECKS.every(id=>Object.hasOwn(x.checks,id)&&obj(x.checks[id])&&typeof x.checks[id].pass==='boolean'&&
        (x.checks[id].pass===true?Object.keys(x.checks[id]).length===1:Object.keys(x.checks[id]).length===2&&typeof x.checks[id].reason==='string'&&x.checks[id].reason.length<=200))||
       !Number.isSafeInteger(x.networkAttempts)||x.networkAttempts<0||x.checks['I10-no-external-request'].pass!==(x.networkAttempts===0))throw Error('invalid receipt');
    const passed=IRIS_CHECKS.filter(id=>x.checks[id].pass===true).length,status=passed===IRIS_CHECKS.length&&exitCode===0?'behavior-pass':
      passed<IRIS_CHECKS.length&&exitCode===1?'behavior-fail':'infrastructure-or-incomplete';
    return {status,passed,expected:IRIS_CHECKS.length,checks:x.checks,networkAttempts:x.networkAttempts};
  }catch{return {status:'infrastructure-or-incomplete',passed:0,expected:IRIS_CHECKS.length,checks:{}}}
}
export async function evaluateIrisHtml(html,{image}={}){
  if(typeof html!=='string'||!html.trim()||Buffer.byteLength(html)>24000||html.includes('\u0000'))throw Error('invalid HTML artifact');
  if(typeof image!=='string'||!imagePattern.test(image))throw Error('controller-built immutable local image ID required');
  const profile=deriveIrisSeccompProfile(await readFile(seccomp));
  const dir=await mkdtemp(join(tmpdir(),'frontier-iris-')),name='frontier-iris-'+randomUUID();
  let stdout='',stderr='',exitCode=null;
  try{
    const candidateDir=join(dir,'candidate'),profileFile=join(dir,'seccomp.json');
    await mkdir(candidateDir,{mode:0o755});
    await writeFile(join(candidateDir,'board.html'),html,{mode:0o444});
    await writeFile(profileFile,profile,{mode:0o600,flag:'wx'});
    // Controller-selected seccomp profile permits Chromium user namespaces, but
    // the inner Chromium sandbox is requested and the outer container has no network,
    // credentials, host services, repo mount, elevated caps or writable host paths.
    const args=['run','--name',name,'--rm','--init','--pull','never','--network','none','--read-only','--cap-drop','ALL',
      '--security-opt','no-new-privileges','--security-opt','seccomp='+profileFile,'--user','1000:1000','--pids-limit','256',
      '--memory','768m','--cpus','1.5','--shm-size','128m','--tmpfs','/tmp:rw,nosuid,nodev,noexec,size=128m',
      '--env','HOME=/tmp','--env','XDG_CACHE_HOME=/tmp/.cache','--mount','type=bind,src='+candidateDir+',dst=/work,readonly',
      image,'node','/opt/iris/runner.mjs'];
    try{const r=await exec('docker',args,{timeout:120000,maxBuffer:256*1024});stdout=r.stdout;stderr=r.stderr;exitCode=0}
    catch(e){stdout=typeof e.stdout==='string'?e.stdout:'';stderr=typeof e.stderr==='string'?e.stderr:'';exitCode=Number.isInteger(e.code)?e.code:null}
    const result=validateIrisReceipt(stdout,exitCode);
    let diagnostic=null;
    if(result.status==='infrastructure-or-incomplete'){
      diagnostic='incomplete-receipt';
      try{
        const receipt=JSON.parse(stdout);
        const allowed=['sandbox-unavailable','sandbox-boundary-violation','browser-runtime-unavailable','runtime-filesystem','browser-launch-failure','controller-failure'];
        if(exitCode===2&&receipt.schema===1&&receipt.infrastructureFailure===true&&receipt.browserSandboxRequested===true&&allowed.includes(receipt.failure))diagnostic=receipt.failure;
      }catch{}
      if(exitCode===125)diagnostic='container-start-failure';
    }
    return {schema:1,kind:'synthetic-browser-design-screen',candidateHash:hash(html),image,sandboxProfileHash:hash(profile),stdoutHash:hash(stdout),stderrHash:hash(stderr),exitCode,
      ...result,qualification:false,productionReady:false,diagnostic};
  }finally{
    try{await exec('docker',['rm','-f',name],{timeout:5000,maxBuffer:4096})}catch{}
    await rm(dir,{recursive:true,force:true});
  }
}
