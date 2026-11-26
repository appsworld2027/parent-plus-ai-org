import test from "node:test";
import assert from "node:assert/strict";
import { greet } from "../src/greeting.mjs";

test("greets a name after trimming whitespace", () => {
  assert.equal(greet("  Maya  "), "Hello, Maya!");
});

test("uses a friendly fallback for a blank name", () => {
  assert.equal(greet("   "), "Hello, there!");
});

test("uses a friendly fallback for nullish names", () => {
  assert.equal(greet(null), "Hello, there!");
  assert.equal(greet(undefined), "Hello, there!");
});
