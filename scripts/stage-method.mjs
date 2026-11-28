import { createHash } from "node:crypto";
import { readFileSync, writeFileSync } from "node:fs";
import { fileURLToPath, pathToFileURL } from "node:url";

const root = new URL("../", import.meta.url);
const sha256 = value => createHash("sha256").update(value).digest("hex");
const read = (rootUrl, path) => readFileSync(new URL(path, rootUrl));
const json = (rootUrl, path) => JSON.parse(read(rootUrl, path));
const gitBlobSha = bytes => createHash("sha1").update(`blob ${bytes.length}\0`).update(bytes).digest("hex");

export function prepareStageMethod({ stage, role, rootUrl = root } = {}) {
  const policy = json(rootUrl, "governance/STAGE_METHODS.json");
  const manifest = json(rootUrl, "third_party/superpowers/manifest.json");
  if (policy.schema !== "ai-org-stage-methods/v1" || policy.superpowersVersion !== manifest.version ||
      !/^[0-9a-f]{40}$/.test(manifest.commit)) throw Error("Unverified Superpowers manifest");
  const entry = Object.hasOwn(policy.stages, stage) ? policy.stages[stage] : null;
  if (!entry || !entry.roles.includes(role)) throw Error("Unknown or mismatched stage/role");
  if (!/^[a-z-]+$/.test(entry.skill) || !Object.hasOwn(policy.skills, entry.skill)) throw Error("Unknown method skill");
  const skill = policy.skills[entry.skill];
  const path = `.ai/skills/superpowers/${entry.skill}/SKILL.md`;
  const bytes = read(rootUrl, path);
  if (gitBlobSha(bytes) !== skill.gitBlobSha || !bytes.toString("utf8").includes(skill.excerpt)) {
    throw Error("Superpowers source or excerpt drift: " + path);
  }
  if (typeof entry.method !== "string" || !entry.method.trim() || typeof skill.excerpt !== "string" || !skill.excerpt.trim()) {
    throw Error("Missing method");
  }
  // Curated excerpt, not a claim of full skill execution. Workflow/role/data/authority gates always win.
  const prompt = [
    "## Required stage methodology (bounded Superpowers adaptation)",
    `Stage: ${stage}; role: ${role}; Superpowers ${manifest.version} / ${entry.skill}.`,
    `Verified upstream excerpt: ${skill.excerpt}`,
    `Apply: ${entry.method}`,
    "Work within the exact task, tools, data and permissions. Report evidence and unresolved checks; never invent execution or approval. A distinct reviewer must verify substantive artifacts against the locked contract before promotion. Cezar was not invoked by this worker."
  ].join("\n");
  if (Buffer.byteLength(prompt, "utf8") > 1300) throw Error("Stage method exceeds bounded prompt budget");
  return {
    prompt,
    receipt: {
      schema: "ai-org-stage-method-preparation/v1",
      state: "prepared-not-verified-compliance",
      stage, role, skill: entry.skill, skillGitBlobSha: skill.gitBlobSha,
      upstreamCommit: manifest.commit, methodSha256: sha256(prompt),
      policySha256: sha256(read(rootUrl, "governance/STAGE_METHODS.json")),
      cezar: "not-invoked", independentReviewPassed: false
    }
  };
}

// An explicit live-route implementation and authenticated qualification are required in a later reviewed change.
// A boolean, a model name, a mock run or an agent verdict cannot authorize Cezar execution.
export function requireCezarLiveAdmission() {
  throw Error("Cezar live execution is blocked: existing Codex runner workflows are not admitted free-only routes. Use the zero-spend mock pilot only.");
}

if (process.argv[1] && import.meta.url === pathToFileURL(process.argv[1]).href) {
  const [command, stage, role, promptFile, receiptFile] = process.argv.slice(2);
  if (command === "cezar-live") requireCezarLiveAdmission();
  else if (command === "prepare" && stage && role && promptFile && receiptFile) {
    if (promptFile === receiptFile) throw Error("Prompt and receipt paths must differ");
    const packet = prepareStageMethod({stage, role});
    writeFileSync(promptFile, packet.prompt + "\n", {mode: 0o600});
    writeFileSync(receiptFile, JSON.stringify(packet.receipt, null, 2) + "\n", {mode: 0o600});
  } else throw Error("Usage: stage-method.mjs prepare STAGE ROLE PROMPT_FILE RECEIPT_FILE | cezar-live");
}
