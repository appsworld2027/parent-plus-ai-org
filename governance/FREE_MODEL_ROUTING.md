# Free-model routing (generated)

Generated from AUTONOMY_POLICY.json. Do not edit manually; run npm run ai:policy:docs.
Configured routes are not proof of provider availability, free entitlement or model qualification.

| Setting | Authority |
|---|---|
| Allowed engines | free |
| Ordinary builder preference | groq/openai/gpt-oss-120b |
| Independent reviewer | groq/qwen/qwen3.8-27b |
| Supervised discovery pilot (never ordinary routing) | groq/openai/gpt-oss-20b / issue #170 / qualification run 46136003905 |
| Supervised synthetic evaluation builders | nvidia/nvidia/nemotron-3-ultra-550b-a55b, groq/openai/gpt-oss-120b |
| NVIDIA mode | supervised-synthetic-evaluation-only |
| NVIDIA reviewer enabled | false |
| Distinct reviewer model family | true |
| Subscription authentication | false |
| Paid fallback | false |
| Quota exhaustion | pause-or-approved-free-fallback-only |

GitHub Actions is the canonical unattended orchestrator. Studio model recommendations are advisory.
