# CLAUDE.md

Context for Claude Code working in this repository. Read this before generating or editing anything here.

## What this is

Automated UI test suite for **Video QA Challenge** (Android), a deterministic demo media app (`com.videoqa.challenge`) — consent screen, video overview, detail pages, and a player with an explicit, inspectable state machine. Code quality, readability, and the reasoning behind each decision matter as much as passing tests.

Stack: **Appium 2 + WebdriverIO + TypeScript**, UiAutomator2 driver, Mocha, mochawesome reporter.

Full design docs (read these, don't re-derive their decisions):
- `architecture.md` — folder structure, tool choices and why, `wdio.conf.ts` design, CI design
- `TEST_PLAN.md` — all 14 automated scenarios (3 P0, 11 P1), priority, and exact expected results
- `setup.md` — local environment prerequisites

## The one rule that governs all code in this repo

```
spec file  →  screen object  →  WebdriverIO  →  Appium  →  device
```

- **Screen objects** (`src/screens/*.screen.ts`) expose only locators and intention-revealing actions (`openVideo(id)`, `waitForState(x)`). **Never put an assertion inside a screen object.**
- **Specs** (`tests/**/*.spec.ts`) call screen object methods and hold all assertions. **Never put a raw `$('id=...')` locator directly inside a spec** — if a spec needs a new element, add it to the relevant screen object first.
- **`src/helpers/appState.ts`** is the one exception: it talks to `adb` directly for state setup (force-stop + relaunch with intent extras) and is called from `beforeEach`, never from inside a screen object.
- **`src/helpers/launchArgs.ts`** is the only place that builds `--ez`/`--es`/`--ei` intent-extra strings — don't inline extras-string construction anywhere else.

If you're generating a new file and unsure which layer something belongs in, default to the narrowest one: locators/actions → screen object; expectations → spec; adb/state → helpers.

## Locator rules (non-negotiable, sourced from the app's own README)

- All resource-ids have **no package prefix** — `wdio.conf.ts` sets `appium:disableIdLocatorAutocompletion: true` for this reason. Never re-add autocompletion or work around it with `android=new UiSelector()` unless a specific id genuinely requires it.
- **Never identify a content card by list position or by visible text alone.** Six cards share identical structure — use `content_item_<contentId>` for interaction and verify identity via `content-desc` (accessibility id), not the visible title text.
- **`video_play_button` is reused** between the detail-page preview and the active player. Screen object queries for it must be scoped to the containing screen (`content_detail_screen` vs `video_player`), never queried globally.
- The player's first observable state is always `Buffering`. **Never assert on `Idle`** — it exists in the state machine but is never rendered.
- Prefer fixed launch-time delays (`contentDelayMs`, `videoBufferingMs`) over the app's default randomized range whenever a test's timing matters for the assertion — this is what keeps CI non-flaky.

## Waiting — no exceptions

**Never use `browser.pause()` or any fixed `sleep`.** Every wait is one of:
- `element.waitForDisplayed()` / `waitForExist()`
- `browser.waitUntil(() => condition, { timeoutMsg: '...' })` — always include a `timeoutMsg`, it's the first thing you'll want when a wait times out in CI

## Naming and style conventions

- Screen object files: `<screen>.screen.ts`, class `PascalCaseScreen` (e.g. `overview.screen.ts` → `OverviewScreen`)
- Spec files: `<flow>.spec.ts`, grouped under `tests/smoke/` (P0 + closely-related P1s) or `tests/regression/` (negative/edge-case P1s) per the table in `architecture.md` #3
- Methods: camelCase, verb-first, intention-revealing (`openVideo`, `waitForState`, not `clickButton` or `getElement`)
- Every public screen object method gets a one-line TSDoc comment describing *intent*, not restating the code:
  ```ts
  /** Opens a video by content id, scrolling into view first. Never use list position. */
  async openVideo(contentId: string) { ... }
  ```
- Run `npm run lint` (ESLint + Prettier) before considering any file done — don't leave lint fixes for a separate pass
- No `console.log` left in committed code; no commented-out code blocks
- Conventional commit style if you're asked to commit: `feat: ...`, `fix: ...`, `test: ...`, `docs: ...`

## Commands

```bash
npm run test:local     # fetch app, boot emulator if needed, install app, run full suite
npm run test:ci         # same minus emulator boot — used inside the GH Actions runner
npm run lint            # eslint + prettier check
```

Don't invent alternative script names — extend the ones above if new behavior is needed (e.g. a `--spec` flag for a single file), rather than adding a parallel script.

## Scenario source of truth

`TEST_PLAN.md` is authoritative for what each test must verify. If a scenario's expected result here and in `TEST_PLAN.md` ever diverge in your generated code, `TEST_PLAN.md` wins — flag the discrepancy rather than silently picking one.

## Efficiency note

This is being developed against a Windsurf/Claude Code usage budget. Generate one file per request (one screen object, one spec, one config file) rather than multiple files in a single response, so each can be reviewed before the next is built on top of it.