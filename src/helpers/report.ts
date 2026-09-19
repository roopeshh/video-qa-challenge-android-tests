import { execFile } from 'node:child_process';
import { mkdir, readdir, readFile, writeFile } from 'node:fs/promises';
import { createRequire } from 'node:module';
import path from 'node:path';
import { promisify } from 'node:util';

type MergeResults = (
  dir: string,
  filePattern: string | RegExp,
  customFileName?: string,
) => void;

interface MochawesomeSuite {
  uuid: string;
  [key: string]: unknown;
}

interface MochawesomeMergedResult {
  results: [{ suites: MochawesomeSuite[]; [key: string]: unknown }];
  [key: string]: unknown;
}

const execFileAsync = promisify(execFile);
const moduleRequire = createRequire(__filename);
const mergeResults = moduleRequire(
  'wdio-mochawesome-reporter/mergeResults',
) as MergeResults;
const margeCliPath = moduleRequire.resolve(
  'mochawesome-report-generator/bin/cli.js',
);

export const reportDirectory = path.resolve('reports', 'mochawesome');
const mergedResultFilename = 'results.json';
const workerResultPattern = /^wdio-.*-mochawesome-reporter\.log$/;

/**
 * `wdio-mochawesome-reporter`'s onSuiteEnd always pushes whatever suite was
 * most recently started, regardless of which suite actually just ended
 * (see its src/index.js). For a spec file with nested `describe` blocks,
 * the outer describe's own suite-end fires after its last inner describe
 * already pushed itself, so that last inner suite gets recorded twice.
 * Flat (non-nested) spec files never trigger it. This is a bug in the
 * reporter itself (still present in the latest published version, 7.0.0),
 * not in the merge — so it's corrected here rather than upstream.
 */
function dropDuplicateSuites(merged: MochawesomeMergedResult): void {
  const seenUuids = new Set<string>();
  merged.results[0].suites = merged.results[0].suites.filter((suite) => {
    if (seenUuids.has(suite.uuid)) {
      return false;
    }
    seenUuids.add(suite.uuid);
    return true;
  });
}

/**
 * Merges every worker's Mochawesome JSON output into one file and renders
 * the final HTML report. `wdio-mochawesome-reporter` writes one result file
 * per spec file but never merges or renders them itself, so this is the one
 * place that does — reusing the reporter's own merge utility rather than
 * re-implementing it.
 */
export async function generateHtmlReport(): Promise<void> {
  await mkdir(reportDirectory, { recursive: true });
  const files = await readdir(reportDirectory);
  if (!files.some((name) => workerResultPattern.test(name))) {
    throw new Error('No Mochawesome worker results were produced by this run');
  }

  mergeResults(reportDirectory, workerResultPattern, mergedResultFilename);

  const mergedResultPath = path.join(reportDirectory, mergedResultFilename);
  const merged = JSON.parse(
    await readFile(mergedResultPath, 'utf8'),
  ) as MochawesomeMergedResult;
  dropDuplicateSuites(merged);
  await writeFile(mergedResultPath, JSON.stringify(merged), 'utf8');

  await execFileAsync(process.execPath, [
    margeCliPath,
    mergedResultPath,
    '--reportDir',
    reportDirectory,
    '--reportFilename',
    'index',
    '--reportTitle',
    'Video QA Challenge E2E Report',
    '--reportPageTitle',
    'Video QA Challenge E2E Report',
    '--inline',
    '--charts',
    '--no-code',
  ]);
}
