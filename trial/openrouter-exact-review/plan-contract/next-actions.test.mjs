import {test} from 'node:test';import assert from 'node:assert/strict';
import {planningFixture} from '../../../scripts/frontier-planning-evaluator.mjs';
import {verifyNextActions} from './next-actions.mjs';
const fixture=planningFixture('kiran-pjm-a','edge');
const complete=[
 {task:'api',requires:[],unblock:null},
 {task:'ui',requires:[],unblock:null},
 {task:'database',requires:[],unblock:'migration-lock'},
 {task:'integration',requires:[],unblock:null},
 {task:'qa',requires:['api','database','ui','integration'],unblock:null},
 {task:'review',requires:['qa'],unblock:null},
 {task:'release',requires:['review'],unblock:null}
];
test('all incomplete prerequisites must be explicitly complete before dependent task, not just unblocked',()=>{
 assert.equal(verifyNextActions({fixture,steps:complete}).valid,true);
 const missing=structuredClone(complete);missing[4].requires=['api','ui','integration'];
 assert.equal(verifyNextActions({fixture,steps:missing}).valid,false);
 const unblockedOnly=complete.filter(x=>x.task!=='database');
 assert.equal(verifyNextActions({fixture,steps:unblockedOnly}).valid,false);
});
test('blocked task requires its actual blocker resolution and then completion',()=>{
 const broken=structuredClone(complete);broken[2].unblock=null;
 assert.equal(verifyNextActions({fixture,steps:broken}).valid,false);
 const invented=structuredClone(complete);invented[2].unblock='other';
 assert.equal(verifyNextActions({fixture,steps:invented}).valid,false);
});
test('rejects premature QA ordering, invented prerequisites, duplicate tasks and missing terminal stages',()=>{
 const reordered=[complete[4],...complete.slice(0,4),...complete.slice(5)];
 for(const steps of [reordered,[...complete,complete[0]],complete.slice(0,-1),complete.map(x=>x.task==='qa'?{...x,requires:[...x.requires,'phantom']}:x)])assert.equal(verifyNextActions({fixture,steps}).valid,false);
});
