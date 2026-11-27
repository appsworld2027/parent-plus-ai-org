import test from 'node:test';
import assert from 'node:assert/strict';
import {readFile} from 'node:fs/promises';
import {evaluateDatabaseMigration} from '../scripts/frontier-database-evaluator.mjs';
const control=await readFile(new URL('../fixtures/frontier/database/control.sql',import.meta.url),'utf8');
const image=process.env.FRONTIER_TEST_POSTGRES_IMAGE;
test('rejects unpinned images and psql commands',async()=>{
  await assert.rejects(evaluateDatabaseMigration(control,{image:'postgres:16-alpine'}),/digest-pinned/);
  await assert.rejects(evaluateDatabaseMigration('\\! echo hack',{image:'postgres@sha256:'+'a'.repeat(64)}),/plain SQL/);
});
test('real PostgreSQL clean reference preserves all 14 independent checks',async()=>{
  const r=await evaluateDatabaseMigration(control,{image});
  assert.equal(r.qualified,true,JSON.stringify(r));
  assert.equal(r.passed,14);
});
test('disabled RLS, stale overwrite, global idempotency and legacy loss fail closed',async()=>{
  const mutations=[
    control.replace('ALTER TABLE pilot.reminders ENABLE ROW LEVEL SECURITY;','ALTER TABLE pilot.reminders DISABLE ROW LEVEL SECURITY;'),
    control.replace('IF coalesce(current_version,0)<>p_expected THEN','IF false THEN'),
    control.replace('PRIMARY KEY (tenant_id,request_id)','PRIMARY KEY (request_id)'),
    "DELETE FROM pilot.reminders WHERE tenant_id='legacy-a';\n"+control
  ];
  for(const [i,sql] of mutations.entries()){
    assert.notEqual(sql,control);
    const r=await evaluateDatabaseMigration(sql,{image});
    assert.equal(r.qualified,false,JSON.stringify({i,r}));
    assert.notEqual(r.exitCode,0,JSON.stringify({i,r}));
    assert.match(r.diagnostic,[/DB01/,/DB08/,/unique constraint|DB11/,/DB01/][i],JSON.stringify({i,r}));
  }
});

test('concurrent replay without transaction serialization fails closed',async()=>{
  const sql=control.replace('PERFORM pg_advisory_xact_lock(hashtextextended(p_tenant,0));','PERFORM 1;');
  assert.notEqual(sql,control);
  const r=await evaluateDatabaseMigration(sql,{image});
  assert.equal(r.qualified,false,JSON.stringify(r));
  assert.equal(r.passed,12,JSON.stringify(r));
  assert.match(r.diagnostic,/unique constraint|duplicate key/,JSON.stringify(r));
});
