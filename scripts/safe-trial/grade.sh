#!/usr/bin/env bash
# Grades a build on a fresh machine with no secret. Usage: grade.sh <patch> <baseline folder>
set -uo pipefail
. "$(dirname "$0")/lib.sh"
patch=$(realpath -m "$1"); base=$(realpath -m "$2")
J=$ROOT/judge; out=$ROOT/out; mkdir -p "$out" "$J/after"
cp "$base/all.json" "$J/before.json" 2>/dev/null || : > "$J/before.json"
if bash "$J/scripts/safe-trial/apply.sh" "$patch"; then
  lock_workspace
  bash "$J/scripts/safe-trial/run-tests.sh" "$J/after"
fi
check=$(cat "$J/after/check.exit" 2>/dev/null || echo 1)
node "$J/scripts/safe-trial.mjs" verdict "$J/change.raw" "$check" "$J/after/acceptance.json" "$J/before.json" "$J/after/all.json" "$out/grade.txt"
cp "$J/after/"* "$out/" 2>/dev/null || true
