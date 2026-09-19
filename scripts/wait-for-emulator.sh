#!/usr/bin/env bash
set -euo pipefail

. scripts/android-env.sh adb

adb wait-for-device

# Bounded, unlike a plain `until ...; do sleep 2; done` — a hung or
# never-completing boot would otherwise loop forever here instead of failing
# with an actionable error the way every other prerequisite check in this
# folder does.
timeout_seconds=180
elapsed=0
until [ "$(adb shell getprop sys.boot_completed | tr -d '\r')" = "1" ]; do
  if [ "$elapsed" -ge "$timeout_seconds" ]; then
    printf 'wait-for-emulator.sh: emulator did not finish booting within %ss.\n' "$timeout_seconds" >&2
    printf 'Check `adb devices` and the emulator process/logs, then try again.\n' >&2
    exit 1
  fi
  sleep 2
  elapsed=$((elapsed + 2))
done
