#!/usr/bin/env node
import { readFileSync, writeFileSync, mkdirSync, existsSync } from "node:fs";

// Registry entries are declarations, not verified execution receipts. Never infer
// release approval from a CSV flag (even if every row reports success).
function readRegistry(path, required) {
  const text = readFileSync(path, "utf8").replace(/^\uFEFF/, "");
  const rows = [];
  let row = [], field = "", quoted = false, closed = false;
  const fail = (reason) => { throw new Error("Invalid CSV in " + path + ": " + reason); };
  const endField = () => { row.push(field.trim()); field = ""; closed = false; };
  const endRow = () => {
    endField();
    if (row.some(Boolean)) rows.push(row);
    row = [];
  };
  for (let i = 0; i < text.length; i++) {
    const c = text[i];
    if (quoted) {
      if (c !== '"') field += c;
      else if (text[i + 1] === '"') { field += '"'; i++; }
      else { quoted = false; closed = true; }
    } else if (c === ",") endField();
    else if (c === "\r" || c === "\n") {
      if (c === "\r" && text[i + 1] === "\n") i++;
      endRow();
    } else if (c === '"') {
      if (field || closed) fail("quote within an unquoted field");
      quoted = true;
    } else {
      if (closed) fail("unexpected character after closing quote");
      field += c;
    }
  }
  if (quoted) fail("unterminated quoted field");
  if (row.length || field || closed) endRow();
  const header = rows.shift();
  if (!header || new Set(header).size !== header.length || required.some(key => !header.includes(key))) {
    fail("missing or duplicate required header");
  }
  return rows.map((cells, i) => {
    if (cells.length !== header.length) fail("row " + (i + 2) + " has " + cells.length + " fields; expected " + header.length);
    return Object.fromEntries(header.map((key, j) => [key, cells[j]]));
  });
}

const upper = value => (value || "").toUpperCase();
const template = value => /^TEMPLATE-/i.test(value || "");
const profiles = {
  canonical: ["qa/feature-registry.csv", "qa/test-scenario-registry.csv", "qa/traceability.csv"],
  "workspace-v1": ["ai-workspace/qa/feature-registry.csv", "ai-workspace/qa/scenario-registry.csv", "ai-workspace/qa/traceability.csv"]
};
const args = process.argv.slice(2);
let registryProfile;
if (args.length) {
  if (args.length !== 2 || args[0] !== "--registry-profile" || !Object.hasOwn(profiles, args[1])) {
    throw new Error("Usage: quality-report.mjs [--registry-profile canonical|workspace-v1]");
  }
  registryProfile = args[1];
} else {
  const present = Object.entries(profiles).filter(([, files]) => files.some(existsSync)).map(([name]) => name);
  if (present.length > 1) throw new Error("Ambiguous registry layouts; choose --registry-profile explicitly. Never mix registry sets.");
  registryProfile = present[0] || "canonical";
}
const registryFiles = profiles[registryProfile];
const missing = registryFiles.filter(path => !existsSync(path));
if (missing.length) throw new Error("Incomplete " + registryProfile + " registry set: " + missing.join(", "));
const schemaLimitations = registryProfile === "workspace-v1" ? [
  "Workspace-v1 schema does not record acceptance criteria, actual test outcomes, execution dates, independent review verdicts or release gate status; missing fields remain unverified."
] : [];
let featureRows, scenarioRows, traceRows;
if (registryProfile === "canonical") {
  featureRows = readRegistry(registryFiles[0], [
    "Feature ID", "Feature Name", "Implementation Status", "Requirement Source", "Acceptance Criteria"
  ]);
  scenarioRows = readRegistry(registryFiles[1], [
    "Scenario ID", "Feature ID", "Scenario Description", "Expected Outcome", "Actual Outcome", "Result", "Last Execution", "Evidence"
  ]);
  traceRows = readRegistry(registryFiles[2], [
    "Feature ID", "Scenario ID", "Requirement Evidence", "Implementation Evidence", "Test Evidence", "Independent Review", "Release Gate Status"
  ]);
} else {
  featureRows = readRegistry(registryFiles[0], ["feature_id","master_feature","feature","sub_feature","user_journey","source","status","evidence"]).map(r => ({
    "Feature ID": r.feature_id, "Feature Name": r.feature, "Implementation Status": r.status,
    "Requirement Source": r.source, "Acceptance Criteria": ""
  }));
  scenarioRows = readRegistry(registryFiles[1], ["scenario_id","feature_id","scenario_type","scenario","preconditions","expected_result","status","evidence"]).map(r => ({
    "Scenario ID": r.scenario_id, "Feature ID": r.feature_id, "Scenario Description": r.scenario,
    "Expected Outcome": r.expected_result, "Actual Outcome": "", "Result": r.status,
    "Last Execution": "", "Evidence": r.evidence
  }));
  traceRows = readRegistry(registryFiles[2], ["trace_id","requirement_or_source","feature_id","scenario_id","implementation","evidence","status"]).map(r => ({
    "Feature ID": r.feature_id, "Scenario ID": r.scenario_id, "Requirement Evidence": r.requirement_or_source,
    "Implementation Evidence": r.implementation, "Test Evidence": r.evidence,
    "Independent Review": "", "Release Gate Status": ""
  }));
}
const features = featureRows.filter(row => !template(row["Feature ID"]));
const scenarios = scenarioRows.filter(row => !template(row["Scenario ID"]) && !template(row["Feature ID"]));
const trace = traceRows.filter(row => !template(row["Feature ID"]) && !template(row["Scenario ID"]));
const reviewReasons = [...schemaLimitations];
const reason = text => reviewReasons.push(text);
const group = (rows, field) => {
  const map = new Map();
  for (const row of rows) {
    const value = row[field];
    if (!map.has(value)) map.set(value, []);
    map.get(value).push(row);
  }
  return map;
};
const featureById = group(features, "Feature ID");
const scenarioById = group(scenarios, "Scenario ID");
if (!features.length) reason("No real features are registered.");
if (!scenarios.length) reason("No real test scenarios are registered.");
if (!trace.length) reason("No real traceability links are registered.");
for (const [id, rows] of featureById) {
  if (!id || rows.length !== 1) reason("Missing or duplicate feature ID: " + (id || "(blank)"));
}
for (const [id, rows] of scenarioById) {
  if (!id || rows.length !== 1) reason("Missing or duplicate scenario ID: " + (id || "(blank)"));
}
const scenariosByFeature = group(scenarios, "Feature ID");
const traceByScenario = group(trace, "Scenario ID");
for (const feature of features) {
  const id = feature["Feature ID"];
  if (!feature["Feature Name"] || !feature["Requirement Source"] || !feature["Acceptance Criteria"] ||
      upper(feature["Implementation Status"]) !== "IMPLEMENTED") {
    reason("Feature " + (id || "(blank)") + " is not recorded as implemented with requirements and acceptance criteria.");
  }
  if (!scenariosByFeature.has(id)) reason("Feature " + (id || "(blank)") + " has no registered test scenario.");
}

