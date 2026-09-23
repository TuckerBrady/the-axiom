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
 * `appId` scopes the crash patterns that name a package, so another app
 * misbehaving on the same emulator does not fail our run.
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
