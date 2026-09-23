/**
 * Install decisions for `npm run shots`: is the build on the device the build
 * we mean to photograph?
 *
 * The harness used to install only when the app was absent. An emulator that
 * already held an older build was used as-is, so a run after rebuilding the
 * APK photographed the stale build and the manifest gave no hint of it.
 *
 * The rule now: compare a fingerprint of what the harness *would* install
 * against a fingerprint of what the device *has*, and treat anything short of
 * a match as stale.
 *
 * - Android: both fingerprints are the SHA-256 of the APK. `adb install`
 *   copies the file byte for byte to `base.apk`, so hashing it on the device
 *   is exact — no marker file to drift, no emulator clock to trust.
 * - iOS: the harness builds from source and Xcode's output path is not
 *   predictable, so the local fingerprint is the working tree's and the
 *   device's is a marker the harness writes after each build it installs.
 *
 * Pure: every input is gathered by `cli.ts` through `adb.ts` / `simctl.ts`.
 */

import type { ShotPlatform } from './devices';

/** The build the harness would install, if it installed one. */
export interface LocalArtifact {
  /** Repo-relative APK path on Android; null on iOS (built from source). */
  path: string | null;
  /** SHA-256 of the APK on Android; the working-tree fingerprint on iOS. */
  fingerprint: string;
  /** APK mtime (ISO) on Android; null on iOS. */
  modifiedAt: string | null;
}

export interface InstallState {
  /** Null when there is nothing to install (Android: no APK built). */
  local: LocalArtifact | null;
  installed: boolean;
  /** Fingerprint of what is on the device; null when it cannot be read. */
  installedFingerprint: string | null;
  /**
   * True when installing means building first (iOS, minutes and Xcode), so
   * the harness only does it with `--build-if-missing`. Android installs an
   * APK that already exists, which is cheap enough to do unasked.
   */
  installNeedsBuild: boolean;
  buildIfMissing: boolean;
}

export type InstallReason = 'absent' | 'stale' | 'unverified';

export type InstallDecision =
  | { action: 'keep'; verified: boolean }
  | { action: 'install'; reason: InstallReason }
  | { action: 'fail'; reason: 'no-artifact' }
  | { action: 'fail'; reason: 'needs-build'; because: InstallReason };

export function decideInstall(state: InstallState): InstallDecision {
  const { local } = state;

  let reason: InstallReason;
  if (!state.installed) {
    if (local === null) return { action: 'fail', reason: 'no-artifact' };
    reason = 'absent';
  } else {
    // Something is installed and there is nothing local to compare it with:
    // shoot it, but never claim to know what it is.
    if (local === null) return { action: 'keep', verified: false };
    if (
      state.installedFingerprint !== null &&
      state.installedFingerprint.toLowerCase() === local.fingerprint.toLowerCase()
    ) {
      return { action: 'keep', verified: true };
    }
    reason = state.installedFingerprint === null ? 'unverified' : 'stale';
  }

  if (state.installNeedsBuild && !state.buildIfMissing) {
    return { action: 'fail', reason: 'needs-build', because: reason };
  }
  return { action: 'install', reason };
}

/**
 * The line the CLI prints for a decision, or null when there is nothing to
 * say. Failures are the whole error message.
 */
