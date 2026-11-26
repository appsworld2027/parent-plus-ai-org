import test from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { TRIAL, patchProblems, parseRaw, outcomes, verdict, reviewVerdict, builderPrompt } from "../scripts/safe-trial.mjs";

const read = (p) => readFileSync(new URL(`../${p}`, import.meta.url), "utf8");
const flow = read(".github/workflows/safe-trial.yml");
const M = (path, status = "M") => ({ status, path });

test("trial build may change app code, test support and new unit tests only", () => {
  assert.deepEqual(patchProblems([M("src/coach/needs.ts"), M("App.tsx"), M("e2e/support/feesBackend.ts"), M("tests/new.test.ts", "A")]), []);
  for (const bad of [M(`e2e/acceptance/${TRIAL.slug}.spec.ts`), M("playwright.config.ts"), M("package.json"), M("config/public-client.json"),
    M(".github/workflows/x.yml", "A"), M("tests/old.test.ts"), M("tests/old.test.ts", "D"), M("scripts/a.mjs"), M("src/../package.json")])
    assert.equal(patchProblems([bad]).length, 1, bad.path);
  assert.equal(patchProblems([]).length, 1);
});

test("links and sub-repositories are refused even inside allowed folders", () => {
  const raw = ":000000 120000 000 abc A\tsrc/link\n:000000 160000 000 abc A\tsrc/sub\n:100644 100644 a b M\tsrc/ok.ts";
  assert.equal(patchProblems(parseRaw(raw)).length, 2);
});

const spec = (title, status) => ({ title, tests: [{ status, projectName: "chromium" }] });
const report = (specs) => ({ suites: [{ file: "a.spec.ts", specs, suites: [{ title: "group", specs: [spec("same", "expected")] }] }] });
const acc = Object.fromEntries(Array.from({ length: TRIAL.acceptanceCount }, (_, i) => [`AC-${i}`, "expected"]));
const good = { problems: [], checkExit: 0, acceptance: acc, before: { a: "expected", b: "unexpected" }, after: { a: "expected", b: "unexpected" } };

test("same title in different groups is counted separately", () => {
  assert.equal(Object.keys(outcomes(report([spec("same", "unexpected")]))).length, 2);
});

test("verdict passes only with every check proven", () => {
  assert.equal(verdict(good).result, "PASS");
  for (const change of [{ checkExit: 1 }, { problems: ["x"] }, { acceptance: {} }, { acceptance: { ...acc, "AC-0": "skipped" } },
    { acceptance: { ...acc, "AC-0": "flaky" } }, { before: {} }, { after: {} }, { after: { a: "unexpected" } }])
    assert.equal(verdict({ ...good, ...change }).result, "FAIL", JSON.stringify(change));
});

test("reviewer verdict must be explicit", () => {
  assert.equal(reviewVerdict("notes\nVERDICT: APPROVE\n"), "APPROVE");
  assert.equal(reviewVerdict("I would VERDICT: APPROVE maybe"), "NO VERDICT");
});

test("builder is told not to publish anything", () => assert.match(builderPrompt(), /Do not push, open pull requests or use labels/));

test("safe trial workflow is manual, owner-only, read-only and publishes nothing", () => {
  const triggers = flow.slice(flow.indexOf("\non:"), flow.indexOf("\npermissions:"));
  assert.deepEqual(triggers.match(/^ {2}\w+:/gm), ["  workflow_dispatch:"]);
  assert.match(flow, /\npermissions:\n  contents: read\n\n/);
  assert.equal(flow.match(/permissions:/g).length, 1);
  assert.match(flow, /inputs\.confirm == 'EVALUATION ONLY' && github\.ref == 'refs\/heads\/main' && github\.actor == github\.repository_owner/);
  assert.doesNotMatch(flow, /git push|gh (pr|issue|api|workflow)|github\.token|GH_TOKEN|SUPERVISED_SYNTHETIC_TRIAL|CLAUDE_CODE_OAUTH|CODEX_AUTH|ANTHROPIC_API_KEY/);
  assert.equal(flow.match(/persist-credentials: false/g).length, 1); // one anchored checkout, reused by every job
  assert.equal(flow.match(/uses: actions\/checkout/g).length, 1);
});

test("only the build and review model steps receive the NVIDIA key; grading has no secret", () => {
  assert.equal(flow.match(/secrets\./g).length, 2);
  const grade = flow.slice(flow.indexOf("\n  grade:"), flow.indexOf("\n  review:"));
  assert.doesNotMatch(grade, /secrets\.|\*engine|claude -p/);
  assert.equal(flow.match(/env -u NVIDIA_NIM_API_KEY/g).length, 2);
  assert.match(flow, /--allowedTools "Read,Glob,Grep"/);
});

test("hourly resume is paused by policy", () => assert.match(read(".github/workflows/agent-resume.yml"), /\n    if: \$\{\{ false \}\}\n/));
