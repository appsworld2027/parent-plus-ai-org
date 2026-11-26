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
# Fails if the agent could change any program or system file that the judge or a secret step might run.
PROTECTED_TREES=${TRIAL_PROTECTED_TREES:-"/opt /usr /etc"}
assert_system_readonly() {
  local d found trees="$PROTECTED_TREES" back=$PWD
  cd /
  local entry exact; local IFS=:
  for entry in $PATH; do
    d=$entry exact=1
    while [ -n "$d" ] && [ "$d" != / ]; do
      # A sticky folder (like /tmp) is safe as a parent: others cannot replace an existing entry in it.
      if sudo -u trialagent test -w "$d" && { [ "$exact" = 1 ] || [ ! -k "$d" ]; }; then echo "::error::the agent user can write to $d (on PATH)"; cd "$back"; return 1; fi
      if [ -d "$d" ]; then exact=0; else exact=1; fi
      d=$(dirname "$d")
    done
  done
  unset IFS
  found=$(sudo -u trialagent find $trees ! -type l -writable -print 2>/dev/null | head -5) || true  # unreadable folders make find exit 1
  [ -z "$found" ] || { echo "::error::the agent user can write to system files: $found"; cd "$back"; return 1; }
  if sudo -u trialagent test -w /var/run/docker.sock; then echo "::error::the agent user can use Docker"; cd "$back"; return 1; fi
  cd "$back"
}
JUDGE_PATHS="e2e/acceptance playwright.config.ts package.json package-lock.json tsconfig.json vitest.config.mts config scripts"
lock_workspace() {
  local p=$ROOT/product
  sudo chown -R trialagent: "$p"
  # The root folder is locked below, so git must be told this workspace is expected.
  # Commands run as another user must start in a folder that user can open; the runner's folders are closed to it.
  (cd / && sudo -u trialagent -H git config --global --replace-all safe.directory "$p")
  for f in $JUDGE_PATHS; do sudo chown -R root:root "$p/$f"; sudo chmod -R go-w "$p/$f"; done
  # Sticky, root-owned folders: new files are allowed, replacing someone else's entry is not.
  sudo chown root:root "$p" "$p/e2e"; sudo chmod 1777 "$p" "$p/e2e"
  # When grading, existing tests are locked too. (While building, only the patch guard protects them.)
  if [ "${1:-}" = grading ]; then
    sudo find "$p/tests" "$p/e2e" -path "$p/e2e/support" -prune -o -type f -exec chown root:root {} + -exec chmod go-w {} +
    sudo find "$p/tests" "$p/e2e" -path "$p/e2e/support" -prune -o -type d -exec chown root:root {} + -exec chmod 1777 {} +
  fi
}
