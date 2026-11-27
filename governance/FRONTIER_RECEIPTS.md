# Trusted frontier evaluation receipts
Status: deterministic verifier and test fixtures only; **not live trusted admission**.

The frontier admission gate accepts a synchronous verifier, not candidate assertions. A trusted controller first builds an index of exact receipts from GitHub Actions, then passes its verifyReceipt callback to assessFrontierAdmission. Candidate input must never select the repository, owner, workflow identity, workflow SHA or transport.

## Receipt contract
An ID is gh:<run-id>:<run-attempt>:<artifact-id>. The trusted artifact must be named frontier-<kind>-<attempt>-<unique-tag> and contain exactly receipt.json, encoded UTF-8.
The JSON contains schema:1, kind, source:{repository,runId,attempt,workflowSha}, subjectHash and payload. The hash is the admission gate's canonicalHash(payload). Kinds: frozen-plan, agent-execution, independent-evaluation, integrated-evaluation.

The verifier checks the repository, trusted actor and triggering actor, completed successful manual dispatch, four distinct pinned workflow IDs and paths, exact producer head SHA, run attempt, artifact run/repository metadata, unexpired archive, authoritative GitHub archive digest and size, bounded extraction, and exact source and payload bindings. Wrong or missing evidence is rejected. An identical receipt ID may not be trusted twice. Maximum 68 receipts. The controller must retain all failed attempts separately; this module does not declare any model output correct.

## Runtime
Node 22, GitHub CLI authenticated with read-only Actions/repository access, unzip. No model keys or inference are used by the verifier. Only GitHub's fixed repository API metadata and ZIP endpoint are allowed. The tests generate synthetic ZIP receipts with zip; they never contact GitHub or model providers.

Use buildVerifiedReceiptIndex(requests, {policy, transport:createGitHubReceiptTransport()}) in a trusted context. Then pass the result's verifyReceipt function to assessFrontierAdmission. A rejected receipt must be treated as missing/unverified. No policy is shipped: production cannot be enabled until four actual, separate producers are independently audited, pinned and tested against real Actions artifacts. Pin the exact workflow dispatch commit and owner/user numeric identities in controller-owned configuration. Never take this policy from an agent-produced file.

## Remaining milestones
1. Independently review and merge #131; validate this stacked branch against its final base.
2. Build frozen synthetic case inputs and artifact-producing agent/evaluator workflows, with distinct trusted identities.
3. Verify live GitHub API metadata and downloaded archives at pinned SHAs; if API fields differ, update the verifier with a real recorded fixture rather than relax provenance.
4. Execute the actual 33 role-variant tasks within approved free quota; independently assess artifacts and full workflow, then retain all evidence. No synthetic fixture counts as real qualification.

## Frozen casebook / artifact intake
prepareFrontierCasebook({sourceSha,seed}) creates the exact 33 distinct role/variant tasks, stable synthetic data, role-specific file deliverables, scoped prompts, fixture and prompt hashes, and frozen plan payload. The same seed/SHA reproduces the plan. The controller selects seed/source, never the candidate. The casebook intentionally does not provide evaluator answer keys; the review slots contain a functional control or a seeded candidate defect and tests verify these executable differences. Artifact intake checks bounded exact file names and content, computes a deterministic artifact hash, and never executes, scores or qualifies candidate output. It is an intake surface, not a sandbox: code/SQL/HTML must subsequently be validated and executed in independent isolated evaluators. A model producing an artifact is not proof it is correct.
