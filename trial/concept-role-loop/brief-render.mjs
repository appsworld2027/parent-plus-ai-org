const text=(v,min,max)=>typeof v==='string'&&v.trim()===v&&v.length>=min&&v.length<=max&&!/[\r\n]/.test(v);
export function applyMayaPatch(prior,p){
 if(!p||Object.keys(p).sort().join(',')!=='hypothesis,nextAction,validation'||!text(p.hypothesis,18,120)||!text(p.validation,18,180)||!text(p.nextAction,20,160))throw Error('model patch violates bounded contract');
 return {...prior,assumptions:[{id:'A1',hypothesis:p.hypothesis,validation:p.validation}],handoff:{...prior.handoff,nextAction:p.nextAction}};
}
export function renderMayaBrief(c){
 const m=c.metric;
 const lines=['# Founder concept brief','Problem: '+c.problem.statement+' (sources: '+c.problem.sourceIds.join(', ')+').','Hypotheses to validate:',...c.assumptions.map(a=>a.id+': '+a.hypothesis+' Test: '+a.validation),'Options:',...c.options.map(o=>o.id+(o.recommended?' [recommended]':'')+': '+o.reason),'Proposed metric: '+m.event+'; '+m.numerator+' / '+m.denominator+'; target '+m.targetPercent+'% in '+m.windowDays+' days, minimum '+m.minimumSample+' samples; baseline '+(m.baseline===null?'unknown':m.baseline)+'. This is a proxy, not observed impact.','In scope: '+c.scope.in.join(', ')+'.','Out of scope: '+c.scope.out.join(', ')+'.','Decision: '+c.decision.action+'; '+c.decision.recommended+'.','Handoff: '+c.handoff.owner+'; review '+c.handoff.review+'; '+c.handoff.feedback+'. '+c.handoff.nextAction];
 const md=lines.join('\n')+'\n';
 if(md.length<100||md.length>1600)throw Error('rendered brief outside founder length budget');
 return md;
}
