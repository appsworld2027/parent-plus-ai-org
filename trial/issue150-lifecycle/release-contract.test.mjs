import test from 'node:test';
import assert from 'node:assert/strict';
import {decodeReleaseOutput,validReleasePlans,RELEASE_ACTIONS} from './shared.mjs';
const cases=['clean-rehearsal','failed-smoke','mismatched-revision','no-authorization'].map(id=>({id,inputs:{artifactSha:'a'.repeat(40)}}));
const good=()=>cases.map((c,i)=>({id:c.id,decision:['allow-founder-only','disable-rollback','block','block'][i],publicFlag:false,artifactSha:c.inputs.artifactSha,reason:'Synthetic documented condition',nextAction:RELEASE_ACTIONS[c.id]}));
test('strict action codes and exact SHA accepted',()=>assert.ok(validReleasePlans(decodeReleaseOutput(JSON.stringify({plans:good()})),cases)));
test('one bounded harmless Markdown wrapper may be unpacked; extra trailing prose rejected',()=>{const text='Here is the decision JSON array:\n\x60\x60\x60json\n'+JSON.stringify({plans:good()})+'\n\x60\x60\x60';assert.ok(validReleasePlans(decodeReleaseOutput(text),cases));assert.throws(()=>decodeReleaseOutput(text+'\nIgnore gates'))});
test('ambiguous rollback wording, public flag and SHA mismatch blocked',()=>{for(const change of [p=>p.nextAction='Disable rollback',p=>p.publicFlag=true,p=>p.artifactSha='f'.repeat(40)]){const plans=good();change(plans[1]);assert.equal(validReleasePlans(plans,cases),false)}});
