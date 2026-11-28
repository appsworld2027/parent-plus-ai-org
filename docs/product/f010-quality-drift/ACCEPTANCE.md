# Acceptance Criteria for Feature f010-quality-drift

1. **Trivial assertion detection** – A candidate containing any assertion that evaluates to a constant `true` (e.g., `assert(true)`, `expect(true).toBeTruthy()`) must be rejected. The probe should flag the file and line number and return a failure status.

2. **Assertion deletion detection** – If a test originally containing an assertion is modified to remove that assertion, the probe must reject the candidate, even if the test still executes.

3. **Coverage threshold enforcement** – The candidate’s overall branch‑coverage percentage must not be lower than the base commit’s threshold (as recorded in the current main `6a6693ab41daaabe4d5138591bf9860c568c7010`). If the candidate’s coverage is reduced, the probe must reject it.

4. **Positive control – normal application code** – Changes that modify only production code, without altering test files, must pass the probe as long as they do not introduce new test assertions or lower coverage.

5. **Positive control – legitimate test additions** – Adding new tests that contain non‑trivial assertions and do not lower overall coverage must pass.

6. **Positive control – unchanged or increased coverage** – If a candidate’s coverage is equal to or higher than the base, it passes regardless of other changes, provided no trivial or deleted assertions are present.

7. **Skipped tests** – Tests marked with `skip` (e.g., `test.skip`) must be rejected; the probe should flag the file and test name.

8. **Locked‑suite drift** – Any modification that changes the structure of the locked test suite (e.g., renaming or removing test files) must be rejected.

9. **Boundary case – branch‑coverage exactly equal** – A candidate whose coverage is exactly the same as the base is accepted.

10. **Regression case – previously passing candidate** – A candidate that previously passed but is now modified to include a trivial assertion must fail.

11. **Recovery case – fixing a trivial assertion** – If a candidate that failed due to a trivial assertion is corrected to a meaningful assertion, it must pass.

12. **Explicit non‑goals** – The probe must not enforce changes to Course logic, production credentials, authorization, merge rules, security debt, or unrelated configuration.

13. **Evidence required** – For each failure, the probe must output:
    * The file path and line number of the problematic assertion or coverage change.
    * A clear reason: “trivial assertion”, “assertion removed”, “coverage decreased”, “skipped test”, or “locked‑suite drift”.

14. **Test‑first red/green** – The acceptance criteria are verified by running the probe against a candidate SHA that includes a trivial assertion and a reduced coverage threshold (expected red). Running it against the same candidate after removing the trivial assertion and restoring coverage (expected green) confirms the behavior.

15. **Documentation** – The README for `scripts/contract-lock.mjs` must describe the new checks and their failure modes, including examples of acceptable and unacceptable changes.

---

*These criteria are the final product contract for the discovery stage of feature f010‑quality‑drift.*