// Only trust the final successful stream-json result; never execute model text.
import { readFileSync, writeFileSync } from 'node:fs';
export function extractReview(raw, role='review') {
  const rows=raw.split(/\r?\n/).filter(Boolean).flatMap(x=>{try{return [JSON.parse(x)]}catch{return []}});
  const final=rows.filter(x=>x.type==='result').at(-1);
  if(!final||final.is_error!==false||final.subtype!=='success'||typeof final.result!=='string'||!final.result.trim()||final.result.length>12000) throw new Error('No successful independent report');
  const text=final.result.trim();const last=text.split(/\r?\n/).at(-1);
  const expected=role==='sam'?['RELEASE: BLOCK_PRODUCTION']:['VERDICT: APPROVE','VERDICT: CHANGES'];
  if(!expected.includes(last)) throw new Error('Review missing unambiguous final gate');
  if(role!=='sam' && text.split(/\r?\n/).filter(x=>/^VERDICT: (APPROVE|CHANGES)$/.test(x)).length!==1) throw new Error('Contradictory review verdict');
  return {text,last,approved:last===expected[0]};
}
if(process.argv[1]?.endsWith('/review.mjs')){
  const result=extractReview(readFileSync(process.argv[2],'utf8'),process.argv[4]);
  writeFileSync(process.argv[3],result.text+'\n');
  console.log('Independent role report:',result.last);
  if(!result.approved)process.exitCode=1;
}
