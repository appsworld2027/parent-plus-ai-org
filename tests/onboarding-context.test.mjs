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
