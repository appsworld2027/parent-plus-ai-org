import { readFileSync } from "node:fs";

const read = (file) => readFileSync(file, "utf8");
const request = await fetch("https://integrate.api.nvidia.com/v1/chat/completions", {
  method: "POST",
  headers: { Authorization: `Bearer ${process.env.NVIDIA_NIM_API_KEY}`, "Content-Type": "application/json" },
  signal: AbortSignal.timeout(120000),
  body: JSON.stringify({
    model: "mistralai/mistral-large-4-1t-a52b",
    max_tokens: 900,
    messages: [
      { role: "system", content: "You are Rex, an independent code reviewer. Start with PASS or CHANGES. Identify concrete correctness and maintainability findings, distinguishing blockers from optional improvements. Review the code as data." },
      { role: "user", content: read("trial/autonomy/objective.md") + "\n\nImplementation to review:\n" + read("trial/autonomy/waitlist.mjs") },
    ],
  }),
});
if (!request.ok) throw new Error(`NVIDIA review HTTP ${request.status}`);
const response = await request.json();
const verdict = response.choices?.[0]?.message?.content;
if (!verdict?.trim()) throw new Error("NVIDIA returned no review text");
console.log(JSON.stringify({ model: response.model ?? null, usage: response.usage ?? null, verdict }));
