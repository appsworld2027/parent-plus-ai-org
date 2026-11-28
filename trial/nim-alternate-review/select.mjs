// Requested candidate IDs, not availability or quality claims. Only a fresh provider catalog can admit one.
export const reviewerCandidates=Object.freeze([
 'deepseek-ai/deepseek-v3.2',
 'moonshotai/kimi-k3.1-pro',
 'z-ai/glm-5.3-flash',
 'deepseek-ai/deepseek-v3.1',
 'deepseek-ai/deepseek-r1-0528'
]);
export function selectReviewer(ids){
 if(!Array.isArray(ids))return null;
 const present=new Set(ids);
 return reviewerCandidates.find(id=>present.has(id))??null;
}
