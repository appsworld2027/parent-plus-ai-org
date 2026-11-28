import {test} from "node:test";
import assert from "node:assert/strict";
import { createRoutedIssue } from "../scripts/loop.mjs";
const request={repository:"fixture/synthetic",title:"Synthetic issue",body:"Fictional instruction",route:"ai:discovery"};
const receipt={number:42,state:"open",title:request.title,body:request.body,repository_url:"https://api.github.com/repos/fixture/synthetic",html_url:"https://github.com/fixture/synthetic/issues/42",labels:[{name:"ai:discovery"}]};
test("routing label and payload are sent once; wake only after full exact receipt",()=>{
 const events=[];
 const result=createRoutedIssue({...request,post:x=>{events.push(["POST",x]);return receipt},wakeWorker:n=>events.push(["wake",n])});
 assert.equal(result,"42");assert.deepEqual(events,[["POST",request],["wake","42"]]);
});
for(const [name,change] of [
 ["missing label",{labels:[]}],["wrong routing label",{labels:[{name:"ai:build"}]}],
 ["wrong repository",{repository_url:"https://api.github.com/repos/other/synthetic"}],
 ["wrong issue URL",{html_url:"https://github.com/fixture/synthetic/issues/43"}],
 ["not an issue",{pull_request:{url:"x"}}],["closed",{state:"closed"}],
 ["wrong title",{title:"other"}],["wrong body",{body:"other"}],["invalid number",{number:0}]
])test(name+" leaves wake blocked and never retries",()=>{
 let posts=0,wakes=0;
 assert.throws(()=>createRoutedIssue({...request,post:()=>{posts++;return {...receipt,...change}},wakeWorker:()=>wakes++}),/not fully confirmed/);
 assert.equal(posts,1);assert.equal(wakes,0);
});
test("uncertain POST throws without wake or a second POST",()=>{
 let posts=0,wakes=0;
 assert.throws(()=>createRoutedIssue({...request,post:()=>{posts++;throw Error("timeout")},wakeWorker:()=>wakes++}),/timeout/);
 assert.equal(posts,1);assert.equal(wakes,0);
});
test("invalid route never POSTs",()=>{
 assert.throws(()=>createRoutedIssue({...request,route:"other",post:()=>assert.fail("POST"),wakeWorker:()=>assert.fail("wake")}),/Invalid issue routing/);
});
