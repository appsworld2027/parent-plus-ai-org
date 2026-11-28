export const reviewerCandidates=Object.freeze(['google/gemma-3-12b-it']);
export function selectReviewer(ids){return Array.isArray(ids)&&ids.includes(reviewerCandidates[0])?reviewerCandidates[0]:null;}