export function describeInstallDecision(
  decision: InstallDecision,
  deviceLabel: string,
  platform: ShotPlatform,
): string | null {
  if (decision.action === 'keep') {
    if (decision.verified) return null;
    return (
      `WARNING: using the build already on ${deviceLabel}. No local APK exists to ` +
      'compare it with, so which build these shots show cannot be verified. The ' +
      'manifest records the installed hash and verified: false.'
    );
  }

  if (decision.action === 'install') {
    const why = {
      absent: 'The Axiom is not installed',
      stale: 'The installed build differs from the local build',
      unverified: 'The installed build could not be verified',
    }[decision.reason];
    const what = platform === 'android' ? 'installing the local APK' : 'building and installing';
    return `${why} on ${deviceLabel}; ${what}.`;
  }

  if (decision.reason === 'no-artifact') {
    return (
      `The Axiom is not installed on ${deviceLabel} and no APK has been built. Build it ` +
      'first: EXPO_PUBLIC_SHOW_DEV_TOOLS=true npx expo prebuild --platform android && ' +
      'cd android && ./gradlew assembleRelease'
    );
  }

  const why = {
    absent: 'is not installed',
    stale: 'is installed, but that build is older than the working tree',
    unverified: 'is installed, but the harness did not build it, so it cannot be verified',
  }[decision.because];
  return (
    `The Axiom ${why} on ${deviceLabel}. Re-run with --build-if-missing to build ` +
    'and install the current tree.'
  );
}

/** What the manifest records about the build behind each shot. */
export interface BuildProvenance {
  /** Repo-relative APK path, or null (iOS, or no local APK). */
  artifact: string | null;
  /** APK mtime (ISO), or null. */
  artifactModifiedAt: string | null;
  /**
   * Fingerprint of the build the shot was taken with: the APK's SHA-256 on
   * Android, the working-tree fingerprint on iOS. Null when unknown.
   */
  sha256: string | null;
  /** True only when the device's build is known to match `artifact`. */
  verified: boolean;
  installedThisRun: boolean;
}

export function buildProvenance(
  decision: InstallDecision,
  local: LocalArtifact | null,
  installedFingerprint: string | null,
): BuildProvenance {
  if (decision.action === 'fail') {
    throw new Error('buildProvenance called with a failed install decision.');
  }
  const trusted = decision.action === 'install' || decision.verified;
  if (trusted && local) {
    return {
      artifact: local.path,
      artifactModifiedAt: local.modifiedAt,
      sha256: local.fingerprint.toLowerCase(),
      verified: true,
      installedThisRun: decision.action === 'install',
    };
  }
  return {
    artifact: null,
    artifactModifiedAt: null,
    sha256: installedFingerprint ? installedFingerprint.toLowerCase() : null,
    verified: false,
    installedThisRun: false,
  };
}

/** The `base.apk` path from `adb shell pm path <package>`, or null. */
export function parsePmPathBaseApk(stdout: string): string | null {
  for (const line of stdout.split(/\r?\n/)) {
    const match = /^package:(.+\/base\.apk)\s*$/.exec(line.trim());
    if (match) return match[1];
  }
  return null;
}

/** The hash from `sha256sum <file>` output, or null for anything else. */
export function parseSha256sum(stdout: string): string | null {
  const match = /^([0-9a-fA-F]{64})\s/.exec(stdout.trim() + ' ');
  return match ? match[1].toLowerCase() : null;
}

/** Simulator udid -> fingerprint of the tree the harness last built onto it. */
export type IosInstallMarkers = Record<string, string>;

/**
 * Parse the marker file. Missing or corrupt reads as empty, which makes every
 * installed build unverified — the safe direction.
 */
export function parseIosInstallMarkers(text: string | null): IosInstallMarkers {
  if (text === null) return {};
  let parsed: unknown;
  try {
    parsed = JSON.parse(text);
  } catch {
    return {};
  }
  if (typeof parsed !== 'object' || parsed === null || Array.isArray(parsed)) return {};
  const markers: IosInstallMarkers = {};
  for (const [udid, value] of Object.entries(parsed)) {
    if (typeof value === 'string') markers[udid] = value;
  }
  return markers;
}

export function withIosInstallMarker(
  markers: IosInstallMarkers,
  udid: string,
  fingerprint: string,
): IosInstallMarkers {
  return { ...markers, [udid]: fingerprint };
}

export function serializeIosInstallMarkers(markers: IosInstallMarkers): string {
  return `${JSON.stringify(markers, null, 2)}\n`;
}
