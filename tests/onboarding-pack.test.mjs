import test from "node:test";
import assert from "node:assert/strict";
import { mkdtempSync, mkdirSync, writeFileSync, rmSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { buildPack } from "../scripts/onboarding-pack.mjs";

function fixture(t) {
  const root = mkdtempSync(join(tmpdir(), "ai-org-onboarding-"));
  const product = join(root, "product");
  const handbook = join(root, "handbook");
  const feature = join(product, "docs/product/feature-x");
  for (const dir of [
    join(product, ".ai-org"), join(product, "docs/ai-memory"), feature, join(feature, "handoffs"),
    join(handbook, "org/agents"), join(handbook, "org/lessons")
  ]) mkdirSync(dir, { recursive: true });
  writeFileSync(join(product, ".ai-org/manifest.json"), JSON.stringify({
    product: { docsFolder: "docs/product" }, memory: { folder: "docs/ai-memory" },
    raci: { "ai:discovery": { responsible: ["Maya"], reviewer: ["Arjun"], accountable: "Founder" } }
  }));
  writeFileSync(join(handbook, "org/agents/maya-ai-pm.md"), "ROLE-CARD-SENTINEL");
  writeFileSync(join(handbook, "org/lessons/maya-ai-pm.md"), "ROLE-LESSON-SENTINEL");
  writeFileSync(join(product, "docs/ai-memory/fees-overdue.md"), "MEMORY-CONTENT-SENTINEL ".repeat(1500));
  writeFileSync(join(feature, "ACCEPTANCE.md"), "FEATURE-CONTRACT-SENTINEL");
  const task = join(root, "task.md");
  writeFileSync(task, "EXACT-TASK-SENTINEL");
  t.after(() => rmSync(root, { recursive: true, force: true }));
  return { product, handbook, feature, task };
}

test("onboarding pack keeps role, task and contract while indexing rather than dumping product memory", (t) => {
  const f = fixture(t);
  const pack = buildPack({ role: "maya-ai-pm", stage: "ai:discovery", slug: "feature-x",
    product: f.product, handbook: f.handbook, feature: f.feature, task: f.task, max: 9000 });
  assert.ok(pack.length <= 9000);
  assert.match(pack, /ROLE-CARD-SENTINEL/);
  assert.match(pack, /EXACT-TASK-SENTINEL/);
  assert.match(pack, /FEATURE-CONTRACT-SENTINEL/);
  assert.match(pack, /fees-overdue\.md/);
  assert.doesNotMatch(pack, /MEMORY-CONTENT-SENTINEL/);
});

test("generic tasks do not preload unrelated product memory", (t) => {
  const f = fixture(t);
  const pack = buildPack({ role: "maya-ai-pm", stage: "ai:discovery",
    product: f.product, handbook: f.handbook, task: f.task, max: 9000 });
  assert.match(pack, /EXACT-TASK-SENTINEL/);
  assert.match(pack, /No product memory loaded/);
  assert.doesNotMatch(pack, /fees-overdue\.md|MEMORY-CONTENT-SENTINEL/);
});
