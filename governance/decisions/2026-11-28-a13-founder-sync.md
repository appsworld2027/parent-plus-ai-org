# A-13 — Founder decision synchronization

Status: deterministic candidate; not accepted or deployed.

Gemini reported incomplete multi-founder conflict handling. The charter requires escalation of conflicting founder decisions while unaffected work continues. The controller previously processed each founder comment without reconciling the latest directions of other configured founders. This update uses the existing founder eligibility function and existing contract/demo decision markers. It does not change identity, credentials, permissions, privacy, merge policy or release gates.

Behavior:
- Read all paginated issue/PR comments; sort by creation time with comment ID as tie-breaker.
- Reset the decision cycle at the latest contract-ready or demo-pack marker. Retain the most recent approve, changes or stop direction from each eligible founder.
- Continue a single direction or matching directions, classify conflicting approvals/change/stop and differing requested changes conservatively; skip superseded commands.
- Before the affected contract or demo transition, post one conflict notice per exact set of direction IDs and return. The latest directions must converge; the ordinary controller path then applies existing gate rules. Stop remains immediate and next remains independent.
- No claim that a future comment can undo a transition already completed. GitHub workflow serialization helps but is not a transaction against future comments. Generic decision issues without a marker use the current issue history; genuinely new cycles should have a marker.

Evidence:
- New regression was red before implementation: founderDecisionState was missing.
- Pure synchronization regression and actual CLI dry-run integration fixture cover conflicting/consistent directions, outdated commands, configured founder eligibility, cycle reset, conflict deduplication, unaffected existing approval path, and contract/demo transition blocking.
- Fixture substitutes only GitHub transport, uses no real product data, agents or paid calls. It is deterministic engineering validation, not proof of founder collaboration or autonomous product delivery.
- Existing product and security restrictions remain in effect. Independent exact-head review, hosted CI and later live multi-founder trial are required before accepting A-13.
