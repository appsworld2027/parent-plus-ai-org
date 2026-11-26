import assert from "node:assert/strict";
import test from "node:test";
import handler from "../api/mcp.js";

test("retired endpoint rejects discovery and workflow calls without network access", (t) => {
  const fetch = t.mock.method(globalThis, "fetch", () => {
    throw new Error("Retired endpoint must not make requests");
  });
  for (const req of [
    { method: "GET" },
    { method: "POST", body: { method: "initialize" } },
    { method: "POST", body: { method: "tools/call", params: { name: "appsworld_founder_flow", arguments: { action: "discover" } } } },
  ]) {
    const res = {
      status(code) { assert.equal(code, 410); return this; },
      json(body) { assert.match(body.error, /retired/); },
    };
    handler(req, res);
  }
  assert.equal(fetch.mock.callCount(), 0);
});
