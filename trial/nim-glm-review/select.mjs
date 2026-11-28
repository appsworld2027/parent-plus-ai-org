// Prior run 46134978774 catalog confirmed GLM; recheck live availability. No held Kimi replay.
export const reviewerCandidates=Object.freeze(['z-ai/glm-5.3-flash']);
export function selectReviewer(ids){return Array.isArray(ids)&&ids.includes(reviewerCandidates[0])?reviewerCandidates[0]:null;}