let recordedPassed = 0;
for (const scenario of scenarios) {
  const id = scenario["Scenario ID"], featureId = scenario["Feature ID"];
  const unique = id && scenarioById.get(id)?.length === 1;
  const validFeature = featureId && featureById.get(featureId)?.length === 1;
  if (!validFeature) reason("Scenario " + (id || "(blank)") + " refers to missing or ambiguous feature " + (featureId || "(blank)") + ".");
  const recordedPass = unique && validFeature && ["PASS", "PASSED"].includes(upper(scenario.Result)) &&
    ["Scenario Description", "Expected Outcome", "Actual Outcome", "Last Execution", "Evidence"].every(field => scenario[field]);
  if (recordedPass) recordedPassed++;
  else reason("Scenario " + (id || "(blank)") + " has no complete, unique recorded pass.");
  const links = traceByScenario.get(id) || [];
  if (links.length !== 1 || links[0]["Feature ID"] !== featureId) {
    reason("Scenario " + (id || "(blank)") + " needs exactly one matching feature-to-test trace.");
  }
}
for (const link of trace) {
  const featureId = link["Feature ID"], scenarioId = link["Scenario ID"];
  const referenced = scenarioById.get(scenarioId);
  if (!featureId || featureById.get(featureId)?.length !== 1 || !scenarioId ||
      referenced?.length !== 1 || referenced[0]["Feature ID"] !== featureId) {
    reason("Trace " + (scenarioId || "(blank)") + " refers to a missing or mismatched feature/scenario.");
  }
  if (!["Requirement Evidence", "Implementation Evidence", "Test Evidence"].every(field => link[field]) ||
      upper(link["Independent Review"]) !== "APPROVED" || upper(link["Release Gate Status"]) !== "READY") {
    reason("Trace " + (scenarioId || "(blank)") + " lacks recorded evidence or review/gate status.");
  }
}

const product = (process.env.GITHUB_REPOSITORY || "AppsWorld AI Organization").replace(/[\r\n]/g, " ").trim();
const report = {
  generatedAt: new Date().toISOString(),
  product,
  registryProfile, registryFiles, schemaLimitations,
  featuresIndexed: features.length,
  scenariosIndexed: scenarios.length,
  traceabilityRows: trace.length,
  templateRowsExcluded: featureRows.length + scenarioRows.length + traceRows.length - features.length - scenarios.length - trace.length,
  recordedPassed,
  qualityStatus: reviewReasons.length ? "NEEDS_REVIEW" : "RECORDED_EVIDENCE",
  releaseReadiness: "UNVERIFIED",
  reviewReasons
};
mkdirSync("evidence", { recursive: true });
writeFileSync("evidence/quality-report.json", JSON.stringify(report, null, 2) + "\n");
const summary = [
  "# " + product + " — Quality Report", "",
  "- Registry profile: " + report.registryProfile,
  "- Real features indexed: " + report.featuresIndexed,
  "- Real scenarios indexed: " + report.scenariosIndexed,
  "- Real traceability rows: " + report.traceabilityRows,
  "- Template rows excluded: " + report.templateRowsExcluded,
  "- Recorded passes with evidence references: " + report.recordedPassed,
  "- Registry status: **" + report.qualityStatus + "**",
  "- Release readiness: **UNVERIFIED**", "",
  "Recorded results are not independently verified test outcomes. Registry completeness is not release approval. No unrun, skipped, blocked or template scenario is counted as a recorded pass.",
  ...reviewReasons.slice(0, 20).map(text => "- " + text.replace(/[\r\n]/g, " ")),
  ...(reviewReasons.length > 20 ? ["- Remaining review reasons are in quality-report.json."] : []), ""
].join("\n");
writeFileSync("evidence/QUALITY-REPORT.md", summary);
console.log(JSON.stringify(report));
