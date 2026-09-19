# Local Setup — macOS

Goal: get this machine ready to run the existing test suite locally — JDK, Node, Android SDK, and an emulator in place — then hand off to [README.md](README.md#quick-start) to actually run it and see the reports. Nothing below involves writing or changing any test code.

---

## 1. Prerequisites

```bash
# JDK 21 — required by Appium's own UiAutomator2 driver, not by this app: the
# app under test is a prebuilt APK this pipeline never compiles. The driver
# needs Java both to install itself (`appium driver install uiautomator2`)
# and at every test session, to prepare and deploy its own server + settings
# APKs to the device.
brew install openjdk@21
echo 'export JAVA_HOME=$(/usr/libexec/java_home -v21)' >> ~/.zshrc

# Node LTS (WDIO needs Node 18+)
brew install nvm
mkdir ~/.nvm
echo 'export NVM_DIR="$HOME/.nvm"' >> ~/.zshrc
echo '[ -s "/opt/homebrew/opt/nvm/nvm.sh" ] && . "/opt/homebrew/opt/nvm/nvm.sh"' >> ~/.zshrc
source ~/.zshrc
nvm install --lts
```

## 2. Android SDK (no full Android Studio required, but it's the easiest path)

Easiest: install Android Studio once, use its SDK Manager to tick:
- **SDK Platform 35**
- **Android SDK Build-Tools**
- **Android Emulator**
- **Android SDK Platform-Tools**
- **System image**: Google APIs, x86_64 (or arm64 if Apple Silicon), API 35

Then set env vars:

```bash
echo 'export ANDROID_HOME="$HOME/Library/Android/sdk"' >> ~/.zshrc
echo 'export PATH="$PATH:$ANDROID_HOME/platform-tools:$ANDROID_HOME/emulator:$ANDROID_HOME/cmdline-tools/latest/bin"' >> ~/.zshrc
source ~/.zshrc
```

Accept licenses (required):

```bash
sdkmanager --licenses
```

## 3. Create the required local emulator

```bash
sdkmanager "system-images;android-35;google_apis;arm64-v8a"   # arm64 on Apple Silicon
avdmanager create avd -n Pixel_9_Pro_XL -k "system-images;android-35;google_apis;arm64-v8a" -d pixel_9_pro_xl

# boot it once to confirm it works
emulator -avd Pixel_9_Pro_XL
```
Confirm it reaches the Android home screen, then close it — `npm run test:local` boots it again itself and reuses it if it's already running, so there's nothing further to do with it by hand.

## 4. Run the suite

The environment is ready. Installing dependencies, fetching and installing the app, running all 14 automated scenarios, and generating both reports is the single command from [README.md's Quick Start](README.md#quick-start):

```bash
npm ci
npx appium driver install uiautomator2
npm run test:local
```

When it finishes, open `reports/mochawesome/index.html` or `reports/allure-report/index.html` to see the results.

---

## Checklist

- [ ] `emulator -avd Pixel_9_Pro_XL` boots to the Android home screen
- [ ] `JAVA_HOME` and `ANDROID_HOME` are set and exported
- [ ] `npm run test:local` completes and both reports open
