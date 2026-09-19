#!/usr/bin/env bash
set -euo pipefail

# Prints the path of the APK under test. An APK dropped into android-apk/
# takes precedence, so a locally built or patched binary can be exercised
# without touching the app repo clone. Falls back to the repo's prebuilt
# APK, cloning it first if needed.
local_apk=$(find android-apk -name '*.apk' -type f 2>/dev/null | sort | head -n 1 || true)
if [ -n "$local_apk" ]; then
  printf '%s\n' "$local_apk"
  exit 0
fi

bash scripts/fetch-app.sh

repo_apk="android-app/bin/VideoQAChallenge-debug.apk"
if [ ! -f "$repo_apk" ]; then
  printf 'resolve-apk.sh: app repo fetched but expected APK is missing: %s\n' "$repo_apk" >&2
  printf 'Check that the clone succeeded and the binary still ships at that path.\n' >&2
  exit 1
fi
printf '%s\n' "$repo_apk"
