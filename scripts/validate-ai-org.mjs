import { existsSync, readFileSync, readdirSync } from "node:fs";
import { join } from "node:path";

const root = new URL("../", import.meta.url);
const at = (path) => new URL(path, root);
const fail = (message) => { throw new Error(message); };

const pkg = JSON.parse(readFileSync(at("package.json")));
if (pkg.devDependencies["@open-mercato/cezar"] !== "0.20.0") {
  fail("Cezar must be pinned to stable version 0.20.0");
}

const lock = JSON.parse(readFileSync(at("package-lock.json")));
const installed = lock.packages?.["node_modules/@open-mercato/cezar"]?.version;
if (installed !== "0.20.0") fail(`Installed Cezar version is ${installed || "missing"}`);

const manifest = JSON.parse(readFileSync(at("third_party/superpowers/manifest.json")));
if (manifest.version !== "7.0.2" || !/^[0-9a-f]{40}$/.test(manifest.commit)) {
  fail("Superpowers version and commit must be pinned");
}

const skillRoot = at(".ai/skills/superpowers/");
const skillCount = readdirSync(skillRoot, { withFileTypes: true })
  .filter((entry) => entry.isDirectory() && existsSync(join(skillRoot.pathname, entry.name, "SKILL.md")))
  .length;
if (skillCount < 15) fail(`Expected at least 15 Superpowers skills, found ${skillCount}`);

for (const path of [
  ".ai/cezar/config.json",
  ".ai/cezar/workflows/one-team-delivery.yaml",
  ".ai/cezar/workflows/two-team-delivery.yaml",
  ".ai/cezar/workflows/pr-independent-qa.yaml",
  ".ai/cezar/workflows/daily-founder-report.yaml",
  ".ai/automation-templates.json",
  ".ai/skills/parent-plus-database.md",
  ".ai/skills/parent-plus-integration.md",
]) {
  if (!existsSync(at(path))) fail(`Missing required AI organization file: ${path}`);
}

const oneTeam = readFileSync(at(".ai/cezar/workflows/one-team-delivery.yaml"), "utf8");
for (const gate of ["writing-plans", "test-driven-development", "verification-before-completion", "npm run ai:verify"]) {
  if (!oneTeam.includes(gate)) fail(`One-team workflow is missing ${gate}`);
}

const automations = JSON.parse(readFileSync(at(".ai/automation-templates.json")));
if (automations.automations?.length !== 2) fail("Expected two portable automations");

console.log(`AI organization valid: Cezar ${installed}, Superpowers ${manifest.version}, ${skillCount} skills, 4 workflows, 2 automations.`);
