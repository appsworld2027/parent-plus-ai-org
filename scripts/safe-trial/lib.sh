# Shared helpers for the safe trial. Users: trialagent runs the model and all model-written code (no sudo, no
# internet, only this machine); trialproxy holds the NVIDIA key and runs the engine. The runner user judges.
ROOT=${TRIAL_ROOT:-/srv/trial}
as_agent() {
  sudo -u trialagent env -i HOME=/home/trialagent PATH="$PATH" LANG=C.UTF-8 CI=1 EXPO_OFFLINE=1 EXPO_NO_TELEMETRY=1 \
    PLAYWRIGHT_BROWSERS_PATH="$ROOT/browsers" \
    EXPO_PUBLIC_SUPABASE_URL=https://example.supabase.co EXPO_PUBLIC_SUPABASE_PUBLISHABLE_KEY=sb_publishable_example_public_test_key \
    "$@"
}
kill_agent() { for _ in 1 2 3 4 5; do sudo pkill -KILL -u trialagent 2>/dev/null || break; sleep 1; done; return 0; }
# Hand the workspace to the agent. Files that judge the work stay root-owned and cannot be changed, renamed or replaced.
JUDGE_PATHS="e2e/acceptance playwright.config.ts package.json package-lock.json tsconfig.json vitest.config.mts config scripts"
lock_workspace() {
  local p=$ROOT/product
  sudo chown -R trialagent: "$p"
  # The root folder is locked below, so git must be told this workspace is expected.
  sudo -u trialagent -H git config --global --replace-all safe.directory "$p"
  for f in $JUDGE_PATHS; do sudo chown -R root:root "$p/$f"; sudo chmod -R go-w "$p/$f"; done
  # Sticky, root-owned folders: new files are allowed, replacing someone else's entry is not.
  sudo chown root:root "$p" "$p/e2e"; sudo chmod 1777 "$p" "$p/e2e"
}
