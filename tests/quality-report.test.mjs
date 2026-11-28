import test from "node:test";
import assert from "node:assert/strict";
import { mkdtempSync, mkdirSync, writeFileSync, readFileSync, rmSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { fileURLToPath } from "node:url";
import { execFileSync } from "node:child_process";

const script = fileURLToPath(new URL("../scripts/quality-report.mjs", import.meta.url));
const headers = {
  "feature-registry.csv": ["Feature ID", "Feature Name", "Implementation Status", "Requirement Source", "Acceptance Criteria"],
  "test-scenario-registry.csv": ["Scenario ID", "Feature ID", "Scenario Description", "Expected Outcome", "Actual Outcome", "Result", "Last Execution", "Evidence"],
  "traceability.csv": ["Feature ID", "Scenario ID", "Requirement Evidence", "Implementation Evidence", "Test Evidence", "Independent Review", "Release Gate Status"]
};
const quote = (value) => '"' + String(value).replaceAll('"', '""') + '"';
const feature = (id = "F-1", status = "IMPLEMENTED") => [id, 'Issue, with "quotes"', status, "requirements.md", "AC-01"];
const scenario = (id = "S-1", featureId = "F-1", result = "PASS", evidence = "run-1") =>
  [id, featureId, "First line\nSecond line", "works", "worked", result, "2026-11-28", evidence];
const trace = (featureId = "F-1", scenarioId = "S-1") =>
  [featureId, scenarioId, "req-1", "commit-1", "run-1", "APPROVED", "READY"];

function run(t, { features = [], scenarios = [], traces = [], raw } = {}) {
  const root = mkdtempSync(join(tmpdir(), "ai-org-quality-report-"));
  t.after(() => rmSync(root, { recursive: true, force: true }));
  mkdirSync(join(root, "qa"));
  for (const [file, rows] of Object.entries({
    "feature-registry.csv": features,
    "test-scenario-registry.csv": scenarios,
    "traceability.csv": traces
  })) {
    writeFileSync(join(root, "qa", file), raw?.[file] ??
      [headers[file].join(","), ...rows.map(row => row.map(quote).join(","))].join("\r\n") + "\r\n");
  }
  execFileSync(process.execPath, [script], {
    cwd: root, env: { ...process.env, GITHUB_REPOSITORY: "example/inventory-app" }, stdio: "pipe"
  });
  return {
    json: JSON.parse(readFileSync(join(root, "evidence", "quality-report.json"), "utf8")),
    markdown: readFileSync(join(root, "evidence", "QUALITY-REPORT.md"), "utf8")
  };
}

test("empty registries never report ready", t => {
  const { json } = run(t);
  assert.equal(json.qualityStatus, "NEEDS_REVIEW");
  assert.equal(json.releaseReadiness, "UNVERIFIED");
  assert.equal(json.featuresIndexed, 0);
});

test("pending clarification after the first row blocks registry completeness", t => {
  const { json } = run(t, { features: [feature(), feature("F-2", "PENDING_CLARIFICATION")],
    scenarios: [scenario()], traces: [trace()] });
  assert.equal(json.qualityStatus, "NEEDS_REVIEW");
  assert.match(json.reviewReasons.join(" "), /F-2/);
});

test("template registry rows never inflate indexed coverage or pass count", t => {
  const { json } = run(t, { features: [feature("TEMPLATE-001", "PENDING_CLARIFICATION")],
    scenarios: [scenario("TEMPLATE-001-T01", "TEMPLATE-001", "NOT_RUN")],
    traces: [trace("TEMPLATE-001", "TEMPLATE-001-T01")] });
  assert.equal(json.featuresIndexed, 0);
  assert.equal(json.scenariosIndexed, 0);
  assert.equal(json.traceabilityRows, 0);
  assert.equal(json.recordedPassed, 0);
  assert.equal(json.qualityStatus, "NEEDS_REVIEW");
});

test("PASS without evidence or skipped tests are not counted as recorded passes", t => {
  const { json } = run(t, { features: [feature()],
    scenarios: [scenario("S-1", "F-1", "PASS", ""), scenario("S-2", "F-1", "SKIPPED")],
    traces: [trace(), trace("F-1", "S-2")] });
  assert.equal(json.recordedPassed, 0);
  assert.equal(json.qualityStatus, "NEEDS_REVIEW");
});

test("recorded pass data remains distinct from independently verified release readiness", t => {
  const { json, markdown } = run(t, { features: [feature()], scenarios: [scenario()], traces: [trace()] });
  assert.equal(json.featuresIndexed, 1);
  assert.equal(json.scenariosIndexed, 1);
  assert.equal(json.recordedPassed, 1);
  assert.equal(json.qualityStatus, "RECORDED_EVIDENCE");
  assert.equal(json.releaseReadiness, "UNVERIFIED");
  assert.match(markdown, /example\/inventory-app/);
  assert.match(markdown, /not independently verified/i);
  assert.doesNotMatch(markdown, /Parent Plus/);
});

test("duplicate and orphan scenario IDs require review", t => {
  const { json } = run(t, { features: [feature()],
    scenarios: [scenario(), scenario("S-1", "F-404")], traces: [trace()] });
  assert.equal(json.qualityStatus, "NEEDS_REVIEW");
  assert.match(json.reviewReasons.join(" "), /duplicate/i);
  assert.match(json.reviewReasons.join(" "), /F-404/);
});

test("mismatched trace and missing feature scenario coverage require review", t => {
  const { json } = run(t, { features: [feature()], scenarios: [scenario()],
    traces: [trace("F-404", "S-1")] });
  assert.equal(json.qualityStatus, "NEEDS_REVIEW");
  assert.match(json.reviewReasons.join(" "), /trace/i);
});

test("malformed CSV fails explicitly instead of producing a readiness report", t => {
  assert.throws(() => run(t, { raw: { "feature-registry.csv": headers["feature-registry.csv"].join(",") + '\n"unterminated' } }),
    /CSV|unterminated/i);
});

test("checked-in QA registry templates generate an honest unverified report", t => {
  const raw = Object.fromEntries(Object.keys(headers).map(file => [file,
    readFileSync(fileURLToPath(new URL("../qa/" + file, import.meta.url)), "utf8")]));
  const { json } = run(t, { raw });
  assert.equal(json.featuresIndexed, 0);
  assert.equal(json.scenariosIndexed, 0);
  assert.equal(json.traceabilityRows, 0);
  assert.equal(json.templateRowsExcluded, 3);
  assert.equal(json.qualityStatus, "NEEDS_REVIEW");
  assert.equal(json.releaseReadiness, "UNVERIFIED");
});
