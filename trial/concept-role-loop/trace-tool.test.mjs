import {test} from 'node:test';
import assert from 'node:assert/strict';
import {simulateTrace,deriveToolFields} from './trace-tool.mjs';
import {conceptFixture,evaluateConceptArtifact} from '../../scripts/frontier-concept-evaluator.mjs';
import {canonicalHash} from '../../scripts/frontier-admission.mjs';
const s=(tenant,id,title,expectedVersion,requestId)=>({op:'save',input:{tenant,id,title,expectedVersion,requestId}}),l=tenant=>({op:'list',tenant});
test('trim, update, stale and sorted lists from declared contract',()=>assert.deepEqual(simulateTrace({steps:[s('a','b',' X ',0,'q1'),s('a','b','Y',1,'q2'),s('a','b','old',1,'q3'),s('a','a','Z',0,'q4'),l('a')]}),[{ok:true,record:{id:'b',title:'X',version:1}},{ok:true,record:{id:'b',title:'Y',version:2}},{ok:false,code:'stale'},{ok:true,record:{id:'a',title:'Z',version:1}},[{id:'a',title:'Z',version:1},{id:'b',title:'Y',version:2}]]));
test('successful idempotent replay, conflict and independent tenant rows',()=>assert.deepEqual(simulateTrace({steps:[s('a','r',' A ',0,'q'),s('a','r','A',0,'q'),s('a','r','B',0,'q'),s('b','r','B',0,'q'),l('a'),l('b')]}),[{ok:true,record:{id:'r',title:'A',version:1}},{ok:true,record:{id:'r',title:'A',version:1}},{ok:false,code:'conflict'},{ok:true,record:{id:'r',title:'B',version:1}},[{id:'r',title:'A',version:1}],[{id:'r',title:'B',version:1}]]));
test('invalid title/version/tenant input rejects without write',()=>assert.deepEqual(simulateTrace({steps:[s('a','r',' ',0,'q'),s('a','r','a',-1,'q'),s('','r','a',0,'q'),l(''),l('a')]}),[{ok:false,code:'invalid'},{ok:false,code:'invalid'},{ok:false,code:'invalid'},{throws:'invalid'},[]]));
for(const variant of ['normal','edge','adversarial'])test('independent tool outputs pass five common locked checks for '+variant,()=>{
 const fixture=conceptFixture('maya-ai-pm',variant),fields=deriveToolFields(fixture,canonicalHash(fixture));
 const grade=evaluateConceptArtifact('maya-ai-pm',variant,[{path:'contract.json',content:JSON.stringify(fields)},{path:'founder-brief.md',content:'Test only: deterministic common-field simulator evaluation; not an actual product artifact.'}]);
 for(const id of ['C01','C02','C03','C04','C05'])assert.equal(grade.checks[id]?.pass,true,id+' '+JSON.stringify(grade.checks[id]));
 assert.equal(grade.qualification,false);
});
