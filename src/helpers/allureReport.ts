import { execFile } from 'node:child_process';
import { createRequire } from 'node:module';
import path from 'node:path';
import { promisify } from 'node:util';

const execFileAsync = promisify(execFile);
const moduleRequire = createRequire(__filename);
const allureCliPath = moduleRequire.resolve('allure-commandline/bin/allure');

export const allureResultsDirectory = path.resolve('allure-results');
export const allureReportDirectory = path.resolve('reports', 'allure-report');

export async function generateAllureReport(): Promise<void> {
  await execFileAsync(allureCliPath, [
    'generate',
    allureResultsDirectory,
    '--clean',
    '--single-file',
    '--report-name',
    'Video QA Challenge E2E Report',
    '--output',
    allureReportDirectory,
  ]);
}
