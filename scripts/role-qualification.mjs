import { readFileSync } from "node:fs";
import { createHash } from "node:crypto";
import { pathToFileURL } from "node:url";
import { STAGE_ROLE } from "./agent-router.mjs";
import { extractReadonlyReport } from "./extract-readonly-report.mjs";
const FILE = new URL("../governance/ROLE_QUALIFICATION_FIXTURES.json", import.meta.url);
export const fixtures = JSON.parse(readFileSync(FILE, "utf8"));
export function fixtureFor(id) {
  const f = fixtures.find(x => x.id === id);
  if (!f || STAGE_ROLE[f.stage] !== f.role) throw Error("Unknown or invalid fixture");
  return f;
}
export const fixtureHash = f => createHash("sha256").update(JSON.stringify(f)).digest("hex");
export function prepareFixture(id) {
  const f = fixtureFor(id);
  const keys = Object.keys(f.expected).join(", ");
  const prompt = "Synthetic qualification " + f.id + " (" + f.role + "). No real data or tools. " + f.task +
    "\nUse EXACT JSON keys " + keys + ". Output a single line starting QUALIFICATION_JSON: followed by a JSON object with only those fields. Use JSON booleans/numbers, not strings. Do not reveal hidden answers or invoke tools.";
  return { fixture: f.id, version: f.version, role: f.role, stage: f.stage, fixtureHash: fixtureHash(f), prompt };
}
export function scoreFixture(id, report, route = {}, metadata = {}) {
  const f = fixtureFor(id);
  const markers = report.split(/\r?\n/).map(s => s.trim()).filter(s => s.startsWith("QUALIFICATION_JSON:"));
  let answer = null;
  if (markers.length === 1) { try { answer = JSON.parse(markers[0].slice("QUALIFICATION_JSON:".length)); } catch {} }
  if (!answer || typeof answer !== "object" || Array.isArray(answer)) answer = null;
  const checks = Object.entries(f.expected).map(([field, value]) => ({ field, passed: !!answer && Object.hasOwn(answer, field) && Object.is(answer[field], value) }));
  const exactShape = !!answer && Object.keys(answer).length === checks.length;
  const routeMatched = route.action === "run" && route.engine === "free" && route.role === f.role && route.stage === f.stage &&
    typeof route.free_model === "string" && /^(groq|nvidia)\//.test(route.free_model) && route.free_provider === route.free_model.split("/")[0];
  const objectiveChecksPassed = exactShape && checks.every(c => c.passed);
  return { schema:1, fixture:f.id, version:f.version, fixtureHash:fixtureHash(f), role:f.role, stage:f.stage,
    mode:"synthetic-readonly", provider:route.free_provider || route.free_model?.split("/")[0] || null, model:route.free_model || null,
    checks, exactShape, routeMatched, objectiveChecksPassed, passed:objectiveChecksPassed && routeMatched,
    independentQualityAssessment:"not-assessed", billingStatus:"provider-billing-unverified", handbookSha:metadata.handbookSha, runId:metadata.runId, attempt:metadata.attempt, repository:metadata.repository };
}
if (process.argv[1] && import.meta.url === pathToFileURL(process.argv[1]).href) {
  const [, , action, id, logPath, routePath, sha] = process.argv;
  if (action === "prepare") console.log(JSON.stringify(prepareFixture(id)));
  else if (action === "score") {
    let report = "";
    try { report = extractReadonlyReport(readFileSync(logPath,"utf8")); } catch {}
    const route = JSON.parse(readFileSync(routePath,"utf8"));
    const result = scoreFixture(id, report, route, {handbookSha:sha, runId:process.env.GITHUB_RUN_ID, attempt:process.env.GITHUB_RUN_ATTEMPT, repository:process.env.GITHUB_REPOSITORY});
    console.log(JSON.stringify(result,null,2));
    if (!result.passed) process.exitCode = 1;
  } else throw Error("Expected prepare or score");
}
