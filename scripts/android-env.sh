#!/usr/bin/env bash
set -euo pipefail

sdk_roots=()

if [ -n "${ANDROID_HOME:-}" ]; then
  sdk_roots+=("$ANDROID_HOME")
fi
if [ -n "${ANDROID_SDK_ROOT:-}" ]; then
  sdk_roots+=("$ANDROID_SDK_ROOT")
fi
if [ -n "${HOME:-}" ]; then
  sdk_roots+=("$HOME/Library/Android/sdk" "$HOME/Android/Sdk")
fi

for sdk_root in "${sdk_roots[@]}"; do
  if [ -x "$sdk_root/platform-tools/adb" ] || [ -x "$sdk_root/emulator/emulator" ]; then
    export ANDROID_HOME="$sdk_root"
    export ANDROID_SDK_ROOT="$sdk_root"
    export PATH="$sdk_root/platform-tools:$sdk_root/emulator:$sdk_root/cmdline-tools/latest/bin:$PATH"
    break
  fi
done

for tool in "$@"; do
  if ! command -v "$tool" >/dev/null 2>&1; then
    printf 'Missing Android SDK tool: %s\n' "$tool" >&2
    printf 'Install the required Android SDK components and see README.md#prerequisites for setup instructions.\n' >&2
    exit 1
  fi
done

# No adb call in this suite targets a specific device (see wdio.conf.ts's
# capabilities comment) — it assumes exactly one is attached and lets ADB
# pick implicitly. With more than one, every plain `adb` command becomes
# ambiguous and fails with "adb: more than one device/emulator" — which,
# left uncaught, surfaces minutes into a run as a cryptic crash inside a
# spec's beforeEach instead of here, at the one place that already checks
# prerequisites before anything starts.
if printf '%s\n' "$@" | grep -qx 'adb'; then
  # grep -c exits 1 when the count is 0 — zero attached devices is a normal
  # state here (this check only cares about *more than one*), so that must
  # not be treated as a failure now that set -e is active.
  attached_devices=$(adb devices | grep -c 'device$' || true)
  if [ "$attached_devices" -gt 1 ]; then
    printf 'More than one Android device/emulator is attached — this suite assumes exactly one:\n' >&2
    adb devices >&2
    printf 'Disconnect the extra device or stop the extra emulator, then try again.\n' >&2
    exit 1
  fi
fi
