import assert from "node:assert/strict";
import { test } from "node:test";
import { resolve } from "node:path";
import { pathToFileURL } from "node:url";

const { createWaitlist } = await import(pathToFileURL(resolve(process.argv[2])));
test("offers the oldest entry for that slot, with FIFO ties broken by join order", () => {
  const q = createWaitlist();
  q.join("other", "x"); q.join("morning", "b"); q.join("morning", "a");
  assert.equal(q.offer("morning"), "b");
  assert.equal(q.offer("morning"), "a");
  assert.equal(q.offer("morning"), null);
  assert.equal(q.offer("other"), "x");
});
test("repeated joins and cancellation do not create duplicate offers", () => {
  const q = createWaitlist();
  q.join("s", "1"); q.join("s", "2"); q.join("s", "1");
  q.cancel("s", "2"); q.cancel("s", "2");
  assert.equal(q.offer("s"), "1");
  assert.equal(q.offer("s"), null);
});
test("cancelled users can rejoin at the back and separate instances never share state", () => {
  const q = createWaitlist();
  const other = createWaitlist();
  q.join("s", "a"); q.join("s", "b"); q.cancel("s", "a"); q.join("s", "a");
  assert.equal(other.offer("s"), null);
  assert.equal(q.offer("s"), "b");
  assert.equal(q.offer("s"), "a");
});
test("validates inputs without changing queued entries", () => {
  const q = createWaitlist();
  q.join("s", "a");
  assert.throws(() => q.join("s", "  "), TypeError);
  assert.throws(() => q.cancel("s", null), TypeError);
  assert.throws(() => q.offer(""), TypeError);
  assert.equal(q.offer("s"), "a");
});
