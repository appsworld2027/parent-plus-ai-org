# Feature Contract — template and rules

The Feature Contract is the single source of truth for what a feature must do.
It replaces "the agent remembers what we discussed" with a written, testable agreement.

- **Lives in:** the PRODUCT repo at `docs/product/<feature-slug>/ACCEPTANCE.md` (see AGENTS.md §4).
- **Written by:** Maya (AI PM), with Iris (design) for screens and states.
- **Approved by:** the founder. This is founder approval #1. Reading time: max 2 minutes.
- **Used by:** Quinn turns every acceptance criterion into an automated end-to-end test BEFORE any code is written.
  Dev builds until those tests pass. Rex reviews against this contract, not against the code's own intent.

## Rules for writing acceptance criteria (ACs)
1. Describe what a user can SEE or DO on screen. No technical words (no "API", "table", "endpoint").
2. One behaviour per AC. If an AC contains "and also", split it.
3. Be concrete: real numbers, real labels, real messages ("shows 3 items", not "shows the items").
4. Cover the unhappy paths as ACs too: empty state, error state, loading state, no internet, wrong input.
5. Point to the prototype screen each AC comes from, so nothing is lost from the founder's prototype.
6. Maximum ~12 ACs per contract. More than that means the feature is too big: split it into smaller features.
7. Every AC gets a stable ID (`AC-01`, `AC-02`, ...). IDs never change or get reused.

## Rules after approval
- The approved contract is locked. Agents may NOT weaken, delete or reinterpret an AC to make a build pass.
- If an AC turns out to be impossible or wrong, open an `ai:founder-decision` with 2–4 options and one Recommended.
- Any change after approval goes in the Change log with the founder decision link.

## How ACs become tests
- Each AC has at least one end-to-end test whose title starts with the AC ID, e.g. `AC-03 shows empty message when list is empty`.
- These tests live in the product's locked acceptance-test folder (path set in the product adapter manifest;
  default `tests/acceptance/`). Only a contract PR (label `ai:contract`) may add or change them.
- A build PR that edits locked tests fails the `contract-lock` check (AGENTS.md §7A).

---

## Template (copy below this line into ACCEPTANCE.md)

```markdown
# Feature Contract: <feature name>

Status: draft | approved by founder on <date> (<decision link>) | changed (see Change log)
Prototype reference: <screen names / links / screenshot paths>

## Why this feature (1–2 lines)
<the user problem this solves>

## In scope / Out of scope
- In: ...
- Out (explicitly not in this feature): ...

## Acceptance criteria
| ID | Given (starting situation) | When (user does) | Then (user sees) | Prototype screen |
|---|---|---|---|---|
| AC-01 | a signed-in user with 2 saved items | taps Delete on item 1 and confirms | the list shows 1 item and a "Deleted" message for 3 seconds | Screen 4 |
| AC-02 | a signed-in user with 0 saved items | opens the list | the message "Nothing saved yet" and an "Add" button | Screen 4b |
| AC-03 | the device has no internet | taps Delete | the message "You're offline — try again" and the item stays | — |

## Decisions agents may make alone (no founder needed)
- Technical choices, code structure, libraries, file names.
- Wording of minor helper text, spacing, animation timing — matching the prototype style.
- Anything else must be recorded in the Demo Pack under "Decisions I made on my own".

## Must ask the founder if
- A user-visible behaviour is needed that no AC covers.
- An AC cannot be met as written.
- The change affects money, privacy, child safety, or data that users can't get back.

## Change log
| Date | AC | Change | Founder decision link |
|---|---|---|---|
```
