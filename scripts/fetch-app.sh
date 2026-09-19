#!/usr/bin/env bash
set -euo pipefail

[ -d android-app ] || git clone --depth 1 \
  https://github.com/tchumakina/video-qa-challenge-android.git android-app
