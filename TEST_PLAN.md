# Test Plan — Video QA Challenge (Android)

## 1. Scope

This document covers every scenario identified for the app, across three priority tiers — P0, P1, and P2 — so the full picture of app behavior and coverage decisions is in one place (22 scenarios total). **Automation scope for this pass is P0 + P1 only** (14 scenarios, using Appium 2 + WebdriverIO + TypeScript against a local emulator and CI).

- **P0** — the stated minimum scope. Must pass before anything else matters.
- **P1** — risk-based scenarios worth automating now: documented negative/edge paths.
- **P2** — real, documented behavior that's valuable to test eventually, but deliberately deferred this pass. 


## 2. Approach

Black-box UI automation via UiAutomator2, driven by documented resource-ids (Compose test tags exposed via `testTagsAsResourceId`) and intent-extra launch configuration for deterministic state setup — never by driving the debug-options UI mid-test, and never by list position. Every wait is condition-based (`waitForDisplayed` / `waitUntil` against `video_state_label` or `content_loading_indicator`), no fixed sleeps. Full reasoning for the tool choice is in `architecture.md`.

The in-app debug options screen (gear icon on the overview) exists for manual/exploratory use. Every mode and reset it offers has an equivalent launch-time intent extra (§3.1), and automated setup always goes through that extra instead — faster, and it can't leak state between tests the way tapping through a UI can. The debug screen's own buttons are only driven directly where §6 says so explicitly (TC19).

## 3. Environment

- Local: Pixel 9 Pro XL, API 35 emulator, per `setup.md`
- App: `bin/VideoQAChallenge-debug.apk` from the app repo, or an APK dropped into `android-apk/` (takes precedence — see `scripts/resolve-apk.sh`); installed fresh per test run; state reset per-spec via `am force-stop` + `am start -S` with intent extras (see `architecture.md` §6)

### 3.1 Debug options reference (exact in-app wording)

Every scenario below names the launch-config value it uses. This table is the legend mapping that value to what you'd actually see if you opened the debug options screen by hand — use it to sanity-check a scenario against the app rather than trusting a paraphrase.

| Group (debug screen section header) | Exact in-app label | Launch-config equivalent | Resource id | Used by |
|---|---|---|---|---|
| Content response | Success | `contentMode=success` | `debug_content_success` | TC02, TC06, TC12, TC13 |
| Content response | Empty | `contentMode=empty` | `debug_content_empty` | TC05 |
| Content response | Server error | `contentMode=error` | `debug_content_error` | TC04 |
| Content response | Slow response | `contentMode=slow` | `debug_content_slow` | TC14 |
| Video response | Normal playback | `videoMode=normal` | `debug_video_normal` | TC03, TC09, TC10 |
| Video response | Long buffering | `videoMode=buffering` | `debug_video_buffering` | TC07 |
| Video response | Playback error | `videoMode=error` | `debug_video_error` | TC08 |
| Video response | Playback completes quickly | `videoMode=completeQuickly` | `debug_video_complete_quickly` | TC11 |
| State controls | Reset consent | no launch-extra equivalent — in-app only | `debug_reset_consent` | TC19 (P2) |
| State controls | Clear playback progress | no launch-extra equivalent — in-app only | `debug_clear_progress` | TC19 (P2) |
| State controls | Restore default settings | no launch-extra equivalent — in-app only | `debug_restore_defaults` | TC19 (P2) |
| State controls | Reset all app state (destructive, shown in red) | `resetAllState=true` at launch does the same thing | `debug_reset_all` | TC01, TC02, TC15, TC16 (test setup) |

`contentDelayMs` and `videoBufferingMs` aren't debug-screen options — they're launch-extra-only knobs that fix a mode's delay to an exact value instead of the default randomized range, which is what keeps CI non-flaky (used in TC06–TC08, TC14).

---

## 4. P0 — Required minimum scope

These three map directly to the stated minimum scope and must pass before anything else matters.

