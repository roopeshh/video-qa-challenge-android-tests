#!/usr/bin/env bash
set -euo pipefail

. scripts/android-env.sh adb emulator

if ! adb devices | grep -q "device$"; then
  if ! emulator -list-avds | grep -Fxq "Pixel_9_Pro_XL"; then
    printf 'Missing Android Virtual Device: Pixel_9_Pro_XL\n' >&2
    printf 'Create the required API 35 AVD as described in README.md#prerequisites.\n' >&2
    exit 1
  fi

  emulator -avd Pixel_9_Pro_XL -no-snapshot -no-boot-anim &
fi
