# Video QA Challenge — Android Test Automation

[![E2E Tests](https://github.com/roopeshh/video-qa-challenge-android-tests/actions/workflows/e2e.yml/badge.svg)](https://github.com/roopeshh/video-qa-challenge-android-tests/actions/workflows/e2e.yml)

Automated black-box UI tests for the Video QA Challenge Android app — consent handling, the video overview, content detail pages, and the player's state machine.

## Solution & tooling

This repository automates the assignment's suggested minimum scope plus additional risk-based coverage: **14 automated P0+P1 scenarios** against consent, content browsing, and playback (state machine transitions through `Buffering → Playing`, pause/resume, completion, and error/retry). 8 further P2 scenarios are specified but not implemented — see [TEST_PLAN.md](TEST_PLAN.md) #6.

Built with **Appium 2 + WebdriverIO + TypeScript** — the assignment's own preferred combination, not a fallback requiring justification. UiAutomator2 drives the app black-box, the same way a real user would interact with it, rather than through instrumentation; WebdriverIO gives a mature TypeScript-first test runner with built-in retry/wait helpers and pluggable reporters; Mocha keeps the framework layer simple for this scope. Full reasoning for every tool choice, the layering rule (`spec → screen object → WebdriverIO → Appium → device`), locator strategy, and CI design is in [architecture.md](architecture.md).

## Test execution report

The suite was executed and passed in three environments:

| Environment | How | Why this environment | Run |
|---|---|---|---|
| Local Android Emulator (Pixel 9 Pro XL, API 35) | `npm run test:local` | Primary development loop — fast iteration, zero cost, and fully deterministic since the app has no network or login dependency to introduce flakiness. | No hosted run to link — follow [Quick start](#quick-start); results are generated locally in `reports/mochawesome/` and `reports/allure-report/` (see [Test report](#test-report)). |
| CI — GitHub Actions hosted emulator | `.github/workflows/e2e.yml`, `emulator-e2e` job (`workflow_dispatch`) | Validates the suite on a clean, unmodified checkout rather than a locally-configured machine — catches environment-coupling issues (hardcoded paths, machine-specific state) before a reviewer would hit them running it themselves. | [Tests and results](https://github.com/roopeshh/video-qa-challenge-android-tests/actions/runs/35473473072) |
| AWS Device Farm — real/virtual device pool | `.github/workflows/e2e.yml`, `device-farm-e2e` job, via `devicefarm/testspec.yml` | The app's own documentation notes emulator video playback is simulated, not real decoding/rendering — a device farm pass is the one environment that actually exercises real hardware, which local/CI emulators can't validate by construction. | [Tests and results](https://github.com/roopeshh/video-qa-challenge-android-tests/actions/runs/35475687097) |

Reports are generated fresh per run (gitignored, not committed) at `reports/mochawesome/index.html` and `reports/allure-report/index.html` locally, and uploaded as CI artifacts (`mochawesome-report`, `allure-report`) on every dispatched run, including on failure — see [Test report](#test-report) below.

## Prerequisites

Install these before running the local suite:

- [Node.js 20](https://nodejs.org/en/download) — the repository includes an `.nvmrc` for `nvm use`.
- [Git](https://git-scm.com/downloads) — used to fetch the app under test.
- JDK 21 — see the platform-specific commands in [setup.md](setup.md).
- [Android Studio and the Android SDK](https://developer.android.com/studio/install), including:
  - Android SDK Platform 35
  - Android SDK Platform-Tools (`adb`)
  - Android Emulator
  - A Google APIs API 35 system image for the host architecture
- An Android Virtual Device named `Pixel_9_Pro_XL` (API 35). Create it with [Android Studio Device Manager](https://developer.android.com/studio/run/managing-avds), or follow the command-line instructions in [setup.md](setup.md).

Verify the Android setup:

```bash
adb --version
emulator -list-avds  # must include Pixel_9_Pro_XL
```

The test bootstrap automatically checks `ANDROID_HOME`, `ANDROID_SDK_ROOT`, and the standard macOS (`~/Library/Android/sdk`) and Linux (`~/Android/Sdk`) SDK locations. If the SDK is installed elsewhere, export one of those variables before running the suite:

```bash
export ANDROID_HOME="/path/to/Android/sdk"
export PATH="$ANDROID_HOME/platform-tools:$ANDROID_HOME/emulator:$PATH"
```

Missing SDK tools or the required AVD now produce one actionable prerequisite error instead of cascading shell failures.

## Quick start

1. Complete the prerequisites above; [setup.md](setup.md) provides detailed macOS instructions.
2. Install the Node.js dependencies:

   ```bash
   npm ci
   ```

3. Install the Appium UiAutomator2 driver:

   ```bash
   npx appium driver install uiautomator2
   ```

4. Fetch and install the app, boot the emulator when needed, and run the suite:

   ```bash
   npm run test:local
   ```

   To test a different binary instead — for example a locally built APK — drop it into `android-apk/`. `scripts/resolve-apk.sh` prefers it over the app repo's prebuilt APK everywhere; leave the folder empty to use the repo binary.

5. Check formatting and lint rules:

   ```bash
   npm run lint
   ```

## Test report

Every suite run generates two self-contained visual reports for comparison:

```text
reports/mochawesome/index.html    # Mochawesome
reports/allure-report/index.html  # Allure
```

Open either file directly in a browser to compare suite organization, charts, durations, and individual test results. When a test fails, both reports include the assertion error and stack trace, an embedded device screenshot, and the most recent tagged application logs (`VQC.app`, `VQC.consent`, `VQC.content`, `VQC.player`, and `VQC.debug`).

GitHub Actions uploads them separately as the `mochawesome-report` and `allure-report` artifacts, even when the suite fails.

## Documentation

- [Test plan](TEST_PLAN.md) — the full test plan: all 22 identified scenarios (14 automated P0+P1, 8 deferred P2 with reasons), setup/steps/expected results, traceability to spec files, and #7 for risks and open questions — this is the test-plan-and-next-steps write-up the assignment asks for.
- [Architecture](architecture.md) — framework structure, design decisions, scripts, configuration, and CI
- [Local setup](setup.md) — macOS, Android SDK, emulator, and Appium prerequisites
- [Contributor rules](CLAUDE.md) — required layering, locator, waiting, naming, and style conventions

## Test commands

```bash
npm run test:local
npm run test:ci
npm run lint
```

## AI usage note

AI assistance was used throughout, in two phases: Devin scaffolded the initial project structure, screen objects, and specs; Claude Code then did extensive review, debugging, and hardening passes against this repo's own governing docs (`CLAUDE.md`, `architecture.md`, `TEST_PLAN.md`). Every AI-suggested change was verified before being accepted — either against the actual app source directly, by running the suite on a real emulator/device, or both. Several findings only survived because of that verification step; a few didn't (see the scripts audit example below).

Representative prompts, grouped by what this assignment asks about. Kept close to verbatim — the point is to show real usage, not a cleaned-up transcript.

**Generating / reviewing test scenarios**
- *"Should TC15 be in P1, as even after consent rejection the videos load and continue to work?"* — pushed past the test plan's own stated rationale and had Claude trace the app's actual consent-handling Kotlin source (`AppContainer.kt`) directly, confirming accept/reject converge on identical downstream state before agreeing TC15 stays in P2.
- *"Yes, rename it"* / *"Fix all three points mentioned, please."* — short, direct approvals once a finding and proposed fix had already been explained, rather than re-litigating the reasoning.

**Writing test code**
- *"Is there no other way dealing with XPath for get playButton()? I dont prefer using xpath, how can this be improved?"* — led to reading the app's actual Compose UI source directly to prove the XPath-based locator scoping was unnecessary, then simplifying the locator with a comment that cites the exact source file backing the claim, not just an assertion.
- *"Review that all the scripts from the scripts folder are required, and just make sure that nothing extra is in the script files. Especially because they're scripting, it's very hard to read for anyone, and then we might be doing something which is not intended."* — a full audit of `scripts/*.sh` that found a real bug (`wait-for-emulator.sh` looping forever with no timeout) and caught a landmine before it shipped: naively adding `set -euo pipefail` would have made a routine zero-device-attached case silently kill the script (`grep -c` returns exit 1 on a zero count) — confirmed by reproducing both the bug and the fix in a sandbox rather than trusting the reasoning alone.
- *"Review the src/helpers folder and then see if they are in any way related to the tests. Just want to make sure that they are not dependent on anything."* — a real dependency-graph check (actual imports, both directions), not a guess: confirmed no screen object imports a helper and no helper imports a screen or spec.

**Reasoning about the app under test**
- *"How does device farm gets apk and installs it?"* — traced the full path end-to-end: `scripts/resolve-apk.sh`, then the `aws-devicefarm-mobile-device-testing` action's actual upload behavior (checked against that action's own docs instead of assumed), then Device Farm's own device-provisioning model.
- *"which version of java are we using? I believe JDK 21 is what I see in the Java version, but I want to understand why JDK is set to 17 in the setup.md. I see a comment that JDK 17 is the safe LTS choice, but how about 21?"* — surfaced that the documented reason (the app's own Gradle wrapper) wasn't actually why a JDK was needed in the automated pipeline at all; the real reason — Appium's UiAutomator2 driver itself — was found by checking Appium's own requirements docs, not by trusting the existing comment.

**Creating architecture.md**

The initial ask:
> *"I want you to create architecture.md for the test framework - one clean document that explains what we actually built and why. Walk through the folder structure, why we picked Appium + WebdriverIO + TypeScript over the other options, how the script layer makes 'one command, works anywhere' actually true, why webdriverIO config uses same file for local, CI, and Device Farm and the locator strategy, state machine rules, and test isolation pattern etc. This should all be as per our discussions and decisions that we made earlier."*

The correction, once the first draft carried leftover "Revision note" framing and "(unchanged from original)" tags on several section headers:
> *"I don't want document's own revision history - I want one doc free flowing with exactly what architecture should have with what we have implemented so far. I am adding no more features, even if I add we can again add it as one document, without mentioning revision."*

Result: a full rewrite — every "(unchanged)" / "what's new vs. the original" reference removed, and the locator/state-machine/test-isolation section written out for real instead of pointing at a "prior version" that no longer existed once the doc was flattened to a single revision.

No AI-generated code, scenario, or claim in this documentation was accepted without independent verification — reading the relevant Kotlin/Android source, checking a library's own docs, or actually running the suite against a live emulator or device.

## Time spent

Roughly 9 hours total:
- ~6h building the automated suite (screen objects, specs, helpers), including reviewing and fixing the initial code
- ~2h AWS Device Farm / CI environment setup, including fixing issues with the initial setup
- ~1h documentation
