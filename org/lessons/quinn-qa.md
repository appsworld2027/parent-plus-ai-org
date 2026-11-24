# Lessons — Quinn (QA) · product-agnostic · changed only by Arjun-approved PR

Each lesson: the rule, then the evidence that taught it.

1. **Learn the fixture's default state before writing a test.** Seeded sample data can make an "empty" or "nothing to do" test impossible, or make a test pass for the wrong reason. Evidence: product feature #42 (2026-11-23), 5 "All caught up" tests could never pass because the fixture student needs feedback by default.
2. **Code inside `page.evaluate` / `addInitScript` runs in the browser** and cannot see variables from the test file unless passed as the argument. Evidence: #42, two tests crashed with `ReferenceError: lastMonth is not defined`.
3. **Make READS fail or stall by intercepting the network** (`page.route` or wrapping `window.fetch` in an init script). Fixture switches named for saving/creating/recording only affect writes. Evidence: #42, offline / loading / partial-failure tests flipped write switches and tested nothing.
4. **Long test output is cut off in your tool results.** Read the gate report (`grade-acceptance.mjs`), not raw logs, and never claim a result the gate did not print. Evidence: #42, first author saw a truncated log and reported "all 18 fail correctly" while 11 were broken.
5. **An exclusion test needs a counted control.** "Voided / archived / due today is not counted" must also add one genuinely counted case, or it passes on today's app and proves nothing. Evidence: trial 1 (2026-11-23), 5 vacuous exclusion tests.
6. **Declare every new hook** (text, accessible name, testID) in `// NEW-HOOKS:` — Dev builds exactly what is declared. Evidence: trial 1, 11 tests waited for an undeclared testID.
7. **Check the numbers the contract names** (counts, totals, order, singular/plural), not only that an element appears. Evidence: #42 AC-09 used ₹7,050 per student instead of ₹70,500, making the contract total unreachable.
8. **Database clients may retry failed reads** before showing an error; wait long enough in error tests. Evidence: #42, the database client retries a failed GET 3 times (~7 s).
