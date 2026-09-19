import { execFile } from 'node:child_process';
import { promisify } from 'node:util';

import { buildLaunchArgs, type LaunchArgs } from './launchArgs';

const execFileAsync = promisify(execFile);
const appPackage = 'com.videoqa.challenge';
const mainActivity = `${appPackage}/.MainActivity`;

export async function relaunchWith(args: LaunchArgs = {}): Promise<void> {
  await execFileAsync('adb', ['shell', 'am', 'force-stop', appPackage]);

  // -W blocks until Android reports the activity as idle (fully launched)
  // instead of returning as soon as the start request is accepted. Without
  // it, relaunchWith() can resolve before anything has rendered, racing the
  // caller's first waitForDisplayed() — invisible on a fast machine, but a
  // real gap on the CI emulator's software rendering (findElement round
  // trips observed taking ~2s there), where it shows up as flaky
  // "no such element" failures that get more frequent as the run goes on.
  await execFileAsync('adb', [
    'shell',
    'am',
    'start',
    '-S',
    '-W',
    '-n',
    mainActivity,
    ...buildLaunchArgs(args),
  ]);
}

export async function getRecentAppLogs(): Promise<string> {
  const { stdout } = await execFileAsync('adb', [
    'logcat',
    '-t',
    '200',
    '-s',
    'VQC.app:V',
    'VQC.consent:V',
    'VQC.content:V',
    'VQC.player:V',
    'VQC.debug:V',
    '*:S',
  ]);

  return stdout.trim() || 'No Video QA Challenge logs were available.';
}
