import { readFileSync } from "node:fs";
import { pathToFileURL } from "node:url";
export function classifyWorkerResult({ processCode, jsonl, stderr = "", toolMode = "readonly" }) {
  let final = null, toolUses = 0;
  try {
    for (const line of jsonl.split(/\r?\n/)) {
      if (!line.trim()) continue;
      const event = JSON.parse(line);
      if (event.type === "result") final = event;
      if (event.type === "assistant" && Array.isArray(event.message?.content)) toolUses += event.message.content.filter(c => c?.type === "tool_use").length;
    }
  } catch { return { exitCode: processCode || 1, kind: "failed" }; }
  if (!processCode && final?.subtype === "success" && final?.is_error === false) {
    // A standard execution must actually invoke a tool. Read-only reports are different.
    if (toolMode === "standard" && toolUses === 0) return { exitCode: 1, kind: "incomplete" };
    return { exitCode: 0, kind: "completed" };
  }
  const exitCode = processCode || 1;
  const detail = [final?.is_error === true && typeof final.result === "string" ? final.result : "", stderr].join("\n");
  if (/response exceeded the \d+ output token maximum|output token ceiling exhausted/i.test(detail)) return { exitCode, kind: "output-limit" };
  if (/\bHTTP\s+413\b|request too large for model|input tokens per minute.*limit/i.test(detail)) return { exitCode, kind: "request-too-large" };
  if (/\bHTTP\s+429\b|rate_limit_exceeded|too many requests|rate limit|tokens per minute/i.test(detail)) return { exitCode, kind: "transient-quota" };
  return { exitCode, kind: "failed" };
}
if (process.argv[1] && import.meta.url === pathToFileURL(process.argv[1]).href) {
  const read = p => { try { return readFileSync(p, "utf8"); } catch { return ""; } };
  const [, , code, jsonl, stderr, toolMode] = process.argv;
  console.log(JSON.stringify(classifyWorkerResult({ processCode: Number(code) || 0, jsonl: read(jsonl), stderr: read(stderr), toolMode })));
}
