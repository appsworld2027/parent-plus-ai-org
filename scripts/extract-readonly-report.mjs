import { readFileSync } from "node:fs";
import { pathToFileURL } from "node:url";

// Keep the complete bounded assistant report, not a suffix that can drop the verdict.
export function extractReadonlyReport(jsonl, maxBytes = 12000) {
  const texts = [];
  for (const line of jsonl.split(/\r?\n/)) {
    if (!line.trim()) continue;
    const event = JSON.parse(line);
    if (event.type !== "assistant") continue;
    for (const part of event.message?.content ?? []) {
      if (part.type === "text" && typeof part.text === "string" && part.text.trim()) texts.push(part.text);
    }
  }
  const report = texts.join("\n").trim();
  if (!report) throw new Error("No final assistant report was available to publish.");
  if (Buffer.byteLength(report, "utf8") > maxBytes) throw new Error("Read-only report exceeds bounded size; report rejected without truncation.");
  return report;
}
if (process.argv[1] && import.meta.url === pathToFileURL(process.argv[1]).href) {
  try { console.log(extractReadonlyReport(readFileSync(process.argv[2], "utf8"))); }
  catch (error) { console.error(error.message); process.exitCode = 1; }
}
