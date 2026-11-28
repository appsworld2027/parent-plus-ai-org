import { readFileSync, writeFileSync } from "node:fs";

const policyPath = new URL("../governance/AUTONOMY_POLICY.json", import.meta.url);
const docsPath = new URL("../governance/FREE_MODEL_ROUTING.md", import.meta.url);
export function renderRoutingPolicy(policy) {
  const e = policy.execution, p = e.providerPolicy;
  return [
    "# Free-model routing (generated)",
    "",
    "Generated from AUTONOMY_POLICY.json. Do not edit manually; run npm run ai:policy:docs.",
    "Configured routes are not proof of provider availability, free entitlement or model qualification.",
    "",
    "| Setting | Authority |",
    "|---|---|",
    "| Allowed engines | " + e.allowedEngines.join(", ") + " |",
    "| Ordinary builder preference | " + p.builderPreference.join(", ") + " |",
    "| Independent reviewer | " + p.independentReviewer + " |",
    ...(p.supervisedPilotAlternate ? ["| Supervised discovery pilot (never ordinary routing) | " + p.supervisedPilotAlternate.model + " / issue #" + p.supervisedPilotAlternate.issueNumber + " / qualification run " + p.supervisedPilotAlternate.qualificationRun + " |"] : []),
    "| Supervised synthetic evaluation builders | " + p.evaluationBuilderPreference.join(", ") + " |",
    "| NVIDIA mode | " + p.nvidiaMode + " |",
    "| NVIDIA reviewer enabled | " + p.nvidiaReviewerEnabled + " |",
    "| Distinct reviewer model family | " + p.reviewerModelFamilyMustDifferFromBuilder + " |",
    "| Subscription authentication | " + p.subscriptionAuthentication + " |",
    "| Paid fallback | " + p.paidFallback + " |",
    "| Quota exhaustion | " + p.quotaExhaustion + " |",
    "",
    "GitHub Actions is the canonical unattended orchestrator. Studio model recommendations are advisory.",
    ""
  ].join("\n");
}

const expected = renderRoutingPolicy(JSON.parse(readFileSync(policyPath, "utf8")));
if (process.argv.includes("--check")) {
  if (readFileSync(docsPath, "utf8") !== expected) throw Error("Generated free-model routing documentation is stale; run npm run ai:policy:docs.");
} else {
  writeFileSync(docsPath, expected);
}
