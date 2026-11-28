// Qualification-only structural/provenance screen, not a semantic judge or release approval.
const validId=s=>typeof s==='string'&&/^[a-z][a-z0-9-]{0,63}$/.test(s);
const text=(s,max=650)=>typeof s==='string'&&s.trim().length>0&&s.length<=max;
const sameKeys=(o,keys)=>o&&typeof o==='object'&&!Array.isArray(o)&&Object.keys(o).sort().join()===Array.from(keys).sort().join();
const sourceKinds=new Set(['AUTHOR','CONTROLLER']);
export function verifyReviewProvenance({author,controller,criteria,review}={}){
 const invalid=reason=>({valid:false,reason,qualification:false});
 if(typeof author!=='string'||typeof controller!=='string'||!Array.isArray(criteria)||!criteria.length||
 !criteria.every(c=>sameKeys(c,['id','source'])&&validId(c.id)&&sourceKinds.has(c.source))||
 new Set(criteria.map(c=>c.id)).size!==criteria.length)return invalid('invalid-trusted-input');
 const expected=new Map(criteria.map(c=>[c.id,c.source]));
 const sources={AUTHOR:author,CONTROLLER:controller};
 if(!review||!['APPROVE','CHANGES'].includes(review.verdict)||!Array.isArray(review.evidence)||!Array.isArray(review.findings)||
 review.evidence.length!==expected.size)return invalid('required-evidence-ledger');
 const used=new Set(),missing=new Set();
 for(const e of review.evidence){
  if(!sameKeys(e,['criterion','source','status','quote'])||!expected.has(e.criterion)||used.has(e.criterion)||e.source!==expected.get(e.criterion)||
  !['supported','missing'].includes(e.status))return invalid('criterion-or-source-mismatch');
  used.add(e.criterion);
  if(e.status==='missing'){if(e.quote!==null)return invalid('missing-quote-must-be-null');missing.add(e.criterion);}
  else if(!text(e.quote)||!sources[e.source].includes(e.quote))return invalid('quote-not-in-attributed-source');
 }
 const findings=new Set();
 for(const f of review.findings){
  if(!sameKeys(f,['criterion','message'])||!expected.has(f.criterion)||!text(f.message)||findings.has(f.criterion))return invalid('invalid-findings');
  findings.add(f.criterion);
 }
 if(review.verdict==='APPROVE'&&(missing.size||findings.size))return invalid('approval-with-missing-or-findings');
 if(review.verdict==='CHANGES'&&(!findings.size||[...missing].some(id=>!findings.has(id))))return invalid('missing-findings-for-changes');
 return {valid:true,reason:'provenance-screen-pass',qualification:false,semanticJudgmentStillRequired:true};
}
