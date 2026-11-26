#!/usr/bin/env bash
# Runs one model session as trialagent and records it. A failed or timed-out model is a result, not a crash.
# Usage: agent.sh <name> <model> <prompt file> <seconds> <max turns> <extra claude args...>
set -uo pipefail
. "$(dirname "$0")/lib.sh"
name=$1 model=$2 prompt=$3 seconds=$4 turns=$5; shift 5
out=$ROOT/out; mkdir -p "$out"
cd "$ROOT/product" || exit 1
assert_system_readonly || exit 1  # checked again after the engine installs, right before the model starts
start=$(date +%s); rc=0
# The output files are opened by the runner, so the agent cannot swap them for links.
as_agent env ANTHROPIC_BASE_URL=http://127.0.0.1:8790 ANTHROPIC_AUTH_TOKEN=freecc API_TIMEOUT_MS=600000 DISABLE_AUTOUPDATER=1 CLAUDE_CODE_DISABLE_NONESSENTIAL_TRAFFIC=1 \
  BASH_DEFAULT_TIMEOUT_MS=900000 BASH_MAX_TIMEOUT_MS=900000 \
  timeout "$seconds" claude -p "$(cat "$prompt")" "$@" --max-turns "$turns" --output-format stream-json --verbose \
  > "$out/$name.jsonl" 2> "$out/$name.stderr" || rc=$?
kill_agent
echo "$name model=$model exit=$rc seconds=$(( $(date +%s) - start ))" | tee "$out/$name-run.txt"
