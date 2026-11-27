// Fail closed before any real-product pilot inference. A configured route alone is not eligibility.
import { createHash } from 'node:crypto';
import { writeFileSync } from 'node:fs';
import { pathToFileURL } from 'node:url';
const ROUTES = ['groq/openai/gpt-oss-120b','groq/qwen/qwen3.8-27b'];
const SHA=/^[a-f0-9]{64}$/;
const SAFE_REF=/^https:\/\/(?:github\.com\/appsworld2027\/parent-plus-ai-org\/actions\/runs\/\d+(?:\/artifacts\/\d+)?|github\.com\/appsworld2027\/parent-plus-ai-org\/issues\/\d+(?:#issuecomment-\d+)?|console\.groq\.com\/[A-Za-z0-9/_-]+)$/;
function requireEvidence(x, label) { if (typeof x!=='string' || !SAFE_REF.test(x)) throw new Error('Missing or invalid '+label+' evidence reference'); }
export function checkEligibility(raw, now=Date.now()) {
  if(typeof raw!=='string'||!raw.trim()) throw new Error('No current free-model eligibility receipt; inference blocked');
  let x; try { x=JSON.parse(raw); } catch { throw new Error('Malformed model eligibility receipt'); }
  if(!x||typeof x!=='object'||Array.isArray(x)||x.schema!=='course-provider-eligibility/v1'||x.provider!=='groq'||x.adapter!=='free-claude-code@6.19.56') throw new Error('Wrong receipt schema/provider/adapter');
  if(x.billingGuard!=='provider-enforced-no-charge'||x.paidFallback!==false||x.dataClass!=='public-source-and-synthetic-only'||x.privateOrCustomerData!==false) throw new Error('Billing, fallback or data guard is unverified');
  const verified=Date.parse(x.verifiedAt), expiry=Date.parse(x.expiresAt);
  if(!Number.isFinite(verified)||!Number.isFinite(expiry)||verified>now||now>=expiry||expiry-verified>30*86400000) throw new Error('Expired, future or invalid eligibility receipt');
  requireEvidence(x.billingEvidence,'billing guard'); requireEvidence(x.termsEvidence,'data permission/terms');
  if(!Array.isArray(x.routes)||x.routes.length!==2) throw new Error('Both exact independent routes require evidence');
  for(const id of ROUTES) {
    const m=x.routes.find(r=>r?.id===id);
    if(!m||m.observedIdentity!==id.slice(5)||m.toolArtifactVerified!==true||m.syntheticQualificationPassed!==true||!SHA.test(m.receiptSha256??'')) throw new Error('Missing observed identity/tool/qualification evidence for '+id);
    requireEvidence(m.run,'synthetic qualification run');
  }
  return {schema:x.schema,provider:x.provider,adapter:x.adapter,verifiedAt:x.verifiedAt,expiresAt:x.expiresAt,routeIds:ROUTES,receiptSha256:createHash('sha256').update(raw).digest('hex')};
}
if(process.argv[1]&&import.meta.url===pathToFileURL(process.argv[1]).href) {
  try {
    const result=checkEligibility(process.env.COURSE_PILOT_PROVIDER_ELIGIBILITY);
    if(process.argv[2]) writeFileSync(process.argv[2],JSON.stringify(result,null,2)+'\n',{mode:0o600});
    console.log('Current owner-supplied eligibility receipt validated; separate observed run receipts still required.');
  } catch(e) { console.error('::error::'+e.message); process.exitCode=1; }
}
