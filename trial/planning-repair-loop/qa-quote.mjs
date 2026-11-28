// Minimum evidence screen, not semantic certification. All incomplete QA predecessors
// must be explicitly named in an AUTHOR quote supporting the dependency criterion.
export function screenQaDependencyQuote(graph,review){
  const qa=graph?.nodes?.find(n=>n.id==='qa');
  if(!qa||!Array.isArray(qa.dependsOn)||!qa.dependsOn.length)return {valid:false,reason:'missing-qa-dependency-graph'};
  const quote=review?.evidence?.find(e=>e.criterion==='dependency-completion'&&e.source==='AUTHOR'&&e.status==='supported')?.quote;
  const ids=qa.dependsOn.filter(id=>graph.nodes.find(n=>n.id===id)?.observed!=='complete');
  if(!ids.length)return {valid:true,reason:'no-incomplete-qa-predecessors',ids};
  const words=typeof quote==='string'?quote.toLowerCase().match(/[a-z0-9_-]+/g)||[]:[];
  const missing=ids.filter(id=>!words.includes(id.toLowerCase()));
  const valid=words.includes('qa')&&words.some(w=>['complete','completed','completing','completion','finished','finishing'].includes(w))&&missing.length===0;
  return {valid,reason:valid?'minimum-qa-quote-screen-pass':'insufficient-qa-completion-quote',ids,missing};
}
