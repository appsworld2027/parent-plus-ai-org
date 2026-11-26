import test from "node:test";
import assert from "node:assert/strict";
import { readFileSync, writeFileSync, mkdtempSync, mkdirSync, symlinkSync, existsSync, cpSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { spawnSync, execFileSync } from "node:child_process";
import { fileURLToPath } from "node:url";
import { allowed } from "../scripts/safe-trial/gate.mjs";
import { TRIAL, patchProblems, parseRaw, outcomes, verdict, reviewVerdict, builderPrompt } from "../scripts/safe-trial.mjs";

const read = (p) => readFileSync(new URL(`../${p}`, import.meta.url), "utf8");
const flow = read(".github/workflows/safe-trial.yml");
const M = (path, status = "M") => ({ status, path });

test("trial build may change app code, test support and new unit tests only", () => {
  assert.deepEqual(patchProblems([M("src/coach/needs.ts"), M("App.tsx"), M("e2e/support/feesBackend.ts"), M("tests/new.test.ts", "A")]), []);
  for (const bad of [M(`e2e/acceptance/${TRIAL.slug}.spec.ts`), M("playwright.config.ts"), M("package.json"), M("config/public-client.json"),
    M(".github/workflows/x.yml", "A"), M("tests/old.test.ts"), M("tests/old.test.ts", "D"), M("scripts/a.mjs"), M("src/../package.json"),
    M("src/CLAUDE.md", "A"), M("src/a/AGENTS.md", "A"), M("e2e/support/.claude/settings.json", "A")])
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
  assert.equal(verdict(good).result, "PROVISIONAL PASS");
  assert.equal(verdict({ ...good, after: { a: "flaky" } }).result, "PROVISIONAL PASS");
  for (const change of [{ checkExit: 1 }, { problems: ["x"] }, { acceptance: {} }, { acceptance: { ...acc, "AC-0": "skipped" } },
    { acceptance: { ...acc, "AC-0": "flaky" } }, { before: {} }, { after: {} }, { after: { a: "unexpected" } }])
    assert.equal(verdict({ ...good, ...change }).result, "FAIL", JSON.stringify(change));
});

test("reviewer verdict counts only the last line", () => {
  assert.equal(reviewVerdict("notes\nVERDICT: APPROVE\n"), "APPROVE");
  assert.equal(reviewVerdict("VERDICT: APPROVE\nbut then\nVERDICT: CHANGES"), "CHANGES");
  assert.equal(reviewVerdict("VERDICT: APPROVE\nwait, not yet"), "NO VERDICT");
});

test("builder is told not to publish anything", () => assert.match(builderPrompt(), /Do not push, open pull requests or use labels/));

test("safe trial workflow is manual, owner-only, read-only and publishes nothing", () => {
  const triggers = flow.slice(flow.indexOf("\non:"), flow.indexOf("\npermissions:"));
  assert.deepEqual(triggers.match(/^ {2}\w+:/gm), ["  workflow_dispatch:"]);
  assert.match(flow, /\npermissions:\n  contents: read\n\n/);
  assert.equal(flow.match(/permissions:/g).length, 1);
  for (const guard of ["inputs.confirm == 'EVALUATION ONLY'", "github.ref == 'refs/heads/main'", "github.actor == github.repository_owner", "github.triggering_actor == github.repository_owner"]) assert.ok(flow.includes(guard), guard);
  assert.doesNotMatch(flow, /git push|gh (pr|issue|api|workflow)|github\.token|GH_TOKEN|SUPERVISED_SYNTHETIC_TRIAL|CLAUDE_CODE_OAUTH|CODEX_AUTH|ANTHROPIC_API_KEY/);
  assert.equal(flow.match(/persist-credentials: false/g).length, 1); // one anchored checkout, reused by every job
  assert.equal(flow.match(/uses: actions\/checkout/g).length, 1);
});

const steps = flow.split(/\n(?=      - )/);
test("the key reaches only engine start and output scan; never a model session or a grade", () => {
  for (const step of steps.filter((x) => x.includes("secrets."))) {
    assert.match(step, /engine\.sh|scan\.sh/);
    assert.doesNotMatch(step, /agent\.sh|run-tests|grade\.sh/);
  }
  assert.doesNotMatch(flow.slice(flow.indexOf("\n  grade:"), flow.indexOf("\n  review:")), /secrets\.|engine\.sh|agent\.sh/);
  assert.match(flow, /--allowedTools "Read,Glob,Grep"/);
});

test("every upload of model output follows a successful scan", () => {
  for (const name of ["build", "review"]) {
    const job = flow.slice(flow.indexOf(`\n  ${name}:`)).split(/\n(?=  \w+:\n)/).filter(Boolean)[0];
    assert.match(job, /if: always\(\) && steps\.scan\.outcome == 'success'/);
  }
});

const run = (script, args, env = {}) => spawnSync("bash", [fileURLToPath(new URL(`../scripts/safe-trial/${script}`, import.meta.url)), ...args], { env: { ...process.env, ...env }, encoding: "utf8" });

test("scan deletes output holding the key or a link", () => {
  for (const plant of [(d) => writeFileSync(join(d, "log"), "x sk-test-value y"), (d) => symlinkSync("/etc/hostname", join(d, "link"))]) {
    const dir = mkdtempSync(join(tmpdir(), "scan-")); plant(dir);
    assert.equal(run("scan.sh", [dir], { NVIDIA_NIM_API_KEY: "sk-test-value" }).status, 1);
    assert.equal(existsSync(dir), false);
  }
  const clean = mkdtempSync(join(tmpdir(), "scan-")); writeFileSync(join(clean, "log"), "fine");
  assert.equal(run("scan.sh", [clean], { NVIDIA_NIM_API_KEY: "sk-test-value" }).status, 0);
});

test("apply checks the paths really changed by the patch", () => {
  const root = mkdtempSync(join(tmpdir(), "apply-")); const product = join(root, "product");
  mkdirSync(join(product, "src"), { recursive: true }); mkdirSync(join(product, ".claude"));
  cpSync(fileURLToPath(new URL("../scripts", import.meta.url)), join(root, "judge/scripts"), { recursive: true });
  const git = (...a) => execFileSync("git", ["-c", "user.name=t", "-c", "user.email=t@example.test", ...a], { cwd: product, encoding: "utf8" });
  writeFileSync(join(product, "src/a.ts"), "1\n"); writeFileSync(join(product, ".claude/settings.json"), "{}\n");
  git("init", "-q"); git("add", "-A"); git("commit", "-qm", "base");
  writeFileSync(join(root, "judge/trial.env"), `BASE_SHA=${git("rev-parse", "HEAD").trim()}\n`);
  for (const [file, status] of [["src/a.ts", 0], [".claude/settings.json", 1]]) {
    git("reset", "-q", "--hard"); writeFileSync(join(product, file), "2\n");
    writeFileSync(join(root, "p.patch"), git("diff")); git("reset", "-q", "--hard");
    assert.equal(run("apply.sh", [join(root, "p.patch")], { TRIAL_ROOT: root }).status, status, file);
  }
});

test("gate forwards model calls only", () => {
  assert.ok(allowed("POST", "/v1/messages?beta=true")); assert.ok(allowed("GET", "/v1/models"));
  for (const [m, u] of [["GET", "/admin"], ["GET", "/v1/../admin"], ["POST", "/admin?x=/v1/messages"], ["DELETE", "/v1/messages"]]) assert.equal(allowed(m, u), false, u);
});

test("hourly resume is paused by policy", () => assert.match(read(".github/workflows/agent-resume.yml"), /\n    if: \$\{\{ false \}\}\n/));

test("engine commands run with a clean environment, never inheriting runner settings", () => {
  assert.doesNotMatch(read("scripts/safe-trial/engine.sh"), /sudo -u trialproxy/);
  assert.match(read("scripts/safe-trial/lib.sh"), /as_proxy\(\) \{ sudo -u trialproxy env -i HOME=\/home\/trialproxy /);
});
