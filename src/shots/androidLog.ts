/**
 * Pure Android helpers for the shots harness: parsing what `adb` prints, and
 * judging what logcat contains.
 *
 * Separated from `adb.ts` for the same reason `host.ts` is separated from
 * `simctl.ts` — these are the judgements a machine with no emulator attached
 * still needs to be able to test.
 */

export interface AdbDevice {
  serial: string;
  /** `device`, `offline`, `unauthorized`, ... */
  state: string;
}

/**
 * Parse `adb devices` output.
 *
 * Tolerates the daemon-start preamble adb prints on a cold start, the
 * `List of devices attached` header, and blank lines.
 */
export function parseAdbDevices(stdout: string): AdbDevice[] {
  const devices: AdbDevice[] = [];
  for (const rawLine of stdout.split('\n')) {
    const line = rawLine.trim();
    if (line.length === 0) continue;
    if (line.startsWith('List of devices')) continue;
    if (line.startsWith('*')) continue; // daemon chatter
    const match = /^(\S+)\s+(\S+)$/.exec(line);
    if (!match) continue;
    devices.push({ serial: match[1], state: match[2] });
  }
  return devices;
}

/** The serial running a given AVD, or null when it is not up. */
export function emulatorSerialForAvd(
  running: readonly { serial: string; avd: string }[],
  avdName: string,
): string | null {
  return running.find(entry => entry.avd === avdName)?.serial ?? null;
}

/**
 * Failure signatures worth failing a run over, in logcat.
 *
 * Deliberately narrower than the iOS list in `host.ts`. The iOS patterns
 * include `SIGABRT` and `RCTFatal`, which are the REQ-A-1..A-3 crash class;
 * those stay on the iOS side because that requirement is answered by a
 * macOS run and nothing here is reported against it.
 *
 * What this list covers is the Android equivalent of "the run did not
 * actually work": a native crash of our own process, a React Native redbox,
 * or an ANR. A flow can walk through all of those and still exit zero,
 * which is exactly the failure mode a screenshot harness must not have.
 */
export const ANDROID_LOG_FAILURE_PATTERNS: readonly RegExp[] = Object.freeze([
  /FATAL EXCEPTION/i,
  /AndroidRuntime:\s+.*Exception/i,
  /libc.*Fatal signal/i,
  /ANR in com\.tuckerbrady\.theaxiom/i,
  /ReactNativeJS:.*\bError\b/i,
  /Attempting to run JS driven animation on animated node that has been moved to "native"/i,
]);

/**
 * Lines in `contents` that match a failure signature.
 *
 * This scans whatever it is given; it does not filter by app itself. The
 * scoping to our app happens when the log is captured: `adb.ts` dumps
 * logcat with `--pid=<our pid>` (see `logcatDumpArgs`), so another app
 * crashing on the same emulator is not in the file at all. When no pid can
 * be found, typically because our process died, the dump is unscoped and
 * the runner warns; the ANR pattern names our package (system_server logs
 * ANRs, not our process) so another app's ANR still cannot fail our run.
 */
export function scanLogcatForFailures(contents: string): string[] {
  const hits: string[] = [];
  for (const line of contents.split('\n')) {
    const trimmed = line.trim();
    if (trimmed.length === 0) continue;
    if (ANDROID_LOG_FAILURE_PATTERNS.some(pattern => pattern.test(trimmed))) {
      hits.push(trimmed);
    }
  }
  return hits;
}

/**
 * The pid in `adb shell pidof <package>` output, or null when the app is not
 * running. A package with more than one process prints several pids; the
 * first is the main process, which is the one that hosts React Native.
 */
export function parsePidof(stdout: string): string | null {
  const first = stdout.trim().split(/\s+/)[0] ?? '';
  return /^\d+$/.test(first) ? first : null;
}

/**
 * `adb` arguments that dump the logcat buffer and exit.
 *
 * `-d` rather than a streamed `logcat` child: the runner is synchronous
 * (Maestro runs under `spawnSync`), so a streamed child's pipe is never
 * drained while the flow runs and the log file came back empty. A dump runs
 * after the flow, returns complete, and has nothing left to flush.
 *
 * Scoped with `--pid` when a pid is known. The pid is resolved after the
 * flow, not before it, because every flow relaunches the app (`launchApp`
 * in enter-hub stops it first), so a pid taken at the start would name a
 * process that no longer exists and scope the dump to nothing.
 */
export function logcatDumpArgs(serial: string, pid: string | null): string[] {
  const args = ['-s', serial, 'logcat', '-d', '-v', 'time'];
  if (pid) args.push(`--pid=${pid}`);
  return args;
}
