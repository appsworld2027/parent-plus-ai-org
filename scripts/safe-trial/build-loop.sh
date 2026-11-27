#!/usr/bin/env bash
# Build, test, send failures back, fix: a limited loop on the build machine. This self-check only steers the builder;
# the official grade still runs later on a clean machine. Usage: build-loop.sh <baseline folder>
set -uo pipefail
. "$(dirname "$0")/lib.sh"
. "$ROOT/judge/trial.env"
base=$(realpath -m "$1"); J=$ROOT/judge; S=$J/scripts/safe-trial; out=$ROOT/out; mkdir -p "$out"
MAX_FIX_ROUNDS=2
FIRST_SECONDS=3600
FIX_SECONDS=1500
tools="Bash,Read,Edit,Write,Glob,Grep"
cp "$base/all.json" "$J/before.json" || { echo "::error::No baseline results. No model is run."; exit 1; }
lock_workspace
bash "$S/agent.sh" builder "$TRIAL_BUILDER" "$J/builder-prompt.txt" "$FIRST_SECONDS" 150 --allowedTools "$tools" || exit 1
for round in $(seq 1 $((MAX_FIX_ROUNDS + 1))); do
  bash "$S/collect.sh" || exit 1
  r=$J/selfcheck-$round; mkdir -p "$r"
  if ! node "$J/scripts/safe-trial.mjs" guard "$out/change.raw" "$out/change.patch" > "$r/guard.txt"; then
    # Not run: tests are only executed against allowed changes.
    printf -- '- the change is empty or touches files that are not allowed:\n%s\n' "$(head -20 "$r/guard.txt" | sed 's/::/: :/g')" > "$r/grade-failures.txt"
    passed=1
  else
    bash "$S/run-tests.sh" "$r" > /dev/null
    passed=0
    VERDICT_EXIT=1 node "$J/scripts/safe-trial.mjs" verdict "$out/change.raw" "$(cat "$r/check.exit" 2>/dev/null || echo 1)" \
      "$r/acceptance.json" "$J/before.json" "$r/all.json" "$r/grade.txt" > /dev/null || passed=1
  fi
  cp "$r/grade-failures.txt" "$out/round-$round-failures.txt"
  if [ "$passed" = 0 ]; then echo "self-check $round: passed" | tee -a "$out/rounds.txt"; break; fi
  echo "self-check $round: failures found" | tee -a "$out/rounds.txt"
  [ "$round" -le "$MAX_FIX_ROUNDS" ] || break
  node "$J/scripts/safe-trial.mjs" fix-prompt "$r/grade-failures.txt" > "$J/fix-prompt.txt"
  bash "$S/agent.sh" "builder-fix$round" "$TRIAL_BUILDER" "$J/fix-prompt.txt" "$FIX_SECONDS" 80 --allowedTools "$tools" || exit 1
done
bash "$S/collect.sh"
