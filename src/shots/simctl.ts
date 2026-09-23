/**
 * Thin `xcrun simctl` / Maestro wrapper for the shots harness.
 *
 * This is the imperative shell: every decision it acts on was made in
 * `plan.ts`, and every judgement it reports was made in `host.ts`. It can
 * only do anything on a macOS host — `assertMacHost` runs first in
 * `cli.ts`, so another platform fails with one clear sentence instead of a
 * stack of ENOENTs.
 */

import {
  spawn,
  spawnSync,
  type ChildProcess,
  type SpawnSyncReturns,
} from 'child_process';
import { createHash } from 'crypto';
import { createWriteStream, existsSync, mkdirSync, readFileSync, writeFileSync } from 'fs';
import { dirname } from 'path';

import type { DeviceSpec } from './devices';
import { HostError } from './host';
import {
  parseIosInstallMarkers,
  serializeIosInstallMarkers,
  withIosInstallMarker,
  type IosInstallMarkers,
} from './install';

/** iOS bundle id, matching the `appId` in `.maestro/flows/*.yaml`. */
export const APP_ID = 'com.tuckbrady.theaxiom';

function run(command: string, args: string[]): SpawnSyncReturns<string> {
  return spawnSync(command, args, { encoding: 'utf8' });
}

export function assertToolAvailable(command: string, versionArgs: string[]): void {
  const result = run(command, versionArgs);
  if (result.error || result.status !== 0) {
    throw new HostError(
      `"${command}" is not available on PATH (or exited non-zero). ` +
        'Install the Xcode command line tools and Maestro before running the harness.',
    );
  }
}

interface SimctlDevice {
  udid: string;
  name: string;
  state: string;
  isAvailable?: boolean;
}

/** Resolve a device spec to a simulator udid, by exact simulator name. */
export function findUdid(device: DeviceSpec): string {
  const result = run('xcrun', ['simctl', 'list', 'devices', '--json']);
  if (result.status !== 0) {
    throw new HostError(`xcrun simctl list failed: ${result.stderr}`);
  }
  const parsed = JSON.parse(result.stdout) as {
    devices: Record<string, SimctlDevice[]>;
  };
  for (const list of Object.values(parsed.devices)) {
    for (const candidate of list) {
      if (candidate.name === device.simulatorName && candidate.isAvailable !== false) {
        return candidate.udid;
      }
    }
  }
  throw new HostError(
    `No simulator named "${device.simulatorName}". ` +
      'Create it in Xcode > Window > Devices and Simulators, then re-run.',
  );
}

export function bootDevice(udid: string): void {
  const result = run('xcrun', ['simctl', 'boot', udid]);
  // Already booted is not an error for our purposes.
  if (
    result.status !== 0 &&
    !/Unable to boot device in current state: Booted/.test(result.stderr ?? '')
  ) {
    throw new HostError(`Failed to boot ${udid}: ${result.stderr}`);
  }
  run('xcrun', ['simctl', 'bootstatus', udid, '-b']);
}

export function shutdownDevice(udid: string): void {
  run('xcrun', ['simctl', 'shutdown', udid]);
}

export function isAppInstalled(udid: string, appId: string = APP_ID): boolean {
  return run('xcrun', ['simctl', 'get_app_container', udid, appId]).status === 0;
}

/**
 * Build and install the dev client for one simulator.
 *
 * `expo run:ios` is the supported path to a simulator build of the custom
 * dev client. Only called when `--build-if-missing` is set and the app is
 * absent, or installed but not built by the harness from the current tree.
 */
export function buildAndInstall(device: DeviceSpec, repoRoot: string): void {
  const result = spawnSync(
    'npx',
    ['expo', 'run:ios', '--device', device.simulatorName, '--no-install'],
    { cwd: repoRoot, stdio: 'inherit', encoding: 'utf8' },
  );
  if (result.status !== 0) {
    throw new HostError(
      `Dev client build failed for ${device.label} (exit ${result.status}).`,
    );
  }
}

/** Start streaming the simulator's log for our bundle into a file. */
export function startLogCapture(udid: string, logFile: string): ChildProcess {
  mkdirSync(dirname(logFile), { recursive: true });
  const stream = createWriteStream(logFile, { flags: 'a' });
  const child = spawn(
    'xcrun',
    [
      'simctl',
      'spawn',
      udid,
      'log',
      'stream',
      '--style',
      'compact',
      '--predicate',
      'processImagePath CONTAINS "TheAxiom"',
    ],
    { stdio: ['ignore', 'pipe', 'pipe'] },
  );
  child.stdout?.pipe(stream);
  child.stderr?.pipe(stream);
  return child;
}

export function stopLogCapture(child: ChildProcess): void {
  child.kill('SIGTERM');
}

export function readLog(logFile: string): string {
  return existsSync(logFile) ? readFileSync(logFile, 'utf8') : '';
}

export function runMaestro(
  command: string,
  args: string[],
  env: NodeJS.ProcessEnv,
  cwd: string,
): number {
  const result = spawnSync(command, args, {
    cwd,
    env,
    stdio: 'inherit',
    encoding: 'utf8',
    // Windows ships Maestro as `maestro.bat`, which CreateProcess cannot
    // run directly. See NEEDS_SHELL in `adb.ts`.
    shell: process.platform === 'win32',
  });
  if (result.error) {
    throw new HostError(`Could not run "${command}": ${result.error.message}`);
  }
  return result.status ?? 1;
}

export function gitSha(repoRoot: string): string {
  const result = run('git', ['-C', repoRoot, 'rev-parse', '--short', 'HEAD']);
  return result.status === 0 ? result.stdout.trim() : 'unknown';
}

export function appVersion(repoRoot: string): string {
  const packagePath = `${repoRoot}/package.json`;
  if (!existsSync(packagePath)) return 'unknown';
  const pkg = JSON.parse(readFileSync(packagePath, 'utf8')) as { version?: string };
  return pkg.version ?? 'unknown';
}

/**
 * Fingerprint of the working tree an iOS build would be made from: HEAD, the
 * uncommitted diff against it, and the names of untracked files. Xcode's
 * output path is not predictable, so this stands in for the artefact hash
 * the Android path uses.
 */
export function treeFingerprint(repoRoot: string): string {
  const git = (args: string[]): string => run('git', ['-C', repoRoot, ...args]).stdout ?? '';
  return createHash('sha256')
    .update(git(['rev-parse', 'HEAD']))
    .update('\0')
    .update(git(['diff', 'HEAD', '--binary']))
    .update('\0')
    .update(git(['ls-files', '--others', '--exclude-standard']))
    .digest('hex');
}

/** Where the harness records which tree it last built onto each simulator. */
export function iosInstallMarkerPath(repoRoot: string): string {
  return `${repoRoot}/.shots-build/ios-installs.json`;
}

export function readIosInstallMarkers(repoRoot: string): IosInstallMarkers {
  const path = iosInstallMarkerPath(repoRoot);
  return parseIosInstallMarkers(existsSync(path) ? readFileSync(path, 'utf8') : null);
}

export function recordIosInstall(repoRoot: string, udid: string, fingerprint: string): void {
  const path = iosInstallMarkerPath(repoRoot);
  mkdirSync(dirname(path), { recursive: true });
  const markers = withIosInstallMarker(readIosInstallMarkers(repoRoot), udid, fingerprint);
  writeFileSync(path, serializeIosInstallMarkers(markers), 'utf8');
}
