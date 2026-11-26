import { createHash } from "node:crypto";
import { readFileSync, writeFileSync } from "node:fs";

export function applyModelPatch(candidate) {
  const base = readFileSync(new URL("./base.html", import.meta.url), "utf8");
  const digest = createHash("sha256").update(base).digest("hex");
  if (digest !== "a41732f6d1efc1cdb30b507ea215b160e0f31dcf1d8c738fe02d2305f8889bcb") {
    throw new Error("Patch base does not match the failed candidate");
  }

  const patch = JSON.parse(readFileSync(candidate, "utf8"));
  const { before, after } = patch;
  if (Object.keys(patch).length !== 2 || typeof before !== "string" ||
      typeof after !== "string" || !before || before === after ||
      before.length > 500 || after.length > 650) {
    throw new Error("Expected one bounded source replacement");
  }
  const start = base.indexOf(before);
  if (start === -1 || start !== base.lastIndexOf(before)) {
    throw new Error("Patch anchor must occur exactly once");
  }

  console.log("Dev source replacement:", JSON.stringify(patch));
  writeFileSync(candidate, base.slice(0, start) + after + base.slice(start + before.length));
}
