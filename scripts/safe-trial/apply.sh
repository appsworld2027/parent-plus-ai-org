#!/usr/bin/env bash
# Applies a build patch to the clean workspace. Paths are checked from what was really applied, never from the
# build machine's list. Usage: apply.sh <patch>. Exit 1 = refused or empty.
set -uo pipefail
ROOT=${TRIAL_ROOT:-/srv/trial}
. "$ROOT/judge/trial.env"
cd "$ROOT/product" || exit 1
: > "$ROOT/judge/change.raw"
git apply --index "$1" || { echo "patch is empty or does not apply"; exit 1; }
git diff --cached --raw --no-renames "$BASE_SHA" > "$ROOT/judge/change.raw"
git diff --cached -U0 --no-color "$BASE_SHA" > "$ROOT/judge/change.diff"
node "$ROOT/judge/scripts/safe-trial.mjs" guard "$ROOT/judge/change.raw" "$ROOT/judge/change.diff"
