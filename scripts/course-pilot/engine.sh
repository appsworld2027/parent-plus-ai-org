#!/usr/bin/env bash
# Exact approved Groq model family only. The key is held by trialproxy; trialagent has no internet or sudo.
set -euo pipefail
MODEL=$1
. "$(dirname "$(realpath "$0")")/../safe-trial/lib.sh"
J=$(realpath "$ROOT")/judge
cd /
case "$MODEL" in groq/openai/gpt-oss-120b|groq/qwen/qwen3.8-27b) ;; *) echo "::error::Unapproved course pilot route"; exit 1;; esac
[ -n "${GROQ_API_KEY:-}" ] || { echo "::error::Approved free Groq key unavailable; no fallback"; exit 1; }
as_proxy bash -c 'curl -LsSf https://astral.sh/uv/install.sh | sh >/dev/null && "$HOME/.local/bin/uv" tool install "free-claude-code==6.19.56" >/dev/null && mkdir -p "$HOME/.fcc" && chmod 700 "$HOME/.fcc"'
printf 'GROQ_API_KEY=%s\nMODEL=%s\nHTTP_READ_TIMEOUT=600\nFCC_OPEN_BROWSER=false\nENABLE_WEB_SERVER_TOOLS=false\n' "$GROQ_API_KEY" "$MODEL" | as_proxy bash -c 'umask 077; cat > "$HOME/.fcc/.env"'
# Match the canonical worker's explicit reasoning policy, verified native medium route.
if [ "$MODEL" = groq/openai/gpt-oss-120b ]; then
  printf 'REASONING_POLICY=medium\n' | as_proxy bash -c 'umask 077; cat >> "$HOME/.fcc/.env"'
  echo "Course GPT-OSS reasoning policy: medium"
fi
sudo mkdir -p /srv/trial-gate
sudo cp "$J/scripts/safe-trial/gate.mjs" /srv/trial-gate/gate.mjs
sudo chmod -R a+rX /srv/trial-gate
NODE=$(command -v node)
as_proxy bash -c 'cd "$HOME"; nohup "$HOME/.local/bin/fcc-server" > "$HOME/fcc.log" 2>&1 &'
as_proxy bash -c "nohup '$NODE' /srv/trial-gate/gate.mjs > \"\$HOME/gate.log\" 2>&1 &"
code=000
for i in $(seq 1 90); do
  code=$(curl -s -o /dev/null -w '%{http_code}' -H 'x-api-key: freecc' -H 'authorization: Bearer freecc' http://127.0.0.1:8790/v1/models || true)
  case "$code" in 000|403|502) sleep 1;; *) break;; esac
done
[ "$code" = 200 ] || { echo "::error::Free engine not ready (HTTP $code); no paid fallback"; exit 1; }
(umask 022; npm install -g @anthropic-ai/claude-code >/dev/null)
harden_system
assert_system_readonly
echo "Course pilot free route: $MODEL (provider billing tier not independently measured)"
