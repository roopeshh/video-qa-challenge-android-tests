# AGENTS.md

This project's full development context, conventions, and constraints live in **`CLAUDE.md`** at the project root. Read `CLAUDE.md` in full before starting any task in this repository — this file exists only so agents that look for `AGENTS.md` by default (not `CLAUDE.md`) still get the same context, without maintaining two copies that can drift apart.

## Quick-reference summary (CLAUDE.md is authoritative — this is a fallback in case it isn't read)

- **Stack:** Appium 2 + WebdriverIO + TypeScript, UiAutomator2 driver, Mocha, mochawesome
- **Layering rule (non-negotiable):** `spec file → screen object → WebdriverIO → Appium → device`. Assertions only in specs, never in screen objects. Raw locators only in screen objects, never in specs.
- **State setup:** only `src/helpers/appState.ts` talks to `adb` directly, called from `beforeEach` — never from a screen object.
- **Waiting:** no `browser.pause()` / fixed sleeps, ever. Condition-based waits only (`waitForDisplayed`, `waitUntil` with a `timeoutMsg`).
- **Locator gotchas:** resource-ids have no package prefix (`disableIdLocatorAutocompletion: true`); identify content cards by `content-desc`/id, never list position or visible text; `video_play_button` is reused between detail preview and player — scope queries to the containing screen; never assert on the `Idle` player state, it's never rendered.
- **Automation scope:** P0 + P1 only (14 scenarios, see `TEST_PLAN.md`). P2 scenarios are documented but not built.
- **Commands:** `npm run test:local`, `npm run test:ci`, `npm run lint` — extend these, don't add parallel scripts.
- **Docs to consult:** `architecture.md` (design + CI), `TEST_PLAN.md` (all scenarios + priority), `setup.md` (local prerequisites).

Full detail, reasoning, and TSDoc/naming conventions are in `CLAUDE.md` — read it before generating or editing code here.
