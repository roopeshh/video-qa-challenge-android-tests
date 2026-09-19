import { execSync } from 'node:child_process';
import type { EventEmitter } from 'node:events';
import { rm } from 'node:fs/promises';

import {
  allureReportDirectory,
  allureResultsDirectory,
  generateAllureReport,
} from './src/helpers/allureReport';
import { getRecentAppLogs } from './src/helpers/appState';
import { generateHtmlReport, reportDirectory } from './src/helpers/report';

function addReportContext(title: string, value: string): void {
  (process as EventEmitter).emit('wdio-mochawesome-reporter:addContext', {
    title,
    value,
  });
}

function errorMessage(error: unknown): string {
  return error instanceof Error ? error.message : String(error);
}

async function addAllureTextAttachment(
  title: string,
  value: string,
): Promise<void> {
  const { default: allureReporter } = await import('@wdio/allure-reporter');
  await allureReporter.addAttachment(title, value, 'text/plain');
}

// AWS Device Farm sets this to the path of the app it already uploaded onto
// the test host. The Appium server there is started by devicefarm/testspec.yml
// with its own device-specific default capabilities, so under Device Farm this
// config must point `appium:app` at that path instead of the local APK, and
// must NOT also launch our own Appium server (that's what
// `services: [['appium', ...]]` does locally/in the emulator CI job), or the
// two servers fight over the same port.
const deviceFarmAppPath = process.env.DEVICEFARM_APP_PATH;

// scripts/resolve-apk.sh is the single source of truth for which APK to
// test: an APK dropped into android-apk/ wins, otherwise it ensures the
// app repo is cloned and returns its prebuilt binary. Called lazily so
// Device Farm runs (which set DEVICEFARM_APP_PATH) never invoke it.
function localApkPath(): string {
  try {
    return execSync('bash scripts/resolve-apk.sh', {
      encoding: 'utf8',
    }).trim();
  } catch (error) {
    throw new Error(
      `Failed to resolve the APK under test (scripts/resolve-apk.sh): ${errorMessage(error)}`,
    );
  }
}

export const config: WebdriverIO.Config = {
  runner: 'local',
  port: 4723,
  specs: ['./tests/**/*.spec.ts'],
  maxInstances: 1,
  capabilities: [
    {
      platformName: 'Android',
      'appium:automationName': 'UiAutomator2',
      // No hardcoded deviceName/udid: exactly one device is guaranteed
      // present by this point in every environment (local, emulator CI, or
      // an AWS Device Farm host), so UiAutomator2 attaches to whichever
      // device ADB reports. This is what makes the same file work
      // unmodified across all of them.
      'appium:app': deviceFarmAppPath ?? localApkPath(),
      'appium:disableIdLocatorAutocompletion': true,
      'appium:noReset': false,
      'appium:autoGrantPermissions': true,
      // Every spec's beforeEach already launches the app itself via
      // appState.ts's relaunchWith(), with the intent extras that test
      // needs — Appium's own post-install auto-launch would just be an
      // extra cold start that gets immediately force-stopped and replaced.
      'appium:autoLaunch': false,
    } as WebdriverIO.Capabilities,
  ],
  services: deviceFarmAppPath ? [] : [['appium', { command: 'appium' }]],
  framework: 'mocha',
  // Default is 3000ms, which is tight for a CI emulator: a single findElement
  // round-trip alone has been observed taking ~600ms there (vs low double
  // digits ms locally), and every spec's beforeEach relaunches the app fresh
  // right before its first wait. Raised well above what's needed locally so
  // CI isn't racing the app's first render against the wait window.
  waitforTimeout: 30000,
  mochaOpts: { timeout: 60000 },
  reporters: [
    'spec',
    ['mochawesome', { outputDir: './reports/mochawesome' }],
    [
      'allure',
      {
        outputDir: allureResultsDirectory,
        disableWebdriverStepsReporting: true,
        disableWebdriverScreenshotsReporting: false,
      },
    ],
  ],
  onPrepare: async () => {
    // Clears leftover results from a previous run so the merge step in
    // generateHtmlReport() only ever sees this run's worker output.
    await Promise.all([
      rm(reportDirectory, { recursive: true, force: true }),
      rm(allureResultsDirectory, { recursive: true, force: true }),
      rm(allureReportDirectory, { recursive: true, force: true }),
    ]);
  },
  afterTest: async (_test, _context, { passed }) => {
    if (passed) {
      return;
    }

    try {
      await browser.takeScreenshot();
    } catch (error) {
      const message = errorMessage(error);
      addReportContext('Screenshot capture error', message);
      await addAllureTextAttachment('Screenshot capture error', message);
    }

    try {
      const logs = await getRecentAppLogs();
      addReportContext('Recent application logs', logs);
      await addAllureTextAttachment('Recent application logs', logs);
    } catch (error) {
      const message = errorMessage(error);
      addReportContext('Application log capture error', message);
      await addAllureTextAttachment('Application log capture error', message);
    }
  },
  onComplete: async () => {
    await Promise.all([generateHtmlReport(), generateAllureReport()]);
  },
};
