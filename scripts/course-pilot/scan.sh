#!/usr/bin/env bash
# Publish nothing if any nonregular file or credential is detected.
set -euo pipefail
PATH=/usr/sbin:/usr/bin:/sbin:/bin
out=$1
[ -d "$out" ] || { echo "::error::Missing pilot evidence"; exit 1; }
[ -z "$(find "$out" ! -type f ! -type d -print -quit)" ] || { echo "::error::Unexpected output link or special file; refusing upload"; exit 1; }
if { [ -n "${GROQ_API_KEY:-}" ] && grep -rqF -- "$GROQ_API_KEY" "$out"; } || grep -rqE 'gsk_[A-Za-z0-9_-]{20,}|nvapi-[A-Za-z0-9_-]{20,}' "$out"; then
  echo "::error::Credential pattern in evidence; refusing upload"; exit 1
fi
echo "Course pilot evidence scan passed"
