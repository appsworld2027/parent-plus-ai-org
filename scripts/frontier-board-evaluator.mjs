// Independent behavioral check for isolated synthetic board artifacts.
import { execFile } from "node:child_process";
import { promisify } from "node:util";
import { mkdtemp, chmod, writeFile, readFile, rm } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { createHash,randomUUID } from "node:crypto";
const exec=promisify(execFile);
const LOCKED=new URL("../fixtures/frontier/locked-board.test.txt",import.meta.url);
const IMAGE=/^(?:docker\.io\/library\/)?node@sha256:[a-f0-9]{64}$/;
const LIMIT=256*1024,EXPECTED=12;
const digest=x=>createHash("sha256").update(x).digest("hex");
const asCount=(line,key)=> {
  const matches=[...line.matchAll(new RegExp("^# "+key+" (\\d+)$","gm"))];
  return matches.length===1?Number(matches[0][1]):null;
};
/**
 * Code must come from bounded intake. The controller supplies a locally present
 * digest-pinned Node image, not the candidate. This module never mounts a repo,
 * secrets, Docker socket or writable host paths; the worker has no network.
 * Behavioral test evidence is not independent role certification.
 */
export async function evaluateBoardCode(code,{image}={}) {
  if(typeof code!=="string"||!code.trim()||Buffer.byteLength(code)>24000||code.includes("\u0000"))throw Error("invalid board artifact");
  if(typeof image!=="string"||!IMAGE.test(image))throw Error("digest-pinned Node image required");
  const locked=await readFile(LOCKED,"utf8");
  const dir=await mkdtemp(join(tmpdir(),"frontier-board-"));
  const name="frontier-board-"+randomUUID();
  const base={schema:1,kind:"synthetic-locked-board-behavior",candidateHash:digest(code),lockedTestHash:digest(locked),image,qualified:false};
  try {
    await chmod(dir,0o755);
    await writeFile(join(dir,"board.mjs"),code,{mode:0o444});
    await writeFile(join(dir,"locked.test.mjs"),locked,{mode:0o444});
    const args=["run","--name",name,"--rm","--pull","never","--network","none","--read-only",
      "--cap-drop","ALL","--security-opt","no-new-privileges","--user","65534:65534",
      "--pids-limit","64","--memory","128m","--cpus","0.5","--tmpfs","/tmp:rw,noexec,nosuid,size=8m",
      "--mount","type=bind,src="+dir+",dst=/work,readonly","--workdir","/work",image,
      "node","--test","--test-reporter=tap","/work/locked.test.mjs"];
    let stdout="",stderr="",exitCode=null;
    try {const r=await exec("docker",args,{timeout:30000,maxBuffer:LIMIT});stdout=r.stdout;stderr=r.stderr;exitCode=0;}
    catch(e){stdout=typeof e.stdout==="string"?e.stdout:"";stderr=typeof e.stderr==="string"?e.stderr:"";exitCode=Number.isInteger(e.code)?e.code:null;}
    const counts=Object.fromEntries(["tests","pass","fail","cancelled","skipped","todo"].map(k=>[k,asCount(stdout,k)]));
    // Missing/duplicate summary, no tests, skip/todo, infrastructure error and
    // timeouts cannot produce pass. Raw output is not a trusted statement of intent.
    const complete=counts.tests===EXPECTED&&counts.pass+counts.fail===EXPECTED&&
      [counts.pass,counts.fail].every(Number.isSafeInteger)&&counts.cancelled===0&&counts.skipped===0&&counts.todo===0;
    const status=complete&&exitCode===0&&counts.pass===EXPECTED&&counts.fail===0?"behavior-pass":
      complete&&exitCode===1&&counts.fail>0?"behavior-fail":"infrastructure-or-incomplete";
    return {...base,status,counts,exitCode,stdoutHash:digest(stdout),stderrHash:digest(stderr)};
  } finally {
    try{await exec("docker",["rm","-f",name],{timeout:5000,maxBuffer:4096});}catch{}
    await rm(dir,{recursive:true,force:true});
  }
}
