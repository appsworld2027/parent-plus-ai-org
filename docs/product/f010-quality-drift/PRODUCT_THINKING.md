# Product thinking report — Feature f010‑quality‑drift

Written by Maya (AI PM) in `docs/product/f010-quality-drift/PRODUCT_THINKING.md`.

## 1. The problem and who has it
Repository maintainers rely on **contract‑lock** to guard against weak tests. The current probe accepts trivial changes (e.g., `assert(true)` or a lowered branch‑coverage threshold) while rejecting skipped tests and locked‑suite drift. This undermines the integrity of the quality gate and can let incomplete or insecure test suites merge. Success is measured by a red‑green test cycle: a candidate with a trivial assertion or reduced coverage must fail; a candidate that keeps or improves coverage and contains meaningful assertions must pass. The guardrail is that no assertion weakening, deletion, or coverage reduction may silently succeed.

## 2. How I thought about it
- **Method chosen**: Comparative static analysis + coverage delta check, because the issue is deterministic and must run in CI without external services.
- **Options considered**:
  1. **Heuristic regex on source** – fast but brittle; rejected due to false positives on complex assertion libraries.
  2. **AST‑based assertion strength analysis** – precise, captures custom assertion patterns; chosen.
  3. **Runtime test execution with mocks** – too costly and non‑deterministic; rejected.
- **Assumptions**: The baseline commit is the current main SHA; coverage reports are available in standard format; tests use familiar assertion libraries (`assert`, `expect`).
- **Research used**: Similar open‑source CI tools (e.g., GitHub Actions, CircleCI) enforce coverage thresholds; static analyzers (ESLint rules) for assertion checks.

## 3. Independent evaluation checklist
Four groups of scenarios the QA agents can convert to tests. All are pending evidence.

**Core user journeys** – Adding a new test that improves coverage and uses meaningful assertions.

**Edge cases** – Removing an assertion from an existing test; reducing branch‑coverage by a single line.

**Security and privacy** – Ensuring that no test modifications bypass the lock by renaming or moving test files.

**Resilience and UX** – The probe should fail with a clear message when a trivial assertion is detected.

| Group | Scenarios | Passed with evidence | Status |
|---|---|---|---|
| Core user journeys | Add meaningful test, no coverage loss | 0 | Pending |
| Edge cases | Delete assertion, reduce coverage | 0 | Pending |
| Security and privacy | Skip test, rename test file | 0 | Pending |
| Resilience and UX | Trivial assertion, clear error | 0 | Pending |

## 4. Founder decisions
| Decision | Options | Recommended | Reason |
|---|---|---|---|
| Assertion detection method | Regex vs AST | AST‑based parsing of test files | Precise detection of trivial or removed assertions |
| Coverage comparison granularity | Per‑file vs global | Global branch‑coverage threshold | Simpler integration and aligns with existing thresholds |
| Error reporting format | Inline comments vs log | Structured log with file, line, reason | Easier for automated tooling to consume |

## 5. Risks and what could go wrong
- **False negatives** if assertion libraries are highly dynamic; mitigated by limiting to known patterns and allowing overrides.
- **Performance regression** in CI due to deep AST parsing; mitigated by caching parsed ASTs.
- **Unintended rejection** of legitimate tests that use custom assertion wrappers; mitigated by a whitelist configuration.
- **Coverage mis‑reporting** if the base commit changes; mitigated by locking the baseline SHA in the probe.

The final feature contract may add or refine scenarios. Mark scenarios only after reviewing actual test evidence.