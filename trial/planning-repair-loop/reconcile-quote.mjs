// Minimum reconciliation evidence screen. This does not certify semantic correctness.
export function screenReconcileQuote(graph,review){
  if(!Array.isArray(graph?.reconcile))return {valid:false,reason:'missing-reconciliation-graph'};
  if(!graph.reconcile.length)return {valid:true,reason:'no-reconciliation-needed'};
  const quote=review?.evidence?.find(e=>e.criterion==='authority-reconciliation'&&e.source==='AUTHOR'&&e.status==='supported')?.quote;
  const words=typeof quote==='string'?quote.toLowerCase().match(/[a-z0-9_-]+/g)||[]:[];
  const fence=words.some(w=>['fence','fencing','fenced'].includes(w));
  const pr=words.some(w=>['pr','prs','pull-request','pull-requests'].includes(w));
  const base=words.includes('base')&&words.includes('current');
  const verify=words.some(w=>['verify','verifying','verified','inspect','inspecting','check','checking','validate','validating'].includes(w));
  return {valid:fence&&pr&&base&&verify,reason:fence&&pr&&base&&verify?'minimum-reconcile-quote-screen-pass':'reconciliation-evidence-incomplete',fence,pr,base,verify,taskIds:graph.reconcile.map(x=>x.taskId)};
}
