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

import {
  copyFileSync,
  existsSync,
  mkdirSync,
  readFileSync,
  readdirSync,
  writeFileSync,
} from 'fs';
import { resolve } from 'path';
import type { ChildProcess } from 'child_process';

import { parseShotsArgs, ShotsArgError, USAGE } from './args';
import { assertMacHost, HostError, scanLogForFailures } from './host';
import type { AndroidDeviceSpec } from './androidDevices';
import type { DeviceSpec } from './devices';
import { scanLogcatForFailures } from './androidLog';
import {
  adbPath,
  assertAndroidToolAvailable,
  bootAvd,
  defaultApkPath,
  installApk,
  installedApkSha256,
  isAppInstalled as isAndroidAppInstalled,
  localApk,
  collectLogcat,
  shutdownAvd,
  startLogcatCapture,
  stillAnimations,
} from './adb';
import {
  buildProvenance,
  decideInstall,
  describeInstallDecision,
  type BuildProvenance,
  type LocalArtifact,
} from './install';
import {
  buildManifest,
  writeManifest,
  type ManifestShot,
} from './manifest';
import {
  buildRunPlan,
  describeSkippedFlow,
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
  readIosInstallMarkers,
  readLog,
  recordIosInstall,
  runMaestro,
  shutdownDevice,
  startLogCapture,
  stopLogCapture,
  treeFingerprint,
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

function stepFromFilename(filename: string): string {
  return filename.replace(/\.png$/, '');
}

/**
 * Lift a job's screenshots out of Maestro's artifact folder into the run
 * directory.
 *
 * Maestro 2.10 writes `takeScreenshot` output to
 * `<--test-output-dir>/takeScreenshot/<name>.png` and refuses to write
 * anywhere else, so the layout PROMPT_159 specifies
 * (`__shots__/<date>-<label>/<device>/<step>.png`) has to be assembled by
 * the runner rather than by the flow. Returns the filenames copied.
 */
function collectShots(artifactDirectory: string, shotDirectory: string): string[] {
  const root = resolve(REPO_ROOT, artifactDirectory);
  if (!existsSync(root)) return [];
  const target = resolve(REPO_ROOT, shotDirectory);
  mkdirSync(target, { recursive: true });
  const copied: string[] = [];
  for (const source of findScreenshotDirs(root)) {
    for (const filename of readdirSync(source)) {
      if (!filename.endsWith('.png')) continue;
      copyFileSync(`${source}/${filename}`, `${target}/${filename}`);
      copied.push(filename);
    }
  }
  return copied.sort();
}

/**
 * Every `takeScreenshot` directory under a job's artifact folder.
 *
 * Maestro nests its output as
 * `<--test-output-dir>/<timestamp>/<flow>/takeScreenshot/`, and the
 * timestamp segment is not predictable from anything the runner knows.
 * `--flatten-debug-output` is documented to remove it but produced no
 * output at all when combined with `--test-output-dir`, so the runner walks
 * for the directory instead of trying to compute its path.
 */
function findScreenshotDirs(root: string): string[] {
  const found: string[] = [];
  const walk = (dir: string, depth: number): void => {
    if (depth > 4) return;
    for (const entry of readdirSync(dir, { withFileTypes: true })) {
      if (!entry.isDirectory()) continue;
      const child = `${dir}/${entry.name}`;
      if (entry.name === 'takeScreenshot') found.push(child);
      else walk(child, depth + 1);
    }
  };
  walk(root, 0);
  return found.sort();
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

  let flows;
  let plan;
  try {
    // Each flow is read so its `# platforms:` header marker can be honoured.
    flows = discoverFlows(args.flowsGlob).map(path =>
      toFlowFile(path, readFileSync(resolve(REPO_ROOT, path), 'utf8')),
    );
    plan = buildRunPlan(args, flows);
  } catch (error) {
    console.error((error as Error).message);
    return 2;
  }

  for (const skipped of plan.skippedFlows) {
    console.log(describeSkippedFlow(skipped, args.platform));
  }

  if (args.dryRun) {
    console.log(`Platform: ${args.platform}`);
    console.log(`Run directory: ${plan.runDirectory}`);
    for (const job of plan.jobs) {
      const size = job.boardSize ? `${job.boardSize.columns}x${job.boardSize.rows}` : '-';
      console.log(`  ${job.device.alias.padEnd(4)} ${job.flow.path} [${size}] -> ${job.shotDirectory}`);
    }
    console.log(`${plan.jobs.length} flow run(s) planned. Nothing was booted.`);
    return 0;
  }

  const isAndroid = args.platform === 'android';

  try {
    if (isAndroid) {
      // No host guard on this path: the Android SDK and Maestro run on
      // Windows, Linux and macOS alike.
      assertAndroidToolAvailable(adbPath(), ['version']);
      assertAndroidToolAvailable('maestro', ['--version']);
    } else {
      // The iOS path stays guarded. PROMPT_159 fixed it to the simulator and
      // gave it no fallback, and the AXM-011 scope change did not move that:
      // REQ-A-1..A-3 still waits for a Mac.
      assertMacHost();
      assertToolAvailable('xcrun', ['simctl', 'help']);
      assertToolAvailable('maestro', ['--version']);
    }
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
  const provenanceByUdid = new Map<string, BuildProvenance>();
  // What the harness would install: the local APK (hashed once; it is
  // ~90 MB), or on iOS the working tree it would build from.
  const local: LocalArtifact | null = isAndroid
    ? localApk(REPO_ROOT)
    : { path: null, fingerprint: treeFingerprint(REPO_ROOT), modifiedAt: null };
  const iosMarkers = isAndroid ? {} : readIosInstallMarkers(REPO_ROOT);

  try {
    for (const job of plan.jobs) {
      const udid = isAndroid
        ? bootAvd(job.device as AndroidDeviceSpec)
        : findUdid(job.device as unknown as DeviceSpec);
      if (!bootedUdids.has(udid)) {
        if (isAndroid) {
          // Platform transition animations off, so a screenshot is of a
          // settled frame rather than a half-finished fade.
          stillAnimations(udid);
        } else {
          bootDevice(udid);
        }

        // Install whenever the device's build is not provably the local one.
        // Before this, an emulator holding an older build was used as-is and
        // a run after rebuilding the APK photographed the stale build.
        const installed = isAndroid ? isAndroidAppInstalled(udid) : isAppInstalled(udid);
        let installedFingerprint: string | null = null;
        if (installed) {
          installedFingerprint = isAndroid ? installedApkSha256(udid) : iosMarkers[udid] ?? null;
        }
        const decision = decideInstall({
          local,
          installed,
          installedFingerprint,
          installNeedsBuild: !isAndroid,
          buildIfMissing: args.buildIfMissing,
        });
        const message = describeInstallDecision(decision, job.device.label, args.platform);
        if (decision.action === 'fail') {
          console.error(message);
          return 3;
        }
        if (message) console.log(message);
        if (decision.action === 'install') {
          if (isAndroid) {
            installApk(udid, defaultApkPath(REPO_ROOT));
          } else {
            buildAndInstall(job.device as unknown as DeviceSpec, REPO_ROOT);
            recordIosInstall(REPO_ROOT, udid, local!.fingerprint);
          }
        }
        provenanceByUdid.set(udid, buildProvenance(decision, local, installedFingerprint));
        bootedUdids.add(udid);
      }

      const absoluteShotDir = resolve(REPO_ROOT, job.shotDirectory);
      mkdirSync(absoluteShotDir, { recursive: true });

      // Android clears the device log here and dumps it after the flow;
      // iOS streams it through a child process.
      let logProcess: ChildProcess | null = null;
      if (job.logFile) {
        if (isAndroid) startLogcatCapture(udid);
        else logProcess = startLogCapture(udid, resolve(REPO_ROOT, job.logFile));
      }

      const { command, args: maestroArgs } = maestroCommand(job, udid);
      const env = { ...process.env, ...job.env, SHOT_DIR: absoluteShotDir };
      let exitCode = runMaestro(command, maestroArgs, env, REPO_ROOT);

      if (job.logFile) {
        const logPath = resolve(REPO_ROOT, job.logFile);
        let hits: string[];
        if (isAndroid) {
          hits = scanLogcatForFailures(collectLogcat(udid, logPath));
        } else {
          if (logProcess) stopLogCapture(logProcess);
          hits = scanLogForFailures(readLog(logPath));
        }
        if (hits.length > 0) {
          // On Android this says "the run did not actually work" — a native
          // crash, a redbox or an ANR. It is deliberately NOT reported as
          // evidence about REQ-A-1..A-3, which is a macOS question.
          console.error(
            `${isAndroid ? 'Log scan' : 'Animation-host safety'} FAILED on ` +
              `${job.device.label}: ${hits.length} offending log line(s). ` +
              `First: ${hits[0]}`,
          );
          exitCode = exitCode === 0 ? 1 : exitCode;
        }
      }

      // The manifest is built from what the collector actually copied out of
      // this job's own artifact folder, not from a before/after diff of the
      // device directory. The diff silently dropped a shot whenever a file
      // of the same name was already there — which happens the moment a run
      // is repeated with the same date and label, and is exactly how a
      // stale image from an earlier run can end up sitting in a folder while
      // the manifest says nothing about it.
      const collected = collectShots(job.artifactDirectory, job.shotDirectory);
      for (const filename of collected) {
        shots.push({
          step: stepFromFilename(filename),
          platform: args.platform,
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
          build: provenanceByUdid.get(udid)!,
        });
      }

      results.push({ job, exitCode });
    }
  } finally {
    if (!args.keepBooted) {
      for (const udid of bootedUdids) {
        if (isAndroid) shutdownAvd(udid);
        else shutdownDevice(udid);
      }
    }
  }

  const manifest = buildManifest({
    label: args.label,
    platform: args.platform,
    runDirectory: plan.runDirectory,
    startedAt,
    finishedAt: new Date().toISOString(),
    appVersion: version,
    gitSha: sha,
    devices: args.devices,
    flows: flows.filter(f => !plan.skippedFlows.includes(f)).map(f => f.path),
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
