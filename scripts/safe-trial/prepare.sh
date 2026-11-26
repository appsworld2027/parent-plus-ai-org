#!/usr/bin/env bash
# Builds the identical starting workspace on every machine. Usage: prepare.sh <handbook checkout>
set -euo pipefail
HB=$(realpath "$1"); ROOT=${TRIAL_ROOT:-/srv/trial}; SOURCE=${TRIAL_SOURCE:-https://github.com/appsworld2027/Parent-plus-.git}
eval "$(node "$HB/scripts/safe-trial.mjs" env | sed -E 's/^([A-Z_]+)=(.*)$/export \1="\2"/')"
sudo mkdir -p "$ROOT" && sudo chown "$(id -un):" "$ROOT"; chmod 755 "$ROOT"
git init -q "$ROOT/product" && cd "$ROOT/product"
git fetch -q --depth 1 "$SOURCE" "$TRIAL_BASE"
git checkout -q FETCH_HEAD
rm -rf $TRIAL_STRIP
find founders -mindepth 1 -maxdepth 1 ! -name prototypes -exec rm -rf {} +
printf '{\n  "supabaseUrl": "https://example.supabase.co",\n  "supabasePublishableKey": "sb_publishable_example_public_test_key"\n}\n' > config/public-client.json
cp "$HB/$TRIAL_SPEC" "e2e/acceptance/$TRIAL_SLUG.spec.ts"
printf '.ai-org-handbook/\n.trial/\n' >> .git/info/exclude
git config user.name "Safe trial"; git config user.email "41898282+github-actions[bot]@users.noreply.github.com"
git add -A && git commit -qm "trial baseline"
# The model sees two role files from the handbook, nothing else.
mkdir -p .trial .ai-org-handbook/org/agents
cp "$HB/org/agents/dev-coder.md" "$HB/org/agents/rex-reviewer.md" .ai-org-handbook/org/agents/
# The judge's own copy: scripts, prompts and settings, readable by the runner only. Then the full checkout goes away.
mkdir -p "$ROOT/judge" && chmod 700 "$ROOT/judge"
cp -r "$HB/scripts" "$ROOT/judge/scripts"
mkdir -p "$ROOT/judge/governance"
cp "$HB/governance/AUTONOMY_POLICY.json" "$ROOT/judge/governance/AUTONOMY_POLICY.json"
node "$HB/scripts/safe-trial.mjs" builder-prompt > "$ROOT/judge/builder-prompt.txt"
{ echo "TRIAL_SLUG=$TRIAL_SLUG"; echo "TRIAL_BUILDER=$TRIAL_BUILDER"; echo "TRIAL_REVIEWER=$TRIAL_REVIEWER"; echo "BASE_SHA=$(git rev-parse HEAD)"; } > "$ROOT/judge/trial.env"
cat "$ROOT/judge/trial.env" >> "${GITHUB_ENV:-/dev/null}"
if [ "${TRIAL_KEEP_HANDBOOK:-}" != 1 ]; then rm -rf "$HB"; fi
