# Delivery lane scope declarations

The canonical scheduler consults governance/AUTONOMY_POLICY.json for the maximum lane count (capped at two). Product teams may declare explicit scopes on the product's main branch in .ai-org/delivery-lanes.json:

```json
{"features":{"registration":{"dependsOn":[],"files":["src/registration"],"migrations":[],"apis":["registration"],"rules":["registration"]},"calendar":{"dependsOn":[],"files":["src/calendar"],"migrations":[],"apis":["calendar"],"rules":["calendar"]}}}
```

Each scope must list all affected paths, migration namespaces, API contracts and shared product rule identifiers. Paths are relative and directory prefixes conflict with descendants. Unknown active work, malformed scopes, incomplete inventory, overlapping scopes and unmet dependencies prevent concurrent admission. Dependents require a merged contract PR into main. Existing unscoped backlog items remain single-lane. This is an admission guard, not a proof that generated edits obey scopes: independent review, locked acceptance tests and branch checks remain required; actual diff-scope enforcement and real simultaneous delivery evidence are follow-on work.