| ID | Scenario | Setup / launch config | Steps | Expected result |
|---|---|---|---|---|
| **TC01** | Handle consent on first launch | Fresh install, so the consent screen has never been seen (`resetAllState=true`) | Launch the app → tap the **Accept all** button on the consent screen (`consent_accept_button`) | The overview screen — the "Video" screen listing all videos — is shown (`content_overview_screen`); relaunching the app afterwards goes straight there, the consent screen doesn't reappear |
| **TC02** | Open a video and land on the correct detail page | Fresh install, content response set to **Success** (`resetAllState=true`, `contentMode=success`) | From the overview, tap the **Amsterdam from above** video card (`content_item_amsterdam`) | The detail page for that video opens (`content_detail_screen`), titled exactly "Amsterdam from above". Since all six cards look visually identical, the test also confirms it's the *correct* card via its hidden card identifier, not the visible title text alone (`detail_title` content-desc = `amsterdam`) |
| **TC03** | Start playback and reach the Playing status | Continuing from TC02, video response set to **Normal playback** (`videoMode=normal`) | Tap the play button on the detail page's video preview (`video_play_button`) | The on-screen status pill shows **Buffering** first — this always happens, even briefly, so never assume it jumps straight to Playing — then changes to **Playing** (`video_state_label`) |

---

## 5. P1 — Risk-based scenarios

Selected because each either (a) exercises a documented negative/edge path explicitly called out in the app READMEs, or (b) guards against a locator/timing trap the READMEs warn about. Ordered roughly by risk value — **except TC14**, which is appended at the end out of numeric order: it was identified in a later review, after TC01–TC13 were already reflected in the test code's own `it()` names. Inserting it earlier and renumbering everything after it would have silently changed what every existing test's id means, so it gets a new id instead of reshuffling the rest.

| ID | Scenario | Setup / launch config | Steps | Expected result |
|---|---|---|---|---|
| **TC04** | Server error content response shows an error state | Content response **Server error**, delay fixed so timing is predictable (`contentMode=error`, `contentDelayMs=500`) | Launch the app, accept consent if this is a fresh install | An error screen is shown, with the message "We could not load the videos" (`content_error_state`, `content_error_message`) |
| **TC05** | Empty content response shows an empty state | Content response **Empty** (`contentMode=empty`, `contentDelayMs=500`) | Launch, accept consent | An empty-state screen is shown with the message "No videos are available", and a working **Retry** button (`content_empty_state`, `content_empty_retry_button`) |
| **TC06** | Fixed content-load delay overrides the default randomized range | Content response **Success**, but with the loading delay fixed instead of left random (`contentMode=success`, `contentDelayMs=1500`, replacing the default random 500–1500ms) | Launch, accept consent | A loading spinner appears, then the video list appears after the fixed delay — the check is on the screen actually changing, not on hitting an exact time (`content_loading_indicator` → `content_list`) |
| **TC07** | Long buffering holds before playback starts | Video response **Long buffering**, with the buffering time fixed (`videoMode=buffering`, `videoBufferingMs=1500`) | Open the Amsterdam detail page, tap play | The status stays on **Buffering** for the fixed duration, then changes to **Playing** — proves the app actually honors the fixed buffering time, which is what keeps this reliable in CI |
| **TC08** | Playback error mode and retry | Video response **Playback error** (`videoMode=error`) | Open the detail page, tap play | A brief **Buffering**, then the status changes to **Error**, with the message "Video could not be played" and a **Retry** button. Tapping retry starts a new attempt (back to **Buffering**) (`video_state_label`, `video_error_message`, `video_retry_button`) |
| **TC09** | Pause and resume mid-playback | Video response **Normal playback** (`videoMode=normal`) | Tap play → wait until the status shows **Playing** → tap pause → tap play again | Status goes **Playing → Paused → Playing**; the video's current position does not jump back to 00:00 when it resumes (`video_current_position`) |
| **TC10** | Pause, leave, reopen resumes from saved position | Video response **Normal playback** | Play a few seconds → pause → go back to the overview (**Back** button on the detail page) → open the same video again | Playback picks up from where it was paused, not from the beginning — a deliberate, documented feature, not an accident |
| **TC11** | Playback completes quickly reaches the Completed status | Video response **Playback completes quickly** (`videoMode=completeQuickly`) | Open the detail page, tap play, wait | The status reaches **Completed** after a few seconds — confirms the player can reach its actual end state, not just Playing |
| **TC12** | Below-the-fold video reachable by scroll, identified correctly | Content response **Success** | On the overview, scroll down until a video further down the list is visible, and tap it | The correct detail page opens for that specific video — guards against a bug where scrolling to the wrong position opens the wrong video's detail page instead |
| **TC13** | Refresh reloads content through the loading state | Content response **Success** | On the overview, tap the refresh button (top-right, circular arrow icon) (`content_refresh_button`) | The loading spinner reappears, then the same six videos reload in the same order |
| **TC14** | Slow response content mode still loads successfully | Content response **Slow response**, delay fixed to keep the test fast — the mode's own default is ~5s (`contentMode=slow`, `contentDelayMs=1500`) | Launch, accept consent | A loading spinner appears for the fixed delay, then the same six videos load as normal. **Slow response is not an error state** — it's a delayed version of Success, easy to mix up with TC04/TC05 if you only skim the scenario name. This closes the one debug option (`debug_content_slow`) that had no test at all before this revision |

