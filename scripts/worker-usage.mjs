// Export numeric usage only. FCC's Claude-compatible model IDs are adapter evidence.
import { readFileSync, writeFileSync } from "node:fs";
import { pathToFileURL } from "node:url";

export function workerUsage(log, route, { item, attempt, at } = {}) {
  let result;
  for (const line of log.split("\n")) {
    try {
      const event = JSON.parse(line);
      if (event?.type === "result") result = event;
    } catch { /* a failed worker can leave an incomplete final line */ }
  }
  const metric = (x) => Number.isFinite(x) && x >= 0 ? x : null;
  return { version: 1, item, attempt, at, rows: Object.entries(result?.modelUsage || {}).map(([model, u]) => ({
    engine: "github:groq", role: route.agent_name, model, modelSource: "adapter", requestedModel: route.free_model,
    input: metric(u?.inputTokens), output: metric(u?.outputTokens),
    cache: metric(u?.cacheReadInputTokens), cost: null,
  })) };
}

if (process.argv[1] && pathToFileURL(process.argv[1]).href === import.meta.url) {
  const [log, route, output] = process.argv.slice(2);
  const report = workerUsage(readFileSync(log, "utf8"), JSON.parse(readFileSync(route, "utf8")), {
    item: Number(process.env.NUMBER), attempt: Number(process.env.GITHUB_RUN_ATTEMPT), at: Date.now(),
  });
  writeFileSync(output, JSON.stringify(report));
}
