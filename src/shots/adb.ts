/**
 * Thin `adb` / `emulator` / Maestro wrapper for the shots harness — the
 * Android counterpart to `simctl.ts`.
 *
 * Same split as the iOS side: this is the imperative shell, every decision it
 * acts on was made in `plan.ts`, and every judgement it reports was made in
 * `host.ts` or `androidLog.ts`. The pure parts are unit tested; this file is
 * verified by running it.
 *
 * Unlike the iOS path this one runs on Windows, Linux and macOS alike: the
 * Android SDK and Maestro are all cross-platform, so there is no host guard
 * here. `assertMacHost` still guards the iOS path and must keep doing so.
 */

import { spawn, spawnSync, type SpawnSyncReturns } from 'child_process';
import { createHash } from 'crypto';
import { existsSync, mkdirSync, readFileSync, statSync, writeFileSync } from 'fs';
import { dirname } from 'path';

import type { AndroidDeviceSpec } from './androidDevices';
import { HostError } from './host';
import {
  emulatorSerialForAvd,
  logcatDumpArgs,
  parseAdbDevices,
  parsePidof,
} from './androidLog';
import { parsePmPathBaseApk, parseSha256sum, type LocalArtifact } from './install';

/**
 * Android application id. Matches `android.package` in `app.json` and the
 * `appId` in `.maestro/flows/*.yaml`.
 *
 * Note the spelling: `tuckerbrady`, not `tuckbrady`. The flows shipped in
 * PR #47 carried `com.tuckbrady.theaxiom`, which matches neither the iOS
 * bundle identifier nor the Android package. It had never been caught
 * because the flows had never been executed.
 */
export const ANDROID_APP_ID = 'com.tuckerbrady.theaxiom';

/**
 * On Windows, Maestro ships as `maestro.bat`. `spawnSync` goes through
 * CreateProcess, which cannot execute a .bat at all — it only resolves .exe
 * from PATH — so a bare `spawnSync('maestro', ...)` fails with ENOENT on a
 * machine where `maestro --version` works fine in the terminal. Running
 * through the shell is what makes the Windows host viable.
 */
export const NEEDS_SHELL = process.platform === 'win32';

function run(command: string, args: string[]): SpawnSyncReturns<string> {
  return spawnSync(command, args, { encoding: 'utf8', shell: NEEDS_SHELL });
}

export function adbPath(): string {
  const home = process.env.ANDROID_HOME ?? process.env.ANDROID_SDK_ROOT;
  if (!home) return 'adb';
  const exe = process.platform === 'win32' ? 'adb.exe' : 'adb';
  const candidate = `${home}/platform-tools/${exe}`;
  return existsSync(candidate) ? candidate : 'adb';
}

export function emulatorPath(): string {
  const home = process.env.ANDROID_HOME ?? process.env.ANDROID_SDK_ROOT;
  if (!home) return 'emulator';
  const exe = process.platform === 'win32' ? 'emulator.exe' : 'emulator';
  const candidate = `${home}/emulator/${exe}`;
  return existsSync(candidate) ? candidate : 'emulator';
}

export function assertAndroidToolAvailable(
  command: string,
  versionArgs: string[],
): void {
  const result = run(command, versionArgs);
  if (result.error || result.status !== 0) {
    throw new HostError(
      `"${command}" is not available (or exited non-zero). ` +
        'Install the Android SDK (cmdline-tools, platform-tools, emulator) and ' +
        'Maestro, and set ANDROID_HOME, before running the harness with ' +
        '--platform android.',
    );
  }
}

/** Serials currently attached, in `adb devices` order. */
export function listSerials(): { serial: string; state: string }[] {
  const result = run(adbPath(), ['devices']);
  if (result.status !== 0) {
    throw new HostError(`adb devices failed: ${result.stderr}`);
  }
  return parseAdbDevices(result.stdout);
}

