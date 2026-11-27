// Controller-owned locked behavioral tests. This file is copied into a separate
// no-network container, alongside the candidate board.mjs. Never sent in a prompt.
import test from "node:test";
import assert from "node:assert/strict";
import { createBoard } from "./board.mjs";
const create=(extra={})=>({tenant:"tenant-eval-17",id:"record-z",title:"  Return library book  ",expectedVersion:0,requestId:"request-a",...extra});
test("fresh list and normalized creation",()=>{
  const b=createBoard();assert.deepEqual(b.list("tenant-eval-17"),[]);
  assert.deepEqual(b.save(create()),{ok:true,record:{id:"record-z",title:"Return library book",version:1}});
});
test("list sorted by ID",()=>{
  const b=createBoard();b.save(create());b.save(create({id:"record-a",requestId:"request-b"}));
  assert.deepEqual(b.list("tenant-eval-17").map(x=>x.id),["record-a","record-z"]);
});
test("tenant-scoped equal IDs",()=>{
  const b=createBoard();b.save(create());assert.deepEqual(b.list("tenant-eval-18"),[]);
  b.save(create({tenant:"tenant-eval-18",title:"Other tenant"}));
  assert.equal(b.list("tenant-eval-17")[0].title,"Return library book");
  assert.equal(b.list("tenant-eval-18")[0].title,"Other tenant");
});
test("stale request cannot modify state",()=>{
  const b=createBoard();b.save(create());
  assert.deepEqual(b.save(create({requestId:"request-b",title:"wrong",expectedVersion:0})),{ok:false,code:"stale"});
  assert.equal(b.list("tenant-eval-17")[0].title,"Return library book");
});
test("exact update advances version",()=>{
  const b=createBoard();b.save(create());
  assert.deepEqual(b.save(create({requestId:"request-b",title:"New",expectedVersion:1})),{ok:true,record:{id:"record-z",title:"New",version:2}});
});
test("idempotent normalized replay, no extra effect",()=>{
  const b=createBoard(),first=b.save(create());
  assert.deepEqual(b.save(create({title:"Return library book"})),first);
  assert.equal(b.list("tenant-eval-17").length,1);assert.equal(b.list("tenant-eval-17")[0].version,1);
});
test("conflicting idempotency request rejected",()=>{
  const b=createBoard();b.save(create());
  assert.deepEqual(b.save(create({title:"different"})),{ok:false,code:"conflict"});
  assert.deepEqual(b.save(create({id:"different"})),{ok:false,code:"conflict"});
  assert.deepEqual(b.save(create({expectedVersion:1})),{ok:false,code:"conflict"});
});
test("idempotency keys scoped by tenant",()=>{
  const b=createBoard();b.save(create());
  assert.equal(b.save(create({tenant:"tenant-eval-18",title:"Independent"})).ok,true);
});
test("replay after later update returns original without reverting",()=>{
  const b=createBoard(),first=b.save(create());b.save(create({requestId:"request-b",expectedVersion:1,title:"New"}));
  assert.deepEqual(b.save(create()),first);assert.equal(b.list("tenant-eval-17")[0].version,2);
});
test("record and response objects cannot mutate stored state",()=>{
  const b=createBoard(),first=b.save(create());first.record.title="tampered";
  const rows=b.list("tenant-eval-17");rows[0].title="changed";
  assert.equal(b.list("tenant-eval-17")[0].title,"Return library book");
  assert.equal(b.save(create()).record.title,"Return library book");
});
test("invalid input and title boundary",()=>{
  const b=createBoard();for(const extra of [{tenant:""},{id:" "},{requestId:""},{title:""},{title:"x".repeat(81)},{title:null},{expectedVersion:-1},{expectedVersion:1.2},{expectedVersion:"0"}]){
    assert.deepEqual(b.save(create(extra)),{ok:false,code:"invalid"});
  }
  assert.throws(()=>b.list("  "));assert.equal(b.save(create({title:"x".repeat(80)})).ok,true);
});
test("failed stale attempt is not counted as successful replay",()=>{
  const b=createBoard();
  assert.deepEqual(b.save(create({expectedVersion:1})),{ok:false,code:"stale"});
  assert.equal(b.save(create()).ok,true);
});
