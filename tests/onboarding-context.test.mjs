import test from "node:test";
import assert from "node:assert/strict";
import { mkdtempSync, mkdirSync, writeFileSync, rmSync, existsSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { buildPack } from "../scripts/onboarding-pack.mjs";
import { buildPrompt, pauseComment, STAGE_SUPERPOWERS, STAGE_ROLE } from "../scripts/agent-router.mjs";

function fixture(t) {
  const root = mkdtempSync(join(tmpdir(), "ai-org-onboarding-"));
  t.after(() => rmSync(root, { recursive: true, force: true }));
  const product = join(root, "product");
  const handbook = join(root, "handbook");
  mkdirSync(join(handbook, "org", "agents"), { recursive: true });
  mkdirSync(join(handbook, "org", "lessons"), { recursive: true });
  mkdirSync(join(product, "docs", "ai-memory"), { recursive: true });
  mkdirSync(join(product, ".ai-org"), { recursive: true });
  writeFileSync(join(handbook, "org", "agents", "maya-ai-pm.md"), "name: Maya\nrole: AI Product Manager\n\nUse evidence.");
  writeFileSync(join(handbook, "org", "lessons", "maya-ai-pm.md"), "Keep discovery focused.");
  writeFileSync(join(product, ".ai-org", "manifest.json"), JSON.stringify({ product: { docsFolder: "docs/product" }, memory: { folder: "docs/ai-memory" } }));
  const task = join(root, "task.md");
  writeFileSync(task, "CURRENT_TASK_SENTINEL");
  return { root, product, handbook, task };
}

test("discovery without a feature slug never hydrates the _none_ handover folder", (t) => {
  const f = fixture(t);
  const none = join(f.product, "docs", "product", "_none_", "handoffs");
  mkdirSync(none, { recursive: true });
  writeFileSync(join(none, "99-unrelated.md"), "UNRELATED_NONE_HANDOVER_SENTINEL");

  const pack = buildPack({ role: "maya-ai-pm", stage: "ai:discovery", product: f.product, handbook: f.handbook, task: f.task });

  assert.ok(pack.includes("CURRENT_TASK_SENTINEL"));
  assert.ok(pack.includes("No feature slug is assigned yet"));
  assert.ok(!pack.includes("docs/product/_none_"));
  assert.ok(!pack.includes("UNRELATED_NONE_HANDOVER_SENTINEL"));
});

test("feature onboarding includes only the latest two handovers for that feature", (t) => {
  const f = fixture(t);
  const feature = join(f.product, "docs", "product", "feature-a");
  const handoffs = join(feature, "handoffs");
  const none = join(f.product, "docs", "product", "_none_", "handoffs");
  mkdirSync(handoffs, { recursive: true });
  mkdirSync(none, { recursive: true });
  writeFileSync(join(handoffs, "01-old.md"), "OLD_FEATURE_HANDOVER_SENTINEL");
  writeFileSync(join(handoffs, "02-recent.md"), "RECENT_FEATURE_HANDOVER_SENTINEL");
  writeFileSync(join(handoffs, "03-latest.md"), "LATEST_FEATURE_HANDOVER_SENTINEL");
  writeFileSync(join(none, "99-unrelated.md"), "UNRELATED_NONE_HANDOVER_SENTINEL");

  const pack = buildPack({ role: "maya-ai-pm", stage: "ai:discovery", slug: "feature-a", product: f.product, handbook: f.handbook, task: f.task });

  assert.ok(pack.includes("RECENT_FEATURE_HANDOVER_SENTINEL"));
  assert.ok(pack.includes("LATEST_FEATURE_HANDOVER_SENTINEL"));
  assert.ok(!pack.includes("OLD_FEATURE_HANDOVER_SENTINEL"));
  assert.ok(!pack.includes("UNRELATED_NONE_HANDOVER_SENTINEL"));
});

test("product memory is indexed without loading full memory contents", (t) => {
  const f = fixture(t);
  writeFileSync(join(f.product, "docs", "ai-memory", "fees-overdue.md"), "PRIVATE-MEMORY-CONTENT-SENTINEL ".repeat(500));
  const pack = buildPack({ role: "maya-ai-pm", stage: "ai:discovery", slug: "fees-overdue", product: f.product, handbook: f.handbook, task: f.task, max: 5000 });
  assert.ok(pack.includes("fees-overdue.md"));
  assert.match(pack, /Open only the relevant file/);
  assert.doesNotMatch(pack, /PRIVATE-MEMORY-CONTENT-SENTINEL/);
});
test("bounded onboarding puts the current task first and stays within the 5000-character budget", (t) => {
  const f = fixture(t);
  writeFileSync(join(f.handbook, "org", "agents", "maya-ai-pm.md"), "R".repeat(10000));
  writeFileSync(join(f.handbook, "org", "lessons", "maya-ai-pm.md"), "L".repeat(10000));
  writeFileSync(join(f.product, "docs", "ai-memory", "memory.md"), "M".repeat(10000));

  const pack = buildPack({ role: "maya-ai-pm", stage: "ai:discovery", product: f.product, handbook: f.handbook, task: f.task, max: 5000 });

  assert.ok(pack.length <= 5000);
  assert.ok(pack.includes("CURRENT_TASK_SENTINEL"));
  assert.ok(pack.indexOf("CURRENT_TASK_SENTINEL") < pack.indexOf("Your role and RACI"));
});

test("routine agent prompts do not reload full governance handbooks", () => {
  const prompt = buildPrompt({
    agent: { slug: "maya-ai-pm", name: "Maya", role: "AI Product Manager" },
    number: 91,
    isPR: false,
    repo: "appsworld2027/parent-plus-ai-org",
    stage: "ai:discovery"
  });

  assert.ok(prompt.includes("Read the onboarding pack first"));
  assert.ok(!prompt.includes("--comments"));
  assert.ok(!prompt.includes("ls -R"));
  assert.ok(prompt.includes("Feature slug: not assigned"));
  assert.ok(!prompt.includes("then `.ai-org-handbook/org/agents/"));
  assert.ok(!prompt.includes("Read `.ai-org-handbook/governance/FOUNDER_DASHBOARD.md`"));
  assert.ok(!prompt.includes("Read `.ai-org-handbook/governance/PERSONAL_OPERATING_STANDARD.md`"));
  assert.ok(!prompt.includes("Read `.ai-org-handbook/AGENTS.md`"));
});

test("pause reports the actual free-provider/quota condition without suggesting paid fallback", () => {
  const comment = pauseComment({ agent: { name: "Maya", role: "AI Product Manager" }, stage: "ai:discovery" });
  assert.ok(comment.includes("no approved free engine or usable free quota is available"));
  assert.ok(comment.includes("Paid engines and paid fallback are disabled"));
  assert.ok(!comment.includes("supervised trials"));
});

test("every canonical worker stage points to a pinned, existing Superpowers method without expanding authority", () => {
  for (const [stage, slug] of Object.entries(STAGE_ROLE)) {
    const skill = STAGE_SUPERPOWERS[stage];
    assert.ok(skill, stage);
    assert.ok(existsSync(new URL("../.ai/skills/superpowers/" + skill + "/SKILL.md", import.meta.url)), skill);
    const prompt = buildPrompt({agent:{slug,name:"Test role",role:"Test role"}, stage, number:1, isPR:false, repo:"example/synthetic", toolMode:"readonly"});
    assert.ok(prompt.includes(".ai-org-handbook/.ai/skills/superpowers/" + skill + "/SKILL.md"));
    assert.match(prompt, /never claim use if not read and applied/);
    assert.match(prompt, /locked acceptance gates/);
  }
});

test("generic router loads the shared founder response standard, not another product's reference", () => {
  const agent = { slug: "maya-ai-pm", name: "Maya", role: "AI Product Manager" };
  const prompt = buildPrompt({ agent, number: 21, isPR: false, repo: "example/inventory-app", stage: "ai:discovery" });
  assert.match(prompt, /standards\/FOUNDER_RESPONSE\.md/);
  assert.doesNotMatch(prompt, /Parent Plus founder-response/);
});

test("two independent products with the same feature slug hydrate only their own context", (t) => {
  const a = fixture(t);
  const b = fixture(t);
  for (const [f, marker] of [[a, "PRODUCT_ALPHA_ONLY"], [b, "PRODUCT_BETA_ONLY"]]) {
    const handoffs = join(f.product, "docs", "product", "same-feature", "handoffs");
    mkdirSync(handoffs, { recursive: true });
    writeFileSync(join(handoffs, "01-discovery.md"), marker);
  }
  const pack = (f) => buildPack({
    role: "maya-ai-pm", stage: "ai:discovery", slug: "same-feature",
    product: f.product, handbook: f.handbook, task: f.task
  });
  assert.match(pack(a), /PRODUCT_ALPHA_ONLY/);
  assert.doesNotMatch(pack(a), /PRODUCT_BETA_ONLY/);
  assert.match(pack(b), /PRODUCT_BETA_ONLY/);
  assert.doesNotMatch(pack(b), /PRODUCT_ALPHA_ONLY/);
});

test("A-15 alternate product doc path reaches agent and controller assignments", async () => {
  const { buildIssueBody, discoveryIssueBody } = await import("../scripts/loop.mjs");
  const docsFolder = "docs/feature-specs";
  const agent = { name: "Dev", role: "Builder", slug: "dev" };
  const p = buildPrompt({ agent, number: 9, isPR: false, repo: "example/second-product", stage: "ai:build", featureSlug: "demo", docsFolder });
  assert.ok(p.includes("docs/feature-specs/<slug>/ACCEPTANCE.md"));
  assert.ok(p.includes("docs/feature-specs/demo/handoffs/"));
  assert.ok(!p.includes("docs/product/"));
  assert.ok(buildIssueBody({ pr: 10, branch: "ai/contract-demo", slug: "demo", docsFolder }).includes("docs/feature-specs/demo/ACCEPTANCE.md"));
  assert.ok(discoveryIssueBody({ title: "Demo", slug: "demo" }, docsFolder).includes("docs/feature-specs/demo/ACCEPTANCE.md"));
});

test("A-15 contract lock uses alternate approved docs without relaxing test lock", async () => {
  const { checkContractLock } = await import("../scripts/contract-lock.mjs");
  const opts = { docsFolder: "docs/feature-specs", lockedPaths: ["tests/acceptance/"] };
  const contract = "docs/feature-specs/demo/ACCEPTANCE.md";
  const locked = "tests/acceptance/demo.spec.ts";
  const change = path => ({ status: "M", path });
  assert.equal(checkContractLock({ ...opts, labels: ["ai:contract"], changes: [change(contract), change(locked)] }).ok, true);
  assert.equal(checkContractLock({ ...opts, labels: ["ai:contract"], changes: [change("docs/product/demo/ACCEPTANCE.md"), change(locked)] }).ok, false);
  assert.equal(checkContractLock({ ...opts, labels: ["ai:contract"], changes: [change("src/main.ts"), change(locked)] }).ok, false);
  assert.equal(checkContractLock({ ...opts, labels: ["ai:delivery"], changes: [change(contract), change(locked)], commits: [{ sha: "abc1234", files: [contract, locked] }] }).ok, true);
  assert.equal(checkContractLock({ ...opts, labels: ["ai:delivery"], changes: [change(contract), change(locked)], commits: [{ sha: "abc1234", files: [contract, locked] }], lockedDrift: [locked] }).ok, false);
});

test("A-15 shared product configuration resolves default, alternate and invalid paths", async (t) => {
  const { resolveProductDocsFolder, readProductDocsFolder } = await import("../scripts/product-docs.mjs");
  assert.equal(resolveProductDocsFolder({}), "docs/product");
  assert.equal(resolveProductDocsFolder({ product: { docsFolder: "docs/feature-specs/" } }), "docs/feature-specs");
  for (const docsFolder of ["docs", "src", "../docs", "/tmp/specs", "docs/../src", "docs/ai-memory", "docs/foo\nbar", ""]) {
    assert.throws(() => resolveProductDocsFolder({ product: { docsFolder } }), /product.docsFolder/);
  }
  const root = mkdtempSync(join(tmpdir(), "ai-org-path-config-"));
  t.after(() => rmSync(root, { recursive: true, force: true }));
  mkdirSync(join(root, ".ai-org"));
  writeFileSync(join(root, ".ai-org", "manifest.json"), JSON.stringify({ product: { docsFolder: "docs/feature-specs" } }));
  assert.equal(readProductDocsFolder(root), "docs/feature-specs");
});

test("A-15 contract lock CLI loads docs path from base revision", async (t) => {
  const { execFileSync, spawnSync } = await import("node:child_process");
  const { fileURLToPath } = await import("node:url");
  const root = mkdtempSync(join(tmpdir(), "ai-org-path-lock-"));
  t.after(() => rmSync(root, { recursive: true, force: true }));
  const env = { PATH: process.env.PATH, HOME: root, GIT_CONFIG_NOSYSTEM: "1", GIT_CONFIG_GLOBAL: "/dev/null", GIT_AUTHOR_NAME: "Fixture", GIT_AUTHOR_EMAIL: "fixture@example.invalid", GIT_COMMITTER_NAME: "Fixture", GIT_COMMITTER_EMAIL: "fixture@example.invalid" };
  const git = (...args) => execFileSync("git", args, { cwd: root, env, encoding: "utf8" }).trim();
  git("init", "-q");
  mkdirSync(join(root, ".ai-org"));
  writeFileSync(join(root, ".ai-org", "manifest.json"), JSON.stringify({ product: { docsFolder: "docs/feature-specs" } }));
  git("add", ".ai-org/manifest.json");
  git("commit", "-qm", "Base configuration");
  const base = git("rev-parse", "HEAD");
  mkdirSync(join(root, "docs", "feature-specs", "demo"), { recursive: true });
  mkdirSync(join(root, "tests", "acceptance"), { recursive: true });
  writeFileSync(join(root, "docs", "feature-specs", "demo", "ACCEPTANCE.md"), "AC-01 fixture");
  writeFileSync(join(root, "tests", "acceptance", "demo.spec.ts"), "// fixture locked test");
  git("add", "docs", "tests");
  git("commit", "-qm", "Valid contract");
  const controller = fileURLToPath(new URL("../scripts/contract-lock.mjs", import.meta.url));
  const check = () => spawnSync(process.execPath, [controller], {
    cwd: root, encoding: "utf8",
    env: { ...env, BASE_REF: base, CONTRACT_LOCK_HEAD: "HEAD", PR_LABELS: "ai:contract", CONTRACT_LOCK_PATHS: "tests/acceptance/" }
  });
  const valid = check();
  assert.equal(valid.status, 0, valid.stderr + valid.stdout);
  assert.match(valid.stdout, /contract-lock: PASS/);
  writeFileSync(join(root, ".ai-org", "manifest.json"), JSON.stringify({ product: { docsFolder: "docs/other" } }));
  mkdirSync(join(root, "docs", "other", "demo"), { recursive: true });
  writeFileSync(join(root, "docs", "other", "demo", "ACCEPTANCE.md"), "unapproved location");
  git("add", ".ai-org", "docs");
  git("commit", "-qm", "Candidate attempts path change");
  const invalid = check();
  assert.notEqual(invalid.status, 0);
  assert.match(invalid.stdout, /contract-lock: FAIL/);
  assert.match(invalid.stdout, /docs\/other\/demo\/ACCEPTANCE.md/);
});

test("A-15 onboarding hydrates only the configured alternate product directory", (t) => {
  const f = fixture(t);
  const root = join(f.product, "docs", "feature-specs", "demo");
  const defaultRoot = join(f.product, "docs", "product", "demo");
  writeFileSync(join(f.product, ".ai-org", "manifest.json"), JSON.stringify({ product: { docsFolder: "docs/feature-specs" } }));
  mkdirSync(join(root, "handoffs"), { recursive: true });
  mkdirSync(join(defaultRoot, "handoffs"), { recursive: true });
  writeFileSync(join(root, "ACCEPTANCE.md"), "ALTERNATE_CONTRACT_SENTINEL");
  writeFileSync(join(root, "handoffs", "01-discovery-maya.md"), "ALTERNATE_HANDOVER_SENTINEL");
  writeFileSync(join(defaultRoot, "ACCEPTANCE.md"), "WRONG_DEFAULT_SENTINEL");
  const pack = buildPack({ role: "maya-ai-pm", stage: "ai:discovery", slug: "demo", product: f.product, handbook: f.handbook });
  assert.ok(pack.includes("ALTERNATE_CONTRACT_SENTINEL"));
  assert.ok(pack.includes("ALTERNATE_HANDOVER_SENTINEL"));
  assert.ok(!pack.includes("WRONG_DEFAULT_SENTINEL"));
  assert.ok(pack.includes("docs/feature-specs"));
});

test("A-15 worker workflow shares path configuration across route, acceptance and handover", async () => {
  const { readFileSync } = await import("node:fs");
  const { parse } = await import("yaml");
  const { spawnSync } = await import("node:child_process");
  const workflow = parse(readFileSync(new URL("../.github/workflows/agent-worker.yml", import.meta.url), "utf8"));
  const steps = Object.values(workflow.jobs).flatMap(job => job.steps || []);
  const route = steps.find(step => step.name === "Route");
  const onboarding = steps.find(step => step.name === "Onboarding pack");
  const acceptance = steps.find(step => (step.run || "").includes("scripts/grade-acceptance.mjs"));
  const handover = steps.find(step => step.name === "Handover check");
  assert.match(route.run, /docs_folder=\$\(node .*product-docs\.mjs\)/);
  assert.match(route.run, /docs_folder=%s/);
  assert.match(onboarding.run, /feature-wt\/\$docs_folder\/\$SLUG/);
  assert.match(acceptance.run, /--contract "\$docs_folder\/\$SLUG\/ACCEPTANCE.md"/);
  assert.match(handover.run, /"\$docs_folder\/\$slug\/handoffs\//);
  for (const step of [route, onboarding, acceptance, handover]) {
    const syntax = spawnSync("bash", ["-n"], { input: step.run, encoding: "utf8" });
    assert.equal(syntax.status, 0, step.name + ": " + syntax.stderr);
  }
});
