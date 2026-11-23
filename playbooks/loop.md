# The AI Org loop — how features move without the founder pushing them

Founders do two things only: **approve the Feature Contract** and **approve the Demo Pack**. They never open GitHub:
they decide in their AI chat (Claude / Codex / ChatGPT), and the assistant posts `/approve` or `/changes <what to change>`
on the item for them, signed as the founder's own account. Testing happens only on the Vercel link. Everything else is automatic.

| Stage label | Who acts | Moves on when |
|---|---|---|
| (backlog) `docs/product/BACKLOG.md` | loop `next` (scheduled, or founder `/next`) | nothing else in flight → opens `ai:discovery` issue |
| `ai:discovery` | Maya | contract branch pushed → `ai:founder-decision` (if Maya forgets the label, loop `advance` moves it) |
| `ai:founder-decision` | **founder** | `/approve` → `ai:tests` · `/changes` → back to Maya |
| `ai:tests` | Quinn | locked tests fail for the right reason → contract PR `ai:contract` |
| `ai:contract` (PR) | loop `advance` | opens `ai:build` issue for Dev |
| `ai:build` → `ai:qa` → `ai:review` / `ai:fix` | Dev, Quinn, Rex | Rex `Verdict: APPROVE` on the latest commit |
| (build PR approved) | loop `advance` | CI + contract-lock green → merges into the contract branch → delivery PR `ai:release` |
| `ai:release` | loop `advance` | full validation + QA lab + delivery-lock green → Demo Pack → `ai:founder-test` |
| `ai:founder-test` | **founder** | `/approve` → merged to `main`, next backlog item · `/changes` → fix issue for Dev |

Safety rails: founder commands are accepted only from usernames in `.ai-org/manifest.json` `governance.founders` with repo
access · nothing reaches `main` without founder `/approve` and green checks on the exact head commit · agent pushes don't
trigger CI by themselves, so the loop dispatches CI and records the contract-lock result as a commit status · after 5 failed
QA/review rounds the item is `ai:blocked` and the founder gets options · one feature in flight at a time.
