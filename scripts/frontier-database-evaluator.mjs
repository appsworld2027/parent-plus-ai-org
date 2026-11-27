// Independent synthetic database behavior verifier. Not a production database connector,
// full criterion score, or proof of candidate-authored SQL assertions / recovery notes.
import {createHash,randomUUID} from 'node:crypto';
import {execFile} from 'node:child_process';
import {promisify} from 'node:util';
import {mkdtemp,chmod,writeFile,readFile,rm} from 'node:fs/promises';
import {tmpdir} from 'node:os';
import {join} from 'node:path';
const exec=promisify(execFile);
const hash=s=>createHash('sha256').update(s).digest('hex');
const ids=Array.from({length:14},(_,i)=>'DB'+String(i+1).padStart(2,'0'));
const pinned=/^(?:docker\.io\/library\/)?postgres@sha256:[a-f0-9]{64}$/;
const runScript=`
export PGHOST=/tmp PGPORT=5432 PGDATABASE=postgres
initdb -D /tmp/db -U postgres -A trust --no-locale >/tmp/init.log 2>&1
pg_ctl -D /tmp/db -l /tmp/server.log -o "-k /tmp -h '' -c fsync=off -c statement_timeout=4000 -c lock_timeout=1000" -w start >/tmp/start.log 2>&1
psql -X -q -U postgres -v ON_ERROR_STOP=1 -f /work/bootstrap.sql >/tmp/bootstrap.log 2>&1
if ! psql -X -q -U pilot_owner -v ON_ERROR_STOP=1 -f /work/migration.sql >/tmp/migration.log 2>&1; then
  echo "migration failed" >&2; tail -c 2048 /tmp/migration.log >&2; exit 12
fi
psql -X -qAt -U pilot_client -v ON_ERROR_STOP=1 -f /work/locked.sql
# Separate concurrent client sessions: first holds transaction open; the second
# must wait or safely reconcile. Neither runs with elevated privileges.
psql -X -qAt -U pilot_client -v ON_ERROR_STOP=1 -c "SET pilot.tenant='race'; BEGIN; SELECT pilot.save_reminder('race','r','Concurrent',0,'shared') = jsonb_build_object('ok',true,'record',jsonb_build_object('id','r','title','Concurrent','version',1)); SELECT pg_sleep(0.3); COMMIT" >/tmp/race1 &
a=$!
psql -X -qAt -U pilot_client -v ON_ERROR_STOP=1 -c "SET pilot.tenant='race'; BEGIN; SELECT pilot.save_reminder('race','r','Concurrent',0,'shared') = jsonb_build_object('ok',true,'record',jsonb_build_object('id','r','title','Concurrent','version',1)); SELECT pg_sleep(0.3); COMMIT" >/tmp/race2 &
b=$!
wait "$a"; wait "$b"
grep -qx t /tmp/race1
grep -qx t /tmp/race2
psql -X -qAt -U pilot_client -v ON_ERROR_STOP=1 -c "SET pilot.tenant='race'; SELECT count(*)=1 AND min(version)=1 FROM pilot.reminders WHERE id='r'" | grep -qx t
echo LOCKED:DB13
psql -X -qAt -U pilot_client -v ON_ERROR_STOP=1 -c "SET pilot.tenant='race'; BEGIN; SELECT CASE WHEN r->>'ok'='true' THEN 'winner' ELSE r->>'code' END FROM (SELECT pilot.save_reminder('race','r','First',1,'first') AS r) s; SELECT pg_sleep(0.3); COMMIT" >/tmp/update1 &
a=$!
psql -X -qAt -U pilot_client -v ON_ERROR_STOP=1 -c "SET pilot.tenant='race'; BEGIN; SELECT CASE WHEN r->>'ok'='true' THEN 'winner' ELSE r->>'code' END FROM (SELECT pilot.save_reminder('race','r','Second',1,'second') AS r) s; SELECT pg_sleep(0.3); COMMIT" >/tmp/update2 &
b=$!
wait "$a"; wait "$b"
test "$(cat /tmp/update1 /tmp/update2 | grep -E '^(winner|stale)$' | sort | tr '\\n' ' ')" = 'stale winner '
psql -X -qAt -U pilot_client -v ON_ERROR_STOP=1 -c "SET pilot.tenant='race'; SELECT count(*)=1 AND min(version)=2 AND min(title) IN ('First','Second') FROM pilot.reminders WHERE id='r'" | grep -qx t
echo LOCKED:DB14
`;
export async function evaluateDatabaseMigration(sql,{image}={}){
  if(typeof image!=='string'||!pinned.test(image)) throw Error('digest-pinned PostgreSQL image required');
  // The bounded plain-SQL artifact may not include psql metacommands, shell escapes,
  // includes, or client-side commands. Execution remains isolated even with hostile SQL.
  if(typeof sql!=='string'||!sql.trim()||Buffer.byteLength(sql)>24000||sql.includes('\u0000')||sql.includes('\\'))
    throw Error('invalid plain SQL migration artifact');
  const [bootstrap,locked]=await Promise.all(['bootstrap.sql','locked.sql'].map(n=>readFile(new URL('../fixtures/frontier/database/'+n,import.meta.url),'utf8')));
  const dir=await mkdtemp(join(tmpdir(),'frontier-db-'));
  const name='frontier-db-'+randomUUID();
  let stdout='',stderr='',exitCode=null;
  try{
    await chmod(dir,0o755);
    for(const [file,content] of [['bootstrap.sql',bootstrap],['locked.sql',locked],['migration.sql',sql]])
      await writeFile(join(dir,file),content,{mode:0o444});
    const args=['run','--name',name,'--rm','--pull','never','--network','none','--read-only',
      '--cap-drop','ALL','--security-opt','no-new-privileges','--user','postgres','--pids-limit','64',
      '--memory','256m','--cpus','1','--tmpfs','/tmp:rw,nosuid,nodev,size=96m,mode=1777',
      '--mount','type=bind,src='+dir+',dst=/work,readonly','--entrypoint','/bin/sh',image,'-ec',runScript];
    try{const r=await exec('docker',args,{timeout:60000,maxBuffer:128*1024});stdout=r.stdout;stderr=r.stderr;exitCode=0;}
    catch(e){stdout=typeof e.stdout==='string'?e.stdout:'';stderr=typeof e.stderr==='string'?e.stderr:'';exitCode=Number.isInteger(e.code)?e.code:null;}
    const passed=stdout.split(/\r?\n/).filter(s=>s.startsWith('LOCKED:')).map(s=>s.slice(7));
    const qualified=exitCode===0&&passed.length===ids.length&&ids.every((x,i)=>passed[i]===x);
    return {schema:1,kind:'synthetic-locked-postgres-behavior',candidateHash:hash(sql),bootstrapHash:hash(bootstrap),
      lockedTestHash:hash(locked),harnessHash:hash(runScript),image,expected:ids.length,passed:passed.length,qualified,exitCode,
      diagnostic:stderr.slice(-4096)};
  } finally{
    await exec('docker',['rm','-f',name],{timeout:10000,maxBuffer:8192}).catch(()=>{});
    await rm(dir,{recursive:true,force:true});
  }
}
