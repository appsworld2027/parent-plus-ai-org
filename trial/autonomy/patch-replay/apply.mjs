import { createHash } from "node:crypto";
import { readFileSync, writeFileSync } from "node:fs";

export function applyModelPatch(candidate) {
  const base = readFileSync(new URL("./base.html", import.meta.url), "utf8");
  const digest = createHash("sha256").update(base).digest("hex");
  if (digest !== "c56efa7d798951da4e20f880192d44ed64b18605a7d72d3ece47d787c26c8315") {
    throw new Error("Patch base does not match the failed candidate");
  }

  const output = readFileSync(candidate, "utf8");
  const match = /^===BEFORE===\n([\s\S]+?)\n===AFTER===\n([\s\S]+?)\n===END===\n?$/.exec(output);
  if (!match) throw new Error("Expected one delimited source replacement");
  const [, before, after] = match;
  if (before === after || before.length > 500 || after.length > 650) {
    throw new Error("Expected one bounded source replacement");
  }
  const start = base.indexOf(before);
  if (start === -1 || start !== base.lastIndexOf(before)) {
    throw new Error("Patch anchor must occur exactly once");
  }

  console.log("Dev source replacement:", JSON.stringify({ before, after }));
  writeFileSync(candidate, base.slice(0, start) + after + base.slice(start + before.length));
}
