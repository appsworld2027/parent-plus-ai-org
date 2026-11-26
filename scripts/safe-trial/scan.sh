#!/usr/bin/env bash
# Last gate before anything is uploaded: only plain files, and no key. Needs NVIDIA_NIM_API_KEY.
set -uo pipefail
out=${1:?folder}
mkdir -p "$out"
if [ -n "$(find "$out" ! -type f ! -type d -print -quit)" ]; then rm -rf "$out"; echo "::error::Unexpected link or special file in output. Evidence deleted."; exit 1; fi
if { [ -n "${NVIDIA_NIM_API_KEY:-}" ] && grep -rqF -- "$NVIDIA_NIM_API_KEY" "$out"; } || grep -rqE 'nvapi-[A-Za-z0-9_-]{20,}' "$out"; then
  rm -rf "$out"; echo "::error::A key appeared in the output. Evidence deleted."; exit 1
fi
echo "scan passed"