/** The AVD name a running emulator serial is hosting, or null. */
export function avdNameOf(serial: string): string | null {
  const result = run(adbPath(), ['-s', serial, 'emu', 'avd', 'name']);
  if (result.status !== 0) return null;
  const first = result.stdout.split('\n')[0]?.trim();
  return first && first !== 'OK' ? first : null;
}

/** Map every attached emulator to the AVD it is running. */
export function runningAvds(): { serial: string; avd: string }[] {
  const found: { serial: string; avd: string }[] = [];
  for (const { serial, state } of listSerials()) {
    if (state !== 'device') continue;
    const avd = avdNameOf(serial);
    if (avd) found.push({ serial, avd });
  }
  return found;
}

/**
 * Boot an AVD if it is not already up, and return its serial.
 *
 * Reuses a running emulator rather than starting a second copy: a sweep
 * runs nine flows across three devices and booting each one nine times
 * would dominate the run.
 */
export function bootAvd(device: AndroidDeviceSpec, timeoutMs = 300_000): string {
  const already = emulatorSerialForAvd(runningAvds(), device.target);
  if (already) return already;

  // `-gpu swiftshader_indirect` rather than `host`: three emulators sharing
  // one host GPU went `offline` mid-flow repeatedly, which surfaces as a
  // Maestro "device not found" that looks like a flow failure. The software
  // renderer is slower to draw and has been stable.
  spawn(
    emulatorPath(),
    [
      '-avd',
      device.target,
      '-no-snapshot',
      '-no-boot-anim',
      '-gpu',
      'swiftshader_indirect',
    ],
    { detached: true, stdio: 'ignore' },
  ).unref();

  const deadline = Date.now() + timeoutMs;
  while (Date.now() < deadline) {
    const serial = emulatorSerialForAvd(runningAvds(), device.target);
    if (serial && isBootCompleted(serial)) return serial;
    sleep(4000);
  }
  throw new HostError(
    `Emulator "${device.target}" did not finish booting within ${Math.round(
      timeoutMs / 1000,
    )}s.`,
  );
}

export function isBootCompleted(serial: string): boolean {
  const result = run(adbPath(), ['-s', serial, 'shell', 'getprop', 'sys.boot_completed']);
  return result.status === 0 && result.stdout.trim() === '1';
}

function sleep(ms: number): void {
  Atomics.wait(new Int32Array(new SharedArrayBuffer(4)), 0, 0, ms);
}

export function shutdownAvd(serial: string): void {
  run(adbPath(), ['-s', serial, 'emu', 'kill']);
}

/**
 * Still the animations off, so a screenshot is of a settled frame.
 *
 * This is a screenshot-stability measure, not a change to what the app does:
 * it scales the platform's own transition animators, and the game's own
 * `Animated` work is untouched. REQ-A-1..A-3 is about the animation host, so
 * the animation-host flow is the one place this would matter — and that
 * requirement is not being reported from Android at all.
 */
export function stillAnimations(serial: string): void {
  for (const key of [
    'window_animation_scale',
    'transition_animation_scale',
    'animator_duration_scale',
  ]) {
    run(adbPath(), ['-s', serial, 'shell', 'settings', 'put', 'global', key, '0.0']);
  }
}

export function isAppInstalled(serial: string, appId: string = ANDROID_APP_ID): boolean {
  const result = run(adbPath(), [
    '-s',
    serial,
    'shell',
    'pm',
    'list',
    'packages',
    appId,
  ]);
  return result.status === 0 && result.stdout.includes(`package:${appId}`);
}

/**
 * SHA-256 of the APK installed on the device, or null when it cannot be read.
 *
 * `adb install` copies the APK byte for byte to `base.apk`, so this is
 * directly comparable with the hash of the local file. Needs toybox
 * `sha256sum` (API 26+); a null here makes the harness reinstall rather than
 * trust a build it could not check.
 */
