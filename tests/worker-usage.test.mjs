import { test } from "node:test";
import assert from "node:assert/strict";
import { workerUsage } from "../scripts/worker-usage.mjs";

test("exports adapter model and measured fields from the result, without transcripts", () => {
  const events = [
    { type: "assistant", message: { text: "fictional transcript" } },
    { type: "result", modelUsage: { served: { inputTokens: 12, outputTokens: 0 } }, result: "fictional result" },
  ];
  const report = workerUsage(events.map(JSON.stringify).join("\n") + "\n{", { agent_name: "Maya", free_model: "nvidia/nvidia/nemotron-3-ultra-550b-a55b", free_provider: "nvidia" });
  assert.equal(report.rows.length, 1);
  assert.deepEqual(report.rows[0], {
    engine: "github:nvidia", provider: "nvidia", role: "Maya", model: "nvidia/nvidia/nemotron-3-ultra-550b-a55b", modelSource: "router",
    clientModelAlias: "served", requestedModel: "nvidia/nvidia/nemotron-3-ultra-550b-a55b", input: 12, output: 0, cache: null, cost: null,
    usageSource: "claude-code-client", providerUsageConfirmed: false,
    billingStatus: "free-tier route; provider billing details are not exposed by the adapter",
  });
  assert.doesNotMatch(JSON.stringify(report), /fictional/);
});

test("missing model usage produces an empty report", () => {
  assert.deepEqual(workerUsage('{"type":"result"}', {}).rows, []);
});
