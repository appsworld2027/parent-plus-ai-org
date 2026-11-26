import { test } from "node:test";
import assert from "node:assert/strict";
import { workerUsage } from "../scripts/worker-usage.mjs";

test("exports adapter model and measured fields from the result, without transcripts", () => {
  const events = [
    { type: "assistant", message: { text: "fictional transcript" } },
    { type: "result", modelUsage: { served: { inputTokens: 12, outputTokens: 0 } }, result: "fictional result" },
  ];
  const report = workerUsage(events.map(JSON.stringify).join("\n") + "\n{", { agent_name: "Maya", free_model: "configured" });
  assert.equal(report.rows.length, 1);
  assert.deepEqual(report.rows[0], {
    engine: "github:nvidia", role: "Maya", model: "served", modelSource: "adapter",
    requestedModel: "configured", input: 12, output: 0, cache: null, cost: null,
  });
  assert.doesNotMatch(JSON.stringify(report), /fictional/);
});

test("missing model usage produces an empty report", () => {
  assert.deepEqual(workerUsage('{"type":"result"}', {}).rows, []);
});
