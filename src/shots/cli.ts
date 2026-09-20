/**
 * `npm run shots` entry point.
 *
 * Imperative shell only: it parses, plans, boots, runs, collects and writes.
 * Every judgement it makes was made in `args.ts`, `plan.ts` or `host.ts`,
 * which are the parts that carry unit tests.
 *
 *   npm run shots -- --label board-size-sweep \
 *                    --devices se,15,max \
 *                    --sizes 8x7,9x8,10x9 \
 *                    --level A1-3
 */

import { existsSync, mkdirSync, readdirSync, writeFileSync } from 'fs';
import { resolve } from 'path';
import type { ChildProcess } from 'child_process';

import { parseShotsArgs, ShotsArgError, USAGE } from './args';
import { assertMacHost, HostError, scanLogForFailures } from './host';
import {
  buildManifest,
  writeManifest,
  type ManifestShot,
} from './manifest';
import {
  buildRunPlan,
  maestroCommand,
  overallExitCode,
  summarize,
  toFlowFile,
  type JobResult,
} from './plan';
import {
  appVersion,
  assertToolAvailable,
  bootDevice,
  buildAndInstall,
  findUdid,
  gitSha,
  isAppInstalled,
  readLog,
  runMaestro,
  shutdownDevice,
  startLogCapture,
  stopLogCapture,
} from './simctl';

const REPO_ROOT = resolve(__dirname, '..', '..');

function today(): string {
  return new Date().toISOString().slice(0, 10);
}

/**
 * Expand the `--flows` glob.
 *
 * Deliberately minimal: the glob is always `<dir>/<pattern>`, and the only
 * wildcard the harness needs is `*`. Pulling a glob dependency in for this
 * would be a new package in a game repo for six lines of matching.
 */
function discoverFlows(glob: string): string[] {
  const lastSlash = glob.lastIndexOf('/');
  const dir = lastSlash === -1 ? '.' : glob.slice(0, lastSlash);
  const pattern = lastSlash === -1 ? glob : glob.slice(lastSlash + 1);
  const absoluteDir = resolve(REPO_ROOT, dir);
  if (!existsSync(absoluteDir)) return [];
  const regex = new RegExp(
    `^${pattern.replace(/[.+^${}()|[\]\\]/g, '\\$&').replace(/\*/g, '.*')}$`,
  );
  return readdirSync(absoluteDir)
    .filter(name => regex.test(name))
    .sort()
    .map(name => `${dir}/${name}`);
}

function listPngs(directory: string): Set<string> {
  const absolute = resolve(REPO_ROOT, directory);
  if (!existsSync(absolute)) return new Set();
  return new Set(readdirSync(absolute).filter(name => name.endsWith('.png')));
}

function stepFromFilename(filename: string): string {
  return filename.replace(/\.png$/, '');
}

export function main(argv: readonly string[]): number {
  let args;
  try {
    args = parseShotsArgs(argv, { today: today() });
  } catch (error) {
    if (error instanceof ShotsArgError) {
      console.error(error.message);
      return 2;
    }
    throw error;
  }

  if (args.help) {
    console.log(USAGE);
    return 0;
  }

  const flows = discoverFlows(args.flowsGlob).map(toFlowFile);

  let plan;
  try {
    plan = buildRunPlan(args, flows);
  } catch (error) {
    console.error((error as Error).message);
    return 2;
  }

  if (args.dryRun) {
    console.log(`Run directory: ${plan.runDirectory}`);
    for (const job of plan.jobs) {
      const size = job.boardSize ? `${job.boardSize.columns}x${job.boardSize.rows}` : '-';
      console.log(`  ${job.device.alias.padEnd(4)} ${job.flow.path} [${size}] -> ${job.shotDirectory}`);
    }
    console.log(`${plan.jobs.length} flow run(s) planned. Nothing was booted.`);
    return 0;
  }

  try {
    assertMacHost();
    assertToolAvailable('xcrun', ['simctl', 'help']);
    assertToolAvailable('maestro', ['--version']);
  } catch (error) {
    if (error instanceof HostError) {
      console.error(error.message);
      return 3;
    }
    throw error;
  }

  const startedAt = new Date().toISOString();
  const version = appVersion(REPO_ROOT);
  const sha = gitSha(REPO_ROOT);
  const shots: ManifestShot[] = [];
  const results: JobResult[] = [];
  const bootedUdids = new Set<string>();

  try {
    for (const job of plan.jobs) {
      const udid = findUdid(job.device);
      if (!bootedUdids.has(udid)) {
        bootDevice(udid);
        bootedUdids.add(udid);
        if (!isAppInstalled(udid)) {
          if (!args.buildIfMissing) {
            console.error(
              `The Axiom is not installed on ${job.device.label}. ` +
                'Re-run with --build-if-missing, or install a testflight-profile build first.',
            );
            return 3;
          }
          buildAndInstall(job.device, REPO_ROOT);
        }
      }

      const absoluteShotDir = resolve(REPO_ROOT, job.shotDirectory);
      mkdirSync(absoluteShotDir, { recursive: true });
      const before = listPngs(job.shotDirectory);

      let logProcess: ChildProcess | null = null;
      if (job.logFile) {
        logProcess = startLogCapture(udid, resolve(REPO_ROOT, job.logFile));
      }

      const { command, args: maestroArgs } = maestroCommand(job, udid);
      const env = { ...process.env, ...job.env, SHOT_DIR: absoluteShotDir };
      let exitCode = runMaestro(command, maestroArgs, env, REPO_ROOT);

      if (logProcess) {
        stopLogCapture(logProcess);
        const hits = scanLogForFailures(readLog(resolve(REPO_ROOT, job.logFile!)));
        if (hits.length > 0) {
          console.error(
            `Animation-host safety FAILED on ${job.device.label}: ${hits.length} ` +
              `offending log line(s). First: ${hits[0]}`,
          );
          exitCode = exitCode === 0 ? 1 : exitCode;
        }
      }

      const after = listPngs(job.shotDirectory);
      for (const filename of after) {
        if (before.has(filename)) continue;
        shots.push({
          step: stepFromFilename(filename),
          device: job.device.label,
          deviceAlias: job.device.alias,
          boardSize: job.boardSize
            ? `${job.boardSize.columns}x${job.boardSize.rows}`
            : null,
          levelId: args.levelId,
          appVersion: version,
          gitSha: sha,
          flow: job.flow.path,
          file: `${job.device.slug}/${filename}`,
        });
      }

      results.push({ job, exitCode });
    }
  } finally {
    if (!args.keepBooted) {
      for (const udid of bootedUdids) shutdownDevice(udid);
    }
  }

  const manifest = buildManifest({
    label: args.label,
    runDirectory: plan.runDirectory,
    startedAt,
    finishedAt: new Date().toISOString(),
    appVersion: version,
    gitSha: sha,
    devices: args.devices,
    flows: flows.map(f => f.path),
    boardSizes: args.sizes,
    shots,
  });
  const manifestPath = writeManifest(
    { mkdirSync, writeFileSync },
    resolve(REPO_ROOT, plan.runDirectory),
    manifest,
  );

  console.log(summarize(results));
  console.log(`Manifest: ${manifestPath}`);
  return overallExitCode(results);
}

/* istanbul ignore next -- entry point */
if (require.main === module) {
  process.exit(main(process.argv.slice(2)));
}
