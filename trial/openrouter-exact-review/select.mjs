export const reviewerCandidates=Object.freeze(['google/gemma-4-31b-it:free','baidu/ernie-5.5-flash-preview:free','google/gemma-4-26b-a4b-it:free']);
export function isFree(row){
 return !!(typeof row?.id==='string'&&row.id.endsWith(':free')&&row.pricing&&
 Object.hasOwn(row.pricing,'prompt')&&Object.hasOwn(row.pricing,'completion')&&
 Object.values(row.pricing).every(v=>v!==null&&v!==''&&Number(v)===0)&&
 row.supported_parameters?.includes('response_format'));
}
export function selectReviewer(rows,requested){
 if(!reviewerCandidates.includes(requested)||!Array.isArray(rows))return null;
 return rows.some(row=>row.id===requested&&isFree(row))?requested:null;
}
