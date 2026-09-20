# Architecture — Video QA Challenge (Android) Test Framework

Target app: `com.videoqa.challenge` (Android, prebuilt debug APK, no build required)
Stack: **Appium 2 + WebdriverIO + TypeScript**, UiAutomator2 driver, Mocha test runner.

---

## 1. Why this stack

| Choice | Reason |
|---|---|
| Android over iOS | Free/standard CI runners, zero-build prebuilt APK, no Xcode dependency |
| Appium 2 | Required tooling for this project — black-box, closer to real user interaction |
| WebdriverIO | Built-in test runner, reporters, retry/wait helpers, first-class TS support |
| TypeScript | Required language for this project |
| Mocha | Simplest, lowest config overhead for this scope |
| Local emulator for dev, ephemeral CI emulator for CI | Fast local iteration; disposable, reproducible cloud runs — no device-cloud cost needed for this scope |

---

## 2. Folder structure

```
video-qa-android-tests/
├── .github/
│   └── workflows/
│       └── e2e.yml                  # CI: boots emulator, installs app, runs suite, uploads report
├── android-app/                     # cloned fresh by scripts/ locally, by CI step in the cloud — gitignored, never committed
│   └── bin/VideoQAChallenge-debug.apk
├── android-apk/                     # drop an APK here to override the app repo's binary — *.apk gitignored
├── scripts/
│   ├── android-env.sh               # resolves SDK tools or fails with prerequisite guidance
│   ├── start-emulator.sh            # local only: boots AVD if none running
│   ├── wait-for-emulator.sh         # local + CI: blocks until boot_completed
│   ├── fetch-app.sh                 # shallow-clones app repo if android-app/ missing
│   ├── resolve-apk.sh               # single source of truth: android-apk/*.apk wins, else repo's APK
│   └── install-app.sh               # local + CI: adb install -r "$(resolve-apk.sh)"
├── src/
│   ├── screens/
│   │   ├── consent.screen.ts
│   │   ├── overview.screen.ts
│   │   ├── detail.screen.ts
│   │   └── player.screen.ts
│   ├── helpers/
│   │   ├── launchArgs.ts            # builds --ez/--es/--ei intent-extra strings
│   │   ├── appState.ts              # force-stop + relaunch-with-extras (test isolation)
│   │   ├── report.ts                # merges per-worker Mochawesome JSON, renders the HTML report
│   │   └── allureReport.ts          # renders the Allure HTML report from allure-results
│   └── types/
│       └── playerState.ts
├── tests/
│   ├── smoke/                       # P0 + the P1s that extend the same flows
│   │   ├── consent.spec.ts          # TC01
│   │   ├── content-navigation.spec.ts # TC02, TC12, TC13
│   │   └── playback.spec.ts         # TC03, TC09, TC10, TC11
│   └── regression/
│       ├── negative-states.spec.ts  # TC04, TC05, TC06
│       └── player-edge-cases.spec.ts # TC07, TC08
├── reports/
│   ├── mochawesome/                 # Mochawesome HTML report; uploaded as CI artifact
│   └── allure-report/               # Allure HTML report; uploaded as CI artifact
├── wdio.conf.ts                     # environment-agnostic — see #5
├── tsconfig.json
├── package.json                     # see #4 for the script layer
├── .nvmrc
├── architecture.md
├── setup.md
├── TEST_PLAN.md
└── README.md
```

---

## 3. Scenario → spec traceability

| Spec file | Scenarios covered |
|---|---|
| `tests/smoke/consent.spec.ts` | TC01 |
| `tests/smoke/content-navigation.spec.ts` | TC02, TC12 (scroll + id-based open), TC13 (refresh) |
| `tests/smoke/playback.spec.ts` | TC03, TC09 (pause/resume), TC10 (resume position), TC11 (completes quickly) |
| `tests/regression/negative-states.spec.ts` | TC04 (content error), TC05 (empty), TC06 (fixed slow delay), TC14 (slow-response content mode) |
| `tests/regression/player-edge-cases.spec.ts` | TC07 (fixed long buffering), TC08 (video error + retry) |

Full scenario detail — setup, steps, expected results — lives in `TEST_PLAN.md`; this table is just the map from plan to code.

---

## 4. The script layer — this is what makes "one command, works anywhere" true

