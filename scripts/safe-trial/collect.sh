#!/usr/bin/env bash
# Takes the build as a patch. git runs as the agent user, so nothing the agent configured runs as the judge.
set -uo pipefail
. "$(dirname "$0")/lib.sh"
. "$ROOT/judge/trial.env"
kill_agent
out=$ROOT/out; mkdir -p "$out"
cd "$ROOT/product" || exit 1
as_agent git add -A
as_agent git diff --cached --binary --no-renames --no-ext-diff --no-textconv "$BASE_SHA" > "$out/change.patch"
as_agent git diff --cached --raw --no-renames "$BASE_SHA" > "$out/change.raw"
as_agent git diff --cached --stat "$BASE_SHA" | tail -20