export function installedApkSha256(
  serial: string,
  appId: string = ANDROID_APP_ID,
): string | null {
  const paths = run(adbPath(), ['-s', serial, 'shell', 'pm', 'path', appId]);
  if (paths.status !== 0) return null;
  const baseApk = parsePmPathBaseApk(paths.stdout);
  if (!baseApk) return null;
  // Single-quoted for the device shell: the path carries `~~` and `==`.
  const sum = run(adbPath(), ['-s', serial, 'shell', 'sha256sum', `'${baseApk}'`]);
  return sum.status === 0 ? parseSha256sum(sum.stdout) : null;
}

/** Install (or reinstall) an already-built APK. */
export function installApk(serial: string, apkPath: string): void {
  if (!existsSync(apkPath)) {
    throw new HostError(
      `APK not found at ${apkPath}. Build it first: ` +
        'EXPO_PUBLIC_SHOW_DEV_TOOLS=true npx expo prebuild --platform android && ' +
        'cd android && ./gradlew assembleRelease',
    );
  }
  const result = spawnSync(adbPath(), ['-s', serial, 'install', '-r', '-g', apkPath], {
    stdio: 'inherit',
    encoding: 'utf8',
  });
  if (result.status !== 0) {
    throw new HostError(`adb install failed on ${serial} (exit ${result.status}).`);
  }
}

/**
 * Where `gradlew assembleRelease` leaves the APK.
 *
 * Release, not debug, on purpose: a debug build needs a Metro server alive
 * for the whole run, and a dev-server disconnect mid-flow would look like a
 * flow failure. Release bundles the JS, so a run is self-contained.
 */
export const DEFAULT_APK_RELATIVE_PATH =
  'android/app/build/outputs/apk/release/app-release.apk';

export function defaultApkPath(repoRoot: string): string {
  return `${repoRoot}/${DEFAULT_APK_RELATIVE_PATH}`;
}

/**
 * The local release APK — path, SHA-256 and mtime — or null when it has not
 * been built. Hashed once per run; it is ~90 MB.
 */
export function localApk(repoRoot: string): LocalArtifact | null {
  const absolute = defaultApkPath(repoRoot);
  if (!existsSync(absolute)) return null;
  return {
    path: DEFAULT_APK_RELATIVE_PATH,
    fingerprint: createHash('sha256').update(readFileSync(absolute)).digest('hex'),
    modifiedAt: statSync(absolute).mtime.toISOString(),
  };
}

/** The app's main-process pid on a device, or null when it is not running. */
export function appPid(serial: string, appId: string = ANDROID_APP_ID): string | null {
  const result = run(adbPath(), ['-s', serial, 'shell', 'pidof', appId]);
  return result.status === 0 ? parsePidof(result.stdout) : null;
}

/**
 * Clear the device log before a flow, so the dump taken after it holds only
 * that flow's lines.
 */
export function startLogcatCapture(serial: string): void {
  run(adbPath(), ['-s', serial, 'logcat', '-c']);
}

/**
 * Dump the flow's logcat, scoped to our process, into `logFile` and return
 * it for scanning.
 *
 * The file is written fresh, never appended to: a rerun with the same date
 * and label must not scan the previous run's crash. The dump is a
 * synchronous `logcat -d`, so it is complete when this returns and there is
 * no pipe left to flush (see `logcatDumpArgs` for why it is not streamed).
 *
 * Without a pid (our process is gone, which is what a crash looks like) the
 * dump falls back to unscoped and says so, rather than scanning nothing.
 */
export function collectLogcat(
  serial: string,
  logFile: string,
  appId: string = ANDROID_APP_ID,
): string {
  const pid = appPid(serial, appId);
  if (!pid) {
    console.warn(
      `Warning: ${appId} has no running process on ${serial}; ` +
        'the log scan reads the unscoped device log.',
    );
  }
  const result = run(adbPath(), logcatDumpArgs(serial, pid));
  const contents = `${result.stdout ?? ''}${result.stderr ?? ''}`;
  mkdirSync(dirname(logFile), { recursive: true });
  writeFileSync(logFile, contents, { flag: 'w' });
  return contents;
}
