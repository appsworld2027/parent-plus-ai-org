import { execFileSync } from "node:child_process";
import { resolve } from "node:path";

const candidate = resolve(process.argv[2] ?? "trial/autonomy/waitlist.mjs");
const cwd = "trial/autonomy/parent-feedback-preview/tests/acceptance";
execFileSync("npm", ["ci", "--no-fund", "--no-audit"], { cwd, stdio: ["ignore", 2, 2] });
execFileSync("node", ["node_modules/playwright/cli.js", "install", "chromium"], { cwd, stdio: ["ignore", 2, 2] });
execFileSync("node", ["feedback.mjs", candidate], { cwd, stdio: "inherit" });
