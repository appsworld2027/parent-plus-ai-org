#!/usr/bin/env bash
# Runs the product's tests as trialagent. Reports are captured by the runner. Usage: run-tests.sh <report folder>
# A failing test is a result: this script records exit codes and always finishes.
set -uo pipefail
. "$(dirname "$0")/lib.sh"
. "$ROOT/judge/trial.env"
r=${1:?report folder}; mkdir -p "$r"
cd "$ROOT/product" || exit 1
rc=0; as_agent timeout 1200 npx playwright test "e2e/acceptance/$TRIAL_SLUG.spec.ts" --reporter=json --timeout=30000 --workers=2 > "$r/acceptance.json" || rc=$?
kill_agent
rc=0; as_agent timeout 1500 npx playwright test --reporter=json --timeout=30000 --workers=2 --retries=1 > "$r/all.json" || rc=$?
kill_agent
check=0; as_agent timeout 900 npm run check > "$r/check.log" 2>&1 || check=$?
kill_agent
echo "$check" > "$r/check.exit"
if [ "${TRIAL_PROFILE:-}" = "course-pilot" ]; then
  # Untrusted model-written tests may emit workflow commands; reports remain in scanned artifacts.
  echo "Course check exit: $check"
else
  tail -15 "$r/check.log"
fi