**Locator-trap coverage (folded into TC02/TC03 implementation, not separate tests):** the play button is the same underlying element on both the detail page's preview and the active player (`video_play_button` is reused) — screen objects must scope queries to which screen they're on rather than searching the whole app for "the play button." Documented here so it isn't rediscovered as a bug during automation.

**Why TC04 doesn't test the retry button's effect:** the content response mode is fixed for the whole app session once launched — tapping **Retry** on the error screen only re-runs the same request under the same **Server error** setting, so it's guaranteed to fail again by construction. Asserting "retry still shows the error" wouldn't exercise any real behavior worth regression-testing. Verifying actual recovery (retry succeeding) would require switching the debug mode mid-session, which is out of scope (§2, §7).

---

## 6. P2 — Identified, not automated in this pass

Fully specified for completeness and future extension. Not built now because each is lower risk.

| ID | Scenario | Setup / launch config | Steps | Expected result |
|---|---|---|---|---|
| **TC15** | Reject-optional consent path | Fresh install (`resetAllState=true`) | Launch the app → tap **Reject optional** on the consent screen (`consent_reject_button`) | The same overview screen is shown as the Accept-all path |
| **TC16** | Manage preferences → toggle and save | Fresh install (`resetAllState=true`) | From the consent screen, tap **Manage preferences** (`consent_manage_preferences_button`) → toggle the analytics and personalization switches → tap **Save** (`preferences_save_button`) | Returns to the overview screen; the toggle choices are remembered the next time the app is opened, without needing a reset |
| **TC17** | Playback completion clears the saved position | Video response **Playback completes quickly** (`videoMode=completeQuickly`) | Let playback finish (status reaches **Completed**) → leave the detail page → reopen the same video → tap play | Starts again from 00:00, not from any earlier position |
| **TC18** | Last-second saved position is discarded | Video response **Normal playback** (`videoMode=normal`) | Pause with less than about 1 second of video left → leave → reopen → tap play | Restarts from 00:00, ignoring the almost-finished saved position — an explicit, documented edge case |
| **TC19** | Individual debug state controls | Varies per control — driven from the debug options screen itself, not launch extras | From the debug options screen, tap **Reset consent** / **Clear playback progress** / **Restore default settings** / **Reset all app state**, one at a time | Each one clears exactly what it says: consent only / playback progress only / content & video response restored to Success + Normal playback / everything wiped |
| **TC20** | Debug video-mode change only affects the next video opened, not the one already playing | Video response **Normal playback** to start | Open a video, tap play, reach **Playing** → *without* leaving the player, switch the debug video response to **Playback error** → check what the current player does → then leave and open a fresh video | The player already playing keeps working normally, unaffected by the switch; only the newly opened video picks up **Playback error** — matches a documented but easy-to-miss detail in how the app captures its mode |
| **TC21** | Saved progress survives even though returning after a restart lands back on the overview | Video response **Normal playback**, play partway then pause | Pause mid-playback → force-kill the app process (not the normal close, `adb shell am kill com.videoqa.challenge`) → reopen the app | The app comes back to the overview screen, as expected after a restart, but reopening the same video still resumes from the saved position — proving only navigation resets, not the saved progress |
| **TC22** | Rapid double-tap on play doesn't start two overlapping playback attempts | Video response **Normal playback** | On the detail page, tap the play button twice in quick succession, almost at the same time | *Open question, not a firm expected result yet:* the app doesn't document what a double-tap should do — ignore the second tap, restart buffering, or something else — so this needs an answer from the app owner before a real pass/fail check can be written |

---

## 7. Traceability

| Scenario IDs | Spec file |
|---|---|
| TC01 | `tests/smoke/consent.spec.ts` |
| TC02, TC12, TC13 | `tests/smoke/content-navigation.spec.ts` |
| TC03, TC09, TC10, TC11 | `tests/smoke/playback.spec.ts` |
| TC04, TC05, TC06, TC14 | `tests/regression/negative-states.spec.ts` |
| TC07, TC08 | `tests/regression/player-edge-cases.spec.ts` |
| TC15–TC22 (P2) | Not automated this pass — no spec file.|
