#!/usr/bin/env bash
set -euo pipefail

. scripts/android-env.sh adb

# Resolved as its own assignment, not inlined into adb's argument list, so a
# resolve-apk.sh failure (set -e) stops here with just its own clear error —
# instead of still running `adb install -r ""` afterwards with a confusing
# second error on top of it.
apk_path=$(bash scripts/resolve-apk.sh)
adb install -r "$apk_path"
