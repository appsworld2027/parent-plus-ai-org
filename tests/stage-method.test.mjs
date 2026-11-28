import test from "node:test";
import assert from "node:assert/strict";
import { mkdtempSync, mkdirSync, copyFileSync, readFileSync, writeFileSync, rmSync } from "node:fs";
import { join, dirname, sep } from "node:path";
import { tmpdir } from "node:os";
import { pathToFileURL } from "node:url";
import { prepareStageMethod, requireCezarLiveAdmission } from "../scripts/stage-method.mjs";
import { STAGE_ROLE } from "../scripts/agent-router.mjs";

const root = new URL("../", import.meta.url);
const read = path => readFileSync(new URL(path, root), "utf8");
const policy = JSON.parse(read("governance/STAGE_METHODS.json"));
test("every canonical executable stage has a pinned bounded method and truthful preparation receipt", () => {
  assert.deepEqual(Object.keys(policy.stages).sort(), Object.keys(STAGE_ROLE).sort());
  for (const [stage, role] of Object.entries(STAGE_ROLE)) {
    const x = prepareStageMethod({stage, role});
    assert.ok(x.prompt.includes(policy.skills[x.receipt.skill].excerpt));
    assert.ok(Buffer.byteLength(x.prompt) <= 1300);
    assert.equal(x.receipt.state, "prepared-not-verified-compliance");
    assert.equal(x.receipt.independentReviewPassed, false);
    assert.equal(x.receipt.cezar, "not-invoked");
    assert.match(x.receipt.methodSha256, /^[a-f0-9]{64}$/);
    assert.deepEqual(x, prepareStageMethod({stage, role}));
  }
  for (const stage of ["ai:build", "ai:fix"]) for (const role of ["tara-database", "ravi-integration"]) {
    assert.equal(prepareStageMethod({stage, role}).receipt.role, role);
  }
});
test("unknown stage, malicious path and mismatched role fail closed", () => {
  for (const args of [
    {stage:"../../secret", role:"maya-ai-pm"}, {stage:"__proto__", role:"maya-ai-pm"},
    {stage:"ai:discovery", role:"rex-reviewer"}, {stage:"ai:founder-test", role:"sam-release"}
  ]) assert.throws(() => prepareStageMethod(args), /stage\/role/);
});
test("pinned skill byte drift is denied even when the selected excerpt stays unchanged", () => {
  const dir = mkdtempSync(join(tmpdir(), "stage-method-"));
  try {
    const paths = ["governance/STAGE_METHODS.json", "third_party/superpowers/manifest.json", ".ai/skills/superpowers/brainstorming/SKILL.md"];
    for (const p of paths) {
      mkdirSync(dirname(join(dir,p)), {recursive:true});
      copyFileSync(new URL(p,root), join(dir,p));
    }
    const rootUrl = pathToFileURL(dir+sep);
    const args = {stage:"ai:discovery", role:"maya-ai-pm", rootUrl};
    assert.equal(prepareStageMethod(args).receipt.skill, "brainstorming");
    const skill = join(dir,paths[2]);
    writeFileSync(skill, readFileSync(skill)+"\nchanged\n");
    assert.throws(() => prepareStageMethod(args), /source or excerpt drift/);
  } finally { rmSync(dir, {recursive:true,force:true}); }
});
test("unqualified Cezar is blocked from supported live entry points; mock remains explicitly no spend", () => {
  assert.equal(policy.cezarLiveEnabled, false);
  assert.throws(requireCezarLiveAdmission, /live execution is blocked/);
  const scripts = JSON.parse(read("package.json")).scripts;
  for (const name of ["ai:cockpit","ai:automations:import"]) assert.equal(scripts[name], "node scripts/stage-method.mjs cezar-live");
  for (const name of ["ai:dry-run","ai:pilot"]) assert.match(scripts[name], /CEZ_DRY_RUN=1/);
});
test("canonical worker must load the verified packet before inference and publish a preparation receipt", () => {
  const workflow = read(".github/workflows/agent-worker.yml");
  const load = workflow.indexOf('node .ai-org-handbook/scripts/stage-method.mjs prepare "$STAGE" "$METHOD_ROLE"');
  const inject = workflow.indexOf("cat /tmp/stage-method.md");
  const call = workflow.indexOf('claude --bare -p "$PROMPT"');
  assert.ok(load >= 0 && load < inject && inject < call);
  assert.match(workflow,/METHOD_ROLE: \$\{\{ steps\.router\.outputs\.role \}\}/);
  assert.match(workflow,/\/tmp\/agent-logs\/stage-method-preparation\.json/);
  assert.match(workflow,/path: \/tmp\/agent-logs\//);
});
