#!/usr/bin/env bash
# Installs and starts the free engine as trialproxy. Needs NVIDIA_NIM_API_KEY; only this step and the scan get it.
# Usage: engine.sh <free model id>
set -euo pipefail
MODEL=$1
. "$(dirname "$(realpath "$0")")/lib.sh"
J=$(realpath "${TRIAL_ROOT:-/srv/trial}")/judge
cd /  # everything below runs as the proxy user, which cannot open the runner's folders
case "$MODEL" in nvidia_nim/*) ;; *) echo "::error::not a free NVIDIA model"; exit 1;; esac
[ -n "${NVIDIA_NIM_API_KEY:-}" ] || { echo "::error::NVIDIA_NIM_API_KEY is not set."; exit 1; }
as_proxy bash -c 'curl -LsSf https://astral.sh/uv/install.sh | sh >/dev/null && "$HOME/.local/bin/uv" tool install free-claude-code >/dev/null && "$HOME/.local/bin/uv" tool list && mkdir -p "$HOME/.fcc" && chmod 700 "$HOME/.fcc"'
printf 'NVIDIA_NIM_API_KEY=%s\nMODEL=%s\nHTTP_READ_TIMEOUT=600\nFCC_OPEN_BROWSER=false\nENABLE_WEB_SERVER_TOOLS=false\n' "$NVIDIA_NIM_API_KEY" "$MODEL" \
  | as_proxy bash -c 'umask 077; cat > "$HOME/.fcc/.env"'
sudo mkdir -p /srv/trial-gate && sudo cp "$J/scripts/safe-trial/gate.mjs" /srv/trial-gate/gate.mjs && sudo chmod -R a+rX /srv/trial-gate
NODE=$(command -v node)
as_proxy bash -c 'cd "$HOME"; nohup "$HOME/.local/bin/fcc-server" > "$HOME/fcc.log" 2>&1 &'
as_proxy bash -c "nohup '$NODE' /srv/trial-gate/gate.mjs > \"\$HOME/gate.log\" 2>&1 &"
code=000
for i in $(seq 1 90); do
  code=$(curl -s -o /dev/null -w '%{http_code}' -H 'x-api-key: freecc' -H 'authorization: Bearer freecc' http://127.0.0.1:8790/v1/models || true)
  case "$code" in 000|403|502) sleep 1;; *) break;; esac
done
case "$code" in 000|403|502) echo "::error::engine did not start (HTTP $code)"; exit 1;; esac
(umask 022; npm install -g @anthropic-ai/claude-code >/dev/null)
harden_system
assert_system_readonly  # fail here, before any model session, if the install left something open
claude --version
