#!/usr/bin/env bash
set -euo pipefail
# Evaluator branch only; invoked by a fresh no-model-credential runner.
test -z "${GROQ_API_KEY:-}" && test -z "${NVIDIA_NIM_API_KEY:-}" || { echo 'Unexpected model credential in grading'; exit 1; }
if [ "$1" = prepare ]; then
  mkdir -p "$RUNNER_TEMP/control"
  cp "$0" "$RUNNER_TEMP/control/grade.sh"
  cp handbook/trial/controls/course-test-control-server.mjs "$RUNNER_TEMP/control/server.mjs"
  cp handbook/trial/controls/course-suite-grade.mjs "$RUNNER_TEMP/control/grade.mjs"
  node --check "$RUNNER_TEMP/control/grade.mjs"
  node handbook/trial/controls/quinn-suite-packet-author.mjs verify "$GITHUB_WORKSPACE/authored" "$RUNNER_TEMP/control"
  bash handbook/scripts/safe-trial/prepare.sh handbook
  cd /srv/trial/product
  test "$(sha256sum docs/product/coach-course-management/ACCEPTANCE.md | cut -d' ' -f1)" = 6695ab62149003b833c1afa04a2f6e674db3494efe7048864357095de07176aa
  node --input-type=module <<'NODE'
import {readFileSync,writeFileSync} from 'node:fs';import {createHash} from 'node:crypto';
const sha=x=>createHash('sha256').update(x).digest('hex'),paths=['e2e/support/backend.ts','playwright.config.ts','package.json','App.tsx'];
writeFileSync(process.env.RUNNER_TEMP+'/control/support.json',JSON.stringify({schema:'course-support/v1',source:'710082b2d8cf3c1007086df31f87b34ae8e02573',files:Object.fromEntries(paths.map(p=>[p,sha(readFileSync(p))]))},null,2)+'\n');
NODE
  cp "$RUNNER_TEMP/control/suite.spec.ts" e2e/acceptance/coach-course-management.spec.ts
  if [ -f "$RUNNER_TEMP/control/guard.spec.ts" ]; then cp "$RUNNER_TEMP/control/guard.spec.ts" e2e/acceptance/course-suite-guard.spec.ts; fi
  npm ci --no-audit --no-fund
  PLAYWRIGHT_BROWSERS_PATH=/srv/trial/browsers npx playwright install --with-deps chromium
  chmod -R a+rX /srv/trial/browsers
  bash /srv/trial/judge/scripts/safe-trial/isolate.sh
elif [ "$1" = grade ]; then
  . /srv/trial/judge/scripts/safe-trial/lib.sh
  lock_workspace grading
  mkdir -p /srv/trial/out
  cp "$RUNNER_TEMP/control/"{compiled,support}.json /srv/trial/out/
  cp "$RUNNER_TEMP/control/suite.spec.ts" /srv/trial/out/
  if [ -f "$RUNNER_TEMP/control/guard.spec.ts" ]; then cp "$RUNNER_TEMP/control/guard.spec.ts" /srv/trial/out/; fi
  cd /srv/trial/product
  start_server(){ MUTANT="$1" PORT=18082 node "$RUNNER_TEMP/control/server.mjs" >/srv/trial/out/server.log 2>&1 & SERVER=$!; for i in $(seq 1 25); do if curl -sf http://127.0.0.1:18082/ >/dev/null; then return 0; fi; sleep 1; done; return 1; }
  stop_server(){ kill "$SERVER" 2>/dev/null || true; wait "$SERVER" 2>/dev/null || true; }
  trial(){
    local mode="$1" spec="$2" label="$3" grep="$4" rc=0
    start_server "$mode"
    args=(); if [ -n "$grep" ]; then args=(--grep "$grep"); fi
    as_agent env PLAYWRIGHT_BASE_URL=http://127.0.0.1:18082 timeout 200 npx playwright test "$spec" --reporter=json --workers=1 --timeout=22000 "${args[@]}" > "/srv/trial/out/$label.json" || rc=$?
    kill_agent; stop_server
    echo "$rc" > "/srv/trial/out/$label.exit"
  }
  spec=e2e/acceptance/coach-course-management.spec.ts
  guard=e2e/acceptance/course-suite-guard.spec.ts
  trial clean "$spec" clean ''
  while read -r mode id; do
    if node -e 'const r=require("/srv/trial/out/compiled.json");process.exit(r.positive.includes(process.argv[1])?0:1)' "$id"; then trial "$mode" "$spec" "$mode" "$id"; fi
  done <<'MUTANTS'
missing-entry CRS-01-SC-001
pilot-mislabel CRS-01-SC-001
invalid-title CRS-01-SC-002
invalid-persist CRS-01-SC-002
drop-objective CRS-01-SC-003
overwrite-history CRS-01-SC-004
duplicate-history CRS-01-SC-004
dirty-bypass CRS-01-SC-005
dirty-copy CRS-01-SC-005
lost-fields-on-keep CRS-01-SC-005
network-leak CRS-01-SC-006
MUTANTS
  rc=0
  as_agent timeout 600 npx playwright test "$spec" --reporter=json --workers=2 --timeout=30000 >/srv/trial/out/actual-red.json || rc=$?
  kill_agent; echo "$rc" >/srv/trial/out/actual-red.exit
  if [ -f "$guard" ]; then
    trial flag-off "$guard" guard-clean ''
    trial flag-off-leak "$guard" guard-mutant ''
    rc=0
    as_agent env EXPO_PUBLIC_COURSE_PILOT=0 timeout 300 npx playwright test "$guard" --reporter=json --workers=1 --timeout=30000 >/srv/trial/out/actual-guard.json || rc=$?
    kill_agent; echo "$rc" >/srv/trial/out/actual-guard.exit
  fi
  node "$RUNNER_TEMP/control/grade.mjs" /srv/trial/out
else
  echo 'Pass prepare or grade' >&2; exit 1
fi
