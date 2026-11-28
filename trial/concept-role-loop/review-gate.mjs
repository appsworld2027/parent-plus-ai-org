const object=x=>x!==null&&typeof x==='object'&&!Array.isArray(x);
const ids=['R1','R2','R3','R4','R5','R6'];
export function validMayaReview(d){
 return object(d)&&Object.keys(d).sort().join(',')==='checks,verdict'&&Array.isArray(d.checks)&&d.checks.length===ids.length&&d.checks.every(object)&&ids.every((id,i)=>d.checks.filter(x=>x.id===id&&Object.keys(x).sort().join(',')==='evidence,id,pass,reason'&&typeof x.pass==='boolean'&&x.evidence==='E'+(i+1)&&typeof x.reason==='string'&&x.reason.trim().length>=15&&x.reason.length<=200).length===1)&&d.verdict===(d.checks.every(x=>x.pass)?'APPROVE':'REJECT');
}
