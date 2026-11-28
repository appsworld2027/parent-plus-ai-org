# Feature f010-quality-drift Summary

## Problem
Deterministic probe in `scripts/contract-lock.mjs` incorrectly accepts trivial test changes, such as a trivially true assertion or reduced branch‑coverage thresholds, while still rejecting skipped tests and locked‑suite drift. This allows weak or incomplete tests to pass the quality gate, undermining the integrity of the contract‑lock process.

## Target Users
- Repository maintainers who rely on contract‑lock to enforce test quality.
- Contributors submitting pull requests that modify tests or code.
- Automated CI pipelines that invoke the quality probe.

## Intended Outcome
Guarantee that any test change must maintain or improve coverage and assertion strength. The probe should reject trivial changes while still allowing legitimate test additions or code‑only changes.

## Success Metric / Guardrail
- **Red‑green test suite**: a candidate that includes a trivial assertion or lowered coverage must fail the probe (red). A candidate that satisfies all controls must pass (green).
- **No silent pass**: assertion weakening, deletion, or coverage threshold reduction cannot be ignored.

## Scope
- **Files affected**: `scripts/contract-lock.mjs`, `tests/contract-lock.test.mjs`, and associated documentation.
- **Behavior changes**: enforce stricter detection of trivial assertions, reject coverage threshold reductions, and maintain current positive control logic.
- **Non‑goals**: No changes to Course logic, production credentials, authorization, merge rules, security debt, or unrelated configuration.

## Specific Current Behaviour
The probe accepts a test with a trivial `assert(true)` and a reduced branch‑coverage threshold, while correctly rejecting skipped tests and locked‑suite drift. It also allows normal application code changes and legitimate new tests.

## Recommended Approach
1. **Assertion Strength Check**: parse test files for assertion statements; flag those that are trivially true or removed. Reject candidates containing such assertions.
2. **Coverage Threshold Enforcement**: compare candidate coverage metrics against the base commit; reject if the threshold is lowered.
3. **Maintain Positive Controls**: ensure normal application code changes and added tests still pass.
4. **Documentation Update**: clearly describe the new checks and failure modes in the contract‑lock docs.

## Assumptions
- The repository uses the current main SHA `6a6693ab41daaabe4d5138591bf9860c568c7010` as the baseline for coverage comparison.
- The candidate SHA `b5ed80984cdaf39649e52f0cef686db9706d425e` is the one to be evaluated.
- No automated merge or release will occur during discovery.
