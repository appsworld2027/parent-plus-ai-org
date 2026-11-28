export const reviewerCandidates=Object.freeze(['stepfun-ai/step-5-preview']);
export function selectReviewer(ids){return Array.isArray(ids)&&ids.includes(reviewerCandidates[0])?reviewerCandidates[0]:null;}
