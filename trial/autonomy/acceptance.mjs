import { execFileSync } from "node:child_process";
import { createHash } from "node:crypto";
import { copyFileSync, existsSync, mkdirSync, readFileSync } from "node:fs";
import { resolve } from "node:path";

const candidate = resolve(process.argv[2] ?? "trial/autonomy/waitlist.mjs");
const cwd = "trial/autonomy/parent-feedback-preview/tests/acceptance";
if (process.env.RUNNER_TEMP && process.argv[2]) {
  const evidence = resolve(process.env.RUNNER_TEMP, "evidence");
  mkdirSync(evidence, { recursive: true });
  copyFileSync(candidate, resolve(evidence, "waitlist.mjs"));
}
console.log("Candidate SHA-256:", createHash("sha256").update(readFileSync(candidate)).digest("hex"));
const browser = ["/usr/bin/google-chrome", "/usr/bin/google-chrome-stable", "/usr/bin/chromium"]
  .find((path) => existsSync(path));
if (browser) process.env.CHROMIUM_PATH = browser;
execFileSync("npm", ["ci", "--no-fund", "--no-audit"], { cwd, stdio: ["ignore", 2, 2] });
if (!browser) {
  execFileSync("node", ["node_modules/playwright/cli.js", "install", "chromium"], {
    cwd, stdio: ["ignore", 2, 2], env: { ...process.env, PLAYWRIGHT_HOST_PLATFORM_OVERRIDE: "ubuntu24.04-x64" },
  });
}
execFileSync("node", ["feedback.mjs", candidate], { cwd, stdio: "inherit" });
