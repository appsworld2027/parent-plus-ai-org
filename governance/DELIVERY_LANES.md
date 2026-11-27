# Delivery lane scope declarations

The canonical scheduler consults governance/AUTONOMY_POLICY.json for the maximum lane count (capped at two). Product teams may declare explicit scopes on the product's main branch in .ai-org/delivery-lanes.json:

```json
{"features":{"registration":{"dependsOn":[],"files":["src/registration"],"migrations":[],"apis":["registration"],"rules":["registration"]},"calendar":{"dependsOn":[],"files":["src/calendar"],"migrations":[],"apis":["calendar"],"rules":["calendar"]}}}
```

Each scope must list all affected paths, migration namespaces, API contracts and shared product rule identifiers. Paths are relative and directory prefixes conflict with descendants. Unknown active work, malformed scopes, incomplete inventory, overlapping scopes and unmet dependencies prevent concurrent admission. Dependents require a merged contract PR into main. Existing unscoped backlog items remain single-lane. This is an admission guard, not a proof that generated edits obey scopes: independent review, locked acceptance tests and branch checks remain required; actual diff-scope enforcement and real simultaneous delivery evidence are follow-on work.


### Actual change enforcement

A declared scope is checked again before both build-to-contract and contract-to-main merges. The controller obtains the paginated changed-file inventory and verifies the exact PR head, base branch and base SHA before and after retrieval. Missing, duplicate, malformed or incomplete inventory fails closed. Renames and copies must have both the old and new path inside the declared scope. Scope prefixes match path segments, not arbitrary string prefixes. Include feature-specific contracts, test files, migrations and code paths in the declared file scope. Do not widen scope from a feature PR; resolve a scope conflict through the canonical planning process. An unscoped legacy feature remains single-lane; file scope enforcement does not claim semantic API or product-rule diff detection, which still requires independent specialist review.
