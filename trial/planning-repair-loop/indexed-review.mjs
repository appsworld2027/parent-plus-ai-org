// Reviewers select exact source spans; controller materializes the original substring.
export function makeSourceSpans(author,controller,dispatchTaskIds){
  const spans=author.split(/(?<=[.!?])\s+/).filter(Boolean).map((quote,i)=>({id:'A'+i,source:'AUTHOR',quote}));
  const property=JSON.stringify({dispatchTaskIds}).slice(1,-1);
  if(!controller.includes(property))throw Error('missing controller dispatch span');
  spans.push({id:'C0',source:'CONTROLLER',quote:property});
  if(spans.some(s=>!(s.source==='AUTHOR'?author:controller).includes(s.quote)))throw Error('invalid span construction');
  return spans;
}
export function resolveSelectedSpans(raw,spans){
  if(!raw||!Array.isArray(raw.evidence)||!Array.isArray(raw.findings)||!['APPROVE','CHANGES'].includes(raw.verdict))throw Error('invalid indexed review');
  const evidence=raw.evidence.map(e=>{
    if(!e||Object.keys(e).sort().join(',')!=='criterion,source,spanId,status')throw Error('invalid indexed evidence shape');
    if(e.status==='missing'&&e.spanId===null)return {criterion:e.criterion,source:e.source,status:e.status,quote:null};
    if(e.status!=='supported'||typeof e.spanId!=='string')throw Error('invalid selected span');
    const span=spans.find(s=>s.id===e.spanId&&s.source===e.source);
    if(!span)throw Error('unknown or wrong-source span');
    return {criterion:e.criterion,source:e.source,status:e.status,quote:span.quote};
  });
  return {verdict:raw.verdict,evidence,findings:raw.findings};
}
