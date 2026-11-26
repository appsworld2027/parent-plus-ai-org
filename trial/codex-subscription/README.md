# Codex subscription smoke fixture

This directory is a synthetic, disposable coding task used to verify the official Codex CLI with the founder's existing ChatGPT subscription.

- No Parent Plus source, customer data, production credentials, or API key is included.
- The acceptance tests are locked by the workflow before the model starts.
- Codex may change only `src/greeting.mjs`.
- The workflow has read-only repository permissions and does not push or open a PR.
- The run consumes the account's available Codex/ChatGPT plan allowance; it does not use an OpenAI API key.

The baseline is intentionally red for the three edge-case acceptance tests. A successful trial means Codex changed only the implementation and made all locked tests pass.
