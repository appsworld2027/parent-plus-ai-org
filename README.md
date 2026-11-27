# AI development organization

Cezar and Superpowers are installed as the automated operating layer. See
`AUTOMATION.md` for the execution flow, commands, workflows and safety boundaries.

Run `python3 -m unittest discover -s tests -v` to verify the framework.
Run `npm run ai:verify` to verify the framework, Cezar pin, Superpowers installation,
workflows and portable automations together.
Run `npm run ai:pilot` for a zero-spend Cezar/Superpowers end-to-end dry run.
Run `npm run ai:cockpit` to start the local orchestration dashboard.
Run `python3 org.py demo` to see the synthetic pilot, including the founder conflict and merge gate.
Run `python3 org.py report PATH_TO_LOCAL_LEDGER` to see usage.
Run `python3 org.py daily-report demo/status.json --ledger demo/usage.jsonl` to inspect the legacy demo report. Use [the canonical Founder Dashboard standard](governance/FOUNDER_DASHBOARD.md) for project reporting.
Run `python3 -m unittest tests.test_pilot -v` to validate the independent two-team pilot.

See `MILESTONES.md` for milestone exit criteria and verifiable evidence.

Live pilot example from the organization directory:

    python3 org.py run A qa demo/brief.md --ledger /tmp/ai-org-usage.jsonl

Unattended agent execution is free-provider-only: NVIDIA NIM free endpoint for builder work when available, with Groq free-tier builder fallback and independent review. No Codex, ChatGPT Work, subscription login, paid inference API or paid fallback is used. Keep production credentials and customer data out of hosted model prompts. GitHub merge enforcement depends on the selected repository plan; a founder verifies current-commit evidence before production release.


Run `python3 org.py gate demo/blocked.json` for an example decision from
supplied QA and CI evidence. This gate exits with status 1 when blocked.
On GitHub, the human merger verifies the evidence and founder identities
against the linked review, workflow run, and decision issue.

---

*Link verification (issue #69): All relative links in this README resolve to existing files as of 2026-11-26.*
