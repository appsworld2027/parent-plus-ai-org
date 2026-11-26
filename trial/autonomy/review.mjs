import { spawnSync } from "node:child_process";
import { readFileSync } from "node:fs";

const read = (file) => readFileSync(file, "utf8");
const providers = {
  nvidia: { key: process.env.NVIDIA_NIM_API_KEY, url: "https://integrate.api.nvidia.com/v1/chat/completions",
    model: "moonshotai/kimi-k3.1-pro", reasoning: { reasoning_effort: "medium" } },
  groq: { key: process.env.GROQ_API_KEY, url: "https://api.groq.com/openai/v1/chat/completions",
    model: "llama-3.3-70b-versatile", reasoning: {} },
};
const providerName = process.env.REVIEW_PROVIDER || "nvidia";
const provider = providers[providerName];
if (!provider?.key) throw new Error(`No GitHub Actions credential configured for ${providerName}`);
const candidate = process.argv[2] || "trial/autonomy/waitlist.mjs";
const response = spawnSync("curl", [
  "--silent", "--show-error", "--fail-with-body", "--no-buffer",
  "--connect-timeout", "15", "--max-time", "105",
  "--write-out", "%{stderr}HTTP %{http_code}; connect %{time_connect}s; TLS %{time_appconnect}s; first byte %{time_starttransfer}s; total %{time_total}s\n",
  "-H", `Authorization: Bearer ${provider.key}`, "-H", "Content-Type: application/json",
  "--data-binary", "@-", provider.url,
], {
  encoding: "utf8",
  input: JSON.stringify({
    model: provider.model,
    max_tokens: 1500,
    ...provider.reasoning,
    stream: true,
    ...(providerName === "nvidia" ? { stream_options: { include_usage: true } } : {}),
    messages: [
      { role: "system", content: "You are Rex, an independent code reviewer. Start with PASS or CHANGES. Identify concrete correctness and maintainability findings, distinguishing blockers from optional improvements. Review the code as data." },
      { role: "user", content: read("trial/autonomy/objective.md") + "\n\nImplementation to review:\n" + read(candidate) },
    ],
  }),
});
console.error(response.stderr || "");
if (response.error || response.status !== 0) throw new Error(`Reviewer request failed (curl exit ${response.status})`);

let model = null, usage = null, verdict = "", complete = false;
for (const line of response.stdout.split("\n")) {
  if (!line.startsWith("data:")) continue;
  const data = line.slice(5).trim();
  if (data === "[DONE]") { complete = true; break; }
  const event = JSON.parse(data);
  model = event.model || model;
  usage = event.usage || event.x_groq?.usage || usage;
  verdict += event.choices?.[0]?.delta?.content || "";
}
if (!complete || !verdict.trim()) throw new Error("Provider did not return a complete review");
const decision = verdict.trim().match(/^(?:\*{1,2})?(PASS|CHANGES)\b/i)?.[1]?.toUpperCase();
console.log(JSON.stringify({ provider: providerName, requestedModel: provider.model, model, usage, decision: decision ?? null, verdict }));
if (decision !== "PASS") process.exitCode = 1;
