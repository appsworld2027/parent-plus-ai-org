# Operating protocol: memory, sessions, models, cost

Applies to all projects. Reply format: `standards/FOUNDER_RESPONSE.md`. Quality: `AGENTS.md` §7A.

## Founder's day
| Stage | Founder | AI |
|---|---|---|
| Initiation | Describe the desired business outcome | Understand requirements |
| Discovery | Clarify important trade-offs | Research, brainstorm, identify gaps |
| Design | Approve material product decisions | User journeys, architecture, edge cases |
| Execution | No routine involvement | Implement, debug and coordinate |
| Verification | Review meaningful risks | Testing and independent review |
| Handover | Open a new session if necessary | Save context and provide the next instruction |
| Completion | Evaluate product experience | Provide evidence and update project records |

## Memory
The product repo is the source of truth, not the conversation. Reuse existing documents; create none just to match a template.
Keep approved decisions, proposals, assumptions and rejected options distinct. Never silently reverse an approved decision.

## Context
Load only what the task needs. Search before reading whole files, edit by diff, filter long logs.
Use scripts and tests where no reasoning is needed.

## Sessions
At each milestone choose Continue, Compact, Switch or Escalate. Switch when the module changes, independent QA starts,
or decisions are being forgotten. Above about 80% measured context, checkpoint first (a guideline, not a model limit).
Never invent usage figures. Tell the founder only when action is needed.
Handover: objective, state, branch and commit, decisions, evidence, risks, next step, done criteria. No secrets.
The next session checks it against the repo before relying on it.

## Models
Use the least costly level that reliably meets the quality bar: scripts → fast → balanced → high reasoning.
Use high reasoning for product design, architecture, security and hard bugs. After two failed attempts, change approach or escalate.
Never claim a model switch the tool has not confirmed.

## Speed
One feature at a time: approved acceptance criteria → build and test → independent review → founder tries it.
Add parallel agents only for independent work. Measure resources per verified feature where the tool exposes them.