Four setup concerns plus one shared Android SDK bootstrap, composed differently for local vs. CI. Each Android-facing script sources `android-env.sh`, which checks `ANDROID_HOME`, `ANDROID_SDK_ROOT`, and the standard macOS/Linux SDK locations before failing with one actionable prerequisite error. It also fails fast, before anything else runs, if more than one Android device/emulator is attached — no `adb` call anywhere in this suite targets a specific device (see `wdio.conf.ts`'s capabilities comment below), so ambiguity here would otherwise surface as a cryptic `adb: more than one device/emulator` crash minutes into a run instead of an actionable error at the start.

```bash
# scripts/resolve-apk.sh — every APK consumer goes through this; it is the
# single place that decides which binary is under test
local_apk=$(find android-apk -name '*.apk' -type f 2>/dev/null | sort | head -n 1 || true)
if [ -n "$local_apk" ]; then
  printf '%s\n' "$local_apk"
  exit 0
fi

bash scripts/fetch-app.sh
printf '%s\n' "android-app/bin/VideoQAChallenge-debug.apk"

# scripts/fetch-app.sh — idempotent; only runs when android-apk/ is empty
[ -d android-app ] || git clone --depth 1 \
  https://github.com/tchumakina/video-qa-challenge-android.git android-app

# scripts/start-emulator.sh — LOCAL ONLY, never runs in CI
. scripts/android-env.sh adb emulator

if ! adb devices | grep -q "device$"; then
  if ! emulator -list-avds | grep -Fxq "Pixel_9_Pro_XL"; then
    printf 'Missing Android Virtual Device: Pixel_9_Pro_XL\n' >&2
    printf 'Create the required API 35 AVD as described in README.md#prerequisites.\n' >&2
    exit 1
  fi

  emulator -avd Pixel_9_Pro_XL -no-snapshot -no-boot-anim &
fi

# scripts/wait-for-emulator.sh — LOCAL + CI
. scripts/android-env.sh adb

adb wait-for-device
until [ "$(adb shell getprop sys.boot_completed | tr -d '\r')" = "1" ]; do sleep 2; done

# scripts/install-app.sh — LOCAL + CI
. scripts/android-env.sh adb

adb install -r "$(bash scripts/resolve-apk.sh)"
```

The `android-apk/` precedence rule exists so a locally built or patched APK can be exercised without touching the app repo clone — drop a binary there and every entry point (`install-app.sh`, `wdio.conf.ts`, the Device Farm `appArn`) picks it up; empty the folder and everything falls back to the repo's prebuilt APK.

The complete SDK-location resolution and tool validation live in `scripts/android-env.sh`; keeping that logic centralized prevents the three Android-facing scripts from drifting.

`package.json`:

```json
{
  "scripts": {
    "pretest:local": "bash scripts/start-emulator.sh && bash scripts/wait-for-emulator.sh && bash scripts/install-app.sh",
    "test:local": "wdio run wdio.conf.ts",
    "test:ci": "bash scripts/install-app.sh && wdio run wdio.conf.ts"
  }
}
```

- **`npm run test:local`** — the single command to set up and run everything locally. It resolves the APK (dropped into `android-apk/`, or fetched from the app repo if that folder is empty), boots the emulator if none is already running (safe to run repeatedly — it no-ops if you already have one booted, which saves the ~30s boot time on repeat runs during a coding session), waits for it, installs the app, then runs the suite.
- **`npm run test:ci`** — no emulator boot step, because in CI the `reactivecircus/android-emulator-runner` action owns booting the emulator *before* this script runs (see #6). Everything else is identical.

**Why `test:local` never explicitly calls `pretest:local`, and it still runs.** npm automatically runs a `pre<name>` script before any `npm run <name>`, for *any* script name — not just the well-known lifecycle ones like `test` or `install`. Because a script literally named `pretest:local` exists, `npm run test:local` triggers it automatically before `test:local`'s own body runs — so that body is just the `wdio run` call; the setup sequence doesn't need to be referenced there at all.

Setup and run are kept as two separate named scripts, rather than one script that inlines both, so `pretest:local` stays independently runnable on its own (`npm run pretest:local`) — useful when you just want the emulator booted and the app installed without also kicking off the full suite, e.g. while debugging an Appium connection issue directly. The naming also documents the two-phase shape (setup, then run) without needing a comment to explain it.

---

## 5. `wdio.conf.ts` — environment-agnostic

```ts
export const config: WebdriverIO.Config = {
  runner: 'local',
  port: 4723,
  specs: ['./tests/**/*.spec.ts'],
  maxInstances: 1,
  capabilities: [{
    platformName: 'Android',
    'appium:automationName': 'UiAutomator2',
    // No hardcoded deviceName/udid: exactly one emulator is guaranteed booted
    // by this point in both local and CI flows, so UiAutomator2 attaches to
    // whichever device ADB reports. This is what makes the same file work
    // unmodified in both places.
    'appium:app': deviceFarmAppPath ?? localApkPath(), // localApkPath() shells out to scripts/resolve-apk.sh
    'appium:disableIdLocatorAutocompletion': true,
    'appium:noReset': false,
    'appium:autoGrantPermissions': true,
    // Every spec's beforeEach already launches the app itself via
    // appState.ts's relaunchWith(), with the intent extras that test needs.
    // Without this, Appium's own post-install auto-launch (a side effect of
    // noReset: false) would launch the app a second time per spec file —
    // immediately thrown away by the first beforeEach's force-stop+relaunch.
    'appium:autoLaunch': false
  }],
  services: deviceFarmAppPath ? [] : [['appium', { command: 'appium' }]],
  framework: 'mocha',
  mochaOpts: { timeout: 60000 },
  reporters: [
    'spec',
    ['mochawesome', { outputDir: './reports/mochawesome' }],
    ['allure', { outputDir: './reports/allure-report' }],
  ],
};
```

There's no `appium:deviceName`/`udid` in capabilities — exactly one device is guaranteed present by the time this config runs, in every environment (local, emulator CI, or an AWS Device Farm host), so UiAutomator2 just attaches to whichever device ADB reports. That's what makes this same file run unmodified everywhere: screen objects, helpers, and specs never need to know which environment they're in.

---

## 6. GitHub Actions — `.github/workflows/e2e.yml`

The workflow triggers on `workflow_dispatch` only (no `push`/`pull_request`) — running this suite costs real emulator-boot time and, for one of the two targets, real AWS device-farm minutes, so it's a deliberate, manual action rather than something that fires on every commit. The dispatch takes one input, `target`, a choice between `ubuntu-emulator` and `aws-device-farm`. Three jobs exist: `emulator-e2e` and `device-farm-e2e` are each gated by `if: github.event.inputs.target == '...'`, so exactly one of them runs per dispatch — same suite, same spec files, unmodified, against two different places to execute it. `lint` has no such gate and runs on every dispatch regardless of `target` — it needs no emulator or device, just `npm run lint` (type-check, ESLint, Prettier), so there's no reason to skip it either way.

### `emulator-e2e` — GitHub-hosted Ubuntu runner + a local Android emulator

```yaml
emulator-e2e:
  if: github.event.inputs.target == 'ubuntu-emulator'
  runs-on: ubuntu-latest
  env:
    AVD_API_LEVEL: 35
    AVD_TARGET: google_apis
    AVD_ARCH: x86_64
    AVD_PROFILE: pixel_6
  steps:
    - uses: actions/checkout@v7

    - name: Enable KVM group perms
      run: |
        echo 'KERNEL=="kvm", GROUP="kvm", MODE="0666", OPTIONS+="static_node=kvm"' | sudo tee /etc/udev/rules.d/99-kvm4all.rules
        sudo udevadm control --reload-rules
        sudo udevadm trigger --name-match=kvm
        test -r /dev/kvm && test -w /dev/kvm

    - uses: actions/setup-node@v7
      with:
        node-version: '20'
        cache: 'npm'

    - uses: actions/setup-java@v6
      with:
        distribution: 'temurin'
        java-version: '21'

    - run: npm ci

    - name: Ensure UiAutomator2 driver
      run: |
        if npx appium driver list --installed --json |
          node -e "..."; then
          echo "UiAutomator2 is already installed."
        else
          npx appium driver install uiautomator2
        fi

    - name: Boot emulator and run suite
      uses: reactivecircus/android-emulator-runner@v2
      with:
        api-level: ${{ env.AVD_API_LEVEL }}
        target: ${{ env.AVD_TARGET }}
        arch: ${{ env.AVD_ARCH }}
        profile: ${{ env.AVD_PROFILE }}
        avd-name: video-qa-api-${{ env.AVD_API_LEVEL }}
        force-avd-creation: true
        emulator-options: -no-snapshot -no-window -gpu swiftshader_indirect -noaudio -no-boot-anim -camera-back none
        disable-animations: true
        script: npm run test:ci

    - uses: actions/upload-artifact@v7
      if: always()
      with: { name: mochawesome-report, path: reports/mochawesome/ }

    - uses: actions/upload-artifact@v4
      if: always()
      with: { name: allure-report, path: reports/allure-report/ }
```

GitHub-hosted Linux runners expose `/dev/kvm` but don't grant the actions user access to it by default, so the "Enable KVM group perms" step is required — without it the emulator silently falls back to unaccelerated software virtualization, which is slow enough that `adb` can see the device but it never fully comes online (`adb: device offline` in a loop until timeout).

The workflow does not start Appium itself — `wdio.conf.ts`'s `services: [['appium', ...]]` owns that lifecycle (start before the suite, stop after). A separate manually-started Appium process in the CI script would just compete for the same port and sit unused once the WDIO-managed instance takes over, so there is deliberately only one place that starts it.

The same run feeds both Mochawesome and Allure. Their self-contained HTML outputs are uploaded separately so reviewers can compare the compact Mochawesome view with Allure's richer navigation and dashboard.

### `device-farm-e2e` — the same suite against a real device on AWS Device Farm

Firebase Test Lab was the first thing considered for a real-device pass, and it doesn't fit: it only runs Espresso/UI Automator instrumentation test APKs, Robo (unscripted crawling), or Game Loop tests — none of which let an external client hold a live Appium/WebDriver session against a device the way this suite is built. AWS Device Farm's `APPIUM_NODE` test type does exactly that: you give it your app, a zipped Node.js test package, and a `testspec.yml`, and it runs your own `npm test`-equivalent command against a real Appium session on a real or virtual device it provisions.

```yaml
device-farm-e2e:
  if: github.event.inputs.target == 'aws-device-farm'
  runs-on: ubuntu-latest
  permissions:
    id-token: write
    contents: read
  steps:
    - uses: actions/checkout@v7
    - uses: actions/setup-node@v7
      with: { node-version: '20', cache: 'npm' }
    - run: npm ci
    - id: apk
      run: echo "path=$(bash scripts/resolve-apk.sh)" >> "$GITHUB_OUTPUT"
    - run: npm run package:devicefarm

    - uses: aws-actions/configure-aws-credentials@v6
      with:
        role-to-assume: ${{ secrets.AWS_DEVICE_FARM_ROLE_ARN }}
        aws-region: us-west-2

    - uses: aws-actions/aws-devicefarm-mobile-device-testing@v3
      id: run-test
      with:
        run-settings-json: |
          {
            "name": "video-qa-e2e-${{ github.run_id }}",
            "projectArn": "${{ secrets.AWS_DEVICE_FARM_PROJECT_ARN }}",
            "appArn": "${{ steps.apk.outputs.path }}",
            "devicePoolArn": "${{ secrets.AWS_DEVICE_FARM_DEVICE_POOL_ARN }}",
            "test": {
              "type": "APPIUM_NODE",
              "testPackageArn": "devicefarm/build/tests_zip_file.zip",
              "testSpecArn": "devicefarm/testspec.yml"
            }
          }
        artifact-types: VIDEO,SCREENSHOT,CUSTOMER_ARTIFACT

    - uses: actions/upload-artifact@v7
      if: always()
      with: { name: device-farm-results, path: ${{ steps.run-test.outputs.artifact-folder }} }
```

What's different about this path, and why:

- **`appium:app` and the Appium server itself are environment-detected in `wdio.conf.ts`.** Device Farm uploads and installs the app itself (from the `appArn` this job passes in), while `devicefarm/testspec.yml` starts the Appium server on the execution host in `pre_test` — so `wdio.conf.ts` checks for `DEVICEFARM_APP_PATH` (an env var Device Farm sets) and, when present, points `appium:app` at that path instead of the local APK, and **omits** `services: [['appium', ...]]` entirely. Starting a second Appium server there would just fight the test spec's server over the same port — the exact class of bug already worked out for the emulator job.
- **`npm run test:devicefarm`** (`wdio run wdio.conf.ts`, no fetch/install steps) is what actually runs *inside* Device Farm's execution host, driven by `devicefarm/testspec.yml`'s `test:` phase — Device Farm handles app provisioning outside of that, so the test package itself doesn't need to.
- **The test package follows AWS's Appium Node archive contract** (`npm run package:devicefarm` → `scripts/build-devicefarm-package.sh`): a zip containing an `npm pack` tarball, with `package-lock.json` injected back into the tarball so `npm ci` works on Device Farm's host. Source and config are included, but `node_modules` is deliberately excluded — `devicefarm/testspec.yml`'s `install:` phase unpacks the tarball and runs `npm ci` fresh on Device Farm's own Linux host, avoiding cross-platform native-binary mismatches and keeping the upload small.
- **Reports come back two ways.** `devicefarm/testspec.yml`'s `post_test` phase copies this run's `reports/mochawesome/`/`reports/allure-report/` into `$DEVICEFARM_LOG_DIR`, which Device Farm bundles as `CUSTOMER_ARTIFACT` output alongside its own device video/screenshots/logs; the `artifact-types` input on the action downloads all of it back to the runner, which then gets uploaded the same way as the emulator job's reports.

**One-time setup this job depends on, none of which can be created from the workflow itself:** an IAM OIDC identity provider for GitHub Actions in the target AWS account (if one doesn't already exist) and an IAM role trusted by it, scoped to `devicefarm:*` on the relevant project; an AWS Device Farm project and at least one device pool; and three repo secrets — `AWS_DEVICE_FARM_ROLE_ARN`, `AWS_DEVICE_FARM_PROJECT_ARN`, `AWS_DEVICE_FARM_DEVICE_POOL_ARN` — pointing at them. Until these exist, selecting `aws-device-farm` on dispatch will fail at the `configure-aws-credentials` step with a clear "could not assume role" error rather than doing anything silently wrong.

---

## 7. Locator strategy, state machine, and test isolation

**Locators resolve to Compose test tags, not native Android ids.** The app is built with Jetpack Compose and turns on `testTagsAsResourceId`, which exposes every `Modifier.testTag("...")` value to UiAutomator as if it were the element's `resource-id` — but *without* the usual `com.videoqa.challenge:id/` package prefix a native view's id would carry. Appium's UiAutomator2 driver auto-prefixes bare `id=` locators by default, so `appium:disableIdLocatorAutocompletion: true` is required in `wdio.conf.ts`'s capabilities; without it, every `$('id=...')` locator in every screen object would silently fail to find anything.

**Content cards are identified by id, never by position or visible text.** The overview screen renders six structurally identical cards. `overview.screen.ts` interacts with one via `content_item_<contentId>` (e.g. `content_item_amsterdam`) — a stable id baked into the app, immune to reordering or text changes. Where a spec needs to *confirm* it landed on the right one (e.g. after opening a card), it checks the destination's `content-desc`/accessibility id against the expected content id, not the on-screen title text.

**The player's first observable state is always `Buffering`, never `Idle`.** `PlayerState` (`src/types/playerState.ts`) includes `Idle` because it exists in the app's state machine, but the app never renders it — the moment the player mounts, the first state a test can actually observe is `Buffering`. `player.screen.ts`'s `waitForState()` enforces this at the type level: its parameter type is `Exclude<PlayerState, 'Idle'>`, so passing `'Idle'` is a compile error, not just a documented convention.

**`video_play_button` is reused across two screens, but Compose only ever composes one of them.** The detail page's preview button and the player's own play/resume button both carry the tag `video_play_button`. `DetailScreen.kt` renders the preview or the player with `if (playerStarted) { PlayerSection(...) } else { Box { ...video_play_button... } }` — an `if/else`, not a show/hide — so only one branch is ever in the composed tree at a time, and the same is true of the player's own play/pause toggle. That's confirmed against the app's Kotlin source, which is why `player.screen.ts`'s `playButton` getter can be a plain `$('id=video_play_button')` rather than a scoped or XPath-qualified lookup.

**Test isolation is launch-time, not UI-driven.** `src/helpers/appState.ts`'s `relaunchWith()` runs before every spec (from each file's `beforeEach`, never from inside a screen object): it force-stops the app (`adb shell am force-stop`), then relaunches it (`adb shell am start -S -W`) with intent extras built by `src/helpers/launchArgs.ts`. The `-W` flag blocks until Android reports the activity as fully idle rather than returning as soon as the start request is accepted — without it, `relaunchWith()` can resolve before anything has rendered, racing the first `waitForDisplayed()` call, which showed up as real flake on the CI emulator's slower rendering. `launchArgs.ts` is the single place that builds `--ez`/`--es`/`--ei` extras strings (`resetAllState`, `resetConsent`, `contentMode`, `videoMode`, `contentDelayMs`, `videoBufferingMs`) — every mode the app's debug-options screen offers has this launch-extra equivalent (see `TEST_PLAN.md` #3.1), so tests never need to tap through the debug UI to reach a given state, and can't leak state between specs the way UI-driven setup could.

---

## 8. What's out of scope

The full list of P2 scenarios, will not be automated in this.