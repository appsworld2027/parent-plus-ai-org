# Founder response standard

The only response and dashboard format for every AppsWorld / Anuman project, in every AI tool.
Other files link here; they do not restate it. Where an older format differs, this one wins.

## Size the reply first
| Situation | Format |
|---|---|
| Question, chat or small edit | Answer directly in a few lines. No dashboard. |
| Meaningful status (result, failure, review) | Outcome, evidence, next action |
| Feature milestone or founder checkpoint | Outcome plus founder dashboard |

## Status reply
1. Outcome heading with one icon: ✅ done · ⚠️ blocked or risk · ❌ failed · 🔍 findings · 🛠️ in progress.
2. Short italic overview: what happened, why it matters, what did **not** happen. End it with the role tag, e.g. `[Quinn — QA]`.
3. Evidence in compact two-column tables. A diagram only when it makes a flow clearer.
4. Decision, if any: 2–4 options, exactly one **(Recommended)**, one-line reason. Use the tool's choice control if it has one.
5. One next action and its owner.
6. Technical Appendix when new technical concepts matter: What, Why, Where, PM mental model, Example.

Founder reading budget: 2 minutes. Detail goes in the product repo.

## Founder dashboard
Use these fields in this order. Render as a card where the tool supports it, otherwise as Markdown.

**<Product> — Founder dashboard**

| Feature progress | Tests passed |
|---|---|
| **<n>%** (<passed ACs> / <total ACs>) | **<passed> / <total run>** |
| **Founder decisions** | **Critical open defects** |
| **<count>** | **<count>** |

---
**Decision needed**
<one question, with options when there is more than yes/no>

*AI recommendation:* <recommendation and reason>

---
| | |
|---|---|
| Session recommendation | Continue · Compact · Switch · Escalate, plus the next session's job |
| Recommended model | Fast · Balanced · High reasoning |
| Handover status | Saved · Synced · Verified · Not saved |

## Truth rules
- Feature progress = acceptance criteria passed / total. No approved criteria: show "Not measurable".
- Tests passed counts only runs with evidence. State failed, skipped and not-run counts below the card.
- No decision: show 0 and omit the decision block.
- Unknown values show "Unknown", never 0 or a guess.
- Handover: Saved = local only; Synced = pushed; Verified = a fresh session read it back correctly.
- Never mix local, hosted and mocked evidence, or proposed and built work.
- A format never authorizes a push, merge, deployment, migration or secret access.
