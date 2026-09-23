import {
  buildProvenance,
  decideInstall,
  describeInstallDecision,
  parseIosInstallMarkers,
  parsePmPathBaseApk,
  parseSha256sum,
  serializeIosInstallMarkers,
  withIosInstallMarker,
  type InstallDecision,
  type InstallState,
  type LocalArtifact,
} from '../../../src/shots/install';

const HASH_A = 'a'.repeat(64);
const HASH_B = 'b'.repeat(64);

const APK: LocalArtifact = {
  path: 'android/app/build/outputs/apk/release/app-release.apk',
  fingerprint: HASH_A,
  modifiedAt: '2026-09-21T08:54:00.000Z',
};

function android(overrides: Partial<InstallState> = {}): InstallState {
  return {
    local: APK,
    installed: true,
    installedFingerprint: HASH_A,
    installNeedsBuild: false,
    buildIfMissing: false,
    ...overrides,
  };
}

function ios(overrides: Partial<InstallState> = {}): InstallState {
  return {
    local: { path: null, fingerprint: HASH_A, modifiedAt: null },
    installed: true,
    installedFingerprint: HASH_A,
    installNeedsBuild: true,
    buildIfMissing: false,
    ...overrides,
  };
}

describe('decideInstall — Android (installing is cheap: the APK is already built)', () => {
  it('keeps the installed app when its hash matches the local APK', () => {
    expect(decideInstall(android())).toEqual({ action: 'keep', verified: true });
  });

  it('reinstalls when the installed APK differs from the local one — the stale-build case', () => {
    expect(decideInstall(android({ installedFingerprint: HASH_B }))).toEqual({
      action: 'install',
      reason: 'stale',
    });
  });

  it('reinstalls when the installed hash could not be read, rather than trusting it', () => {
    expect(decideInstall(android({ installedFingerprint: null }))).toEqual({
      action: 'install',
      reason: 'unverified',
    });
  });

  it('reinstalls a stale build without needing --build-if-missing', () => {
    expect(
      decideInstall(android({ installedFingerprint: HASH_B, buildIfMissing: false })),
    ).toEqual({ action: 'install', reason: 'stale' });
  });

  it('installs when the app is absent and the APK exists', () => {
    expect(
      decideInstall(android({ installed: false, installedFingerprint: null })),
    ).toEqual({ action: 'install', reason: 'absent' });
  });

  it('fails when the app is absent and there is no APK to install', () => {
    expect(
      decideInstall(
        android({ local: null, installed: false, installedFingerprint: null }),
      ),
    ).toEqual({ action: 'fail', reason: 'no-artifact' });
  });

  it('keeps an installed app when no local APK exists, but marks it unverified', () => {
    expect(decideInstall(android({ local: null, installedFingerprint: HASH_B }))).toEqual({
      action: 'keep',
      verified: false,
    });
  });

  it('compares hashes case-insensitively', () => {
    expect(
      decideInstall(android({ installedFingerprint: HASH_A.toUpperCase() })),
    ).toEqual({ action: 'keep', verified: true });
  });
});

describe('decideInstall — iOS (installing costs a build)', () => {
  it('keeps the installed app when the marker matches the working tree', () => {
    expect(decideInstall(ios())).toEqual({ action: 'keep', verified: true });
  });

  it('refuses to shoot a stale build without --build-if-missing', () => {
    expect(decideInstall(ios({ installedFingerprint: HASH_B }))).toEqual({
      action: 'fail',
      reason: 'needs-build',
      because: 'stale',
    });
  });

  it('refuses to shoot an unverified build without --build-if-missing', () => {
    expect(decideInstall(ios({ installedFingerprint: null }))).toEqual({
      action: 'fail',
      reason: 'needs-build',
      because: 'unverified',
    });
  });

  it('rebuilds a stale build when --build-if-missing is set', () => {
    expect(
      decideInstall(ios({ installedFingerprint: HASH_B, buildIfMissing: true })),
    ).toEqual({ action: 'install', reason: 'stale' });
  });

  it('keeps the old absent-app behaviour: fail without the flag, build with it', () => {
    expect(decideInstall(ios({ installed: false, installedFingerprint: null }))).toEqual({
      action: 'fail',
      reason: 'needs-build',
      because: 'absent',
    });
    expect(
      decideInstall(
        ios({ installed: false, installedFingerprint: null, buildIfMissing: true }),
      ),
    ).toEqual({ action: 'install', reason: 'absent' });
  });
});

describe('describeInstallDecision', () => {
  const label = 'Pixel standard (411dp)';

  it('says nothing for a verified keep', () => {
    expect(describeInstallDecision({ action: 'keep', verified: true }, label, 'android')).toBe(
      null,
    );
  });

  it('warns loudly for an unverified keep', () => {
    const text = describeInstallDecision(
      { action: 'keep', verified: false },
      label,
      'android',
    );
    expect(text).toMatch(/cannot be verified/);
    expect(text).toContain(label);
  });

  it('names why it is reinstalling', () => {
    expect(
      describeInstallDecision({ action: 'install', reason: 'stale' }, label, 'android'),
    ).toMatch(/differs from the local build/);
    expect(
      describeInstallDecision({ action: 'install', reason: 'unverified' }, label, 'android'),
    ).toMatch(/could not be verified/);
    expect(
      describeInstallDecision({ action: 'install', reason: 'absent' }, label, 'android'),
    ).toMatch(/not installed/);
  });

  it('tells an Android user to build the APK when there is none', () => {
    expect(
      describeInstallDecision({ action: 'fail', reason: 'no-artifact' }, label, 'android'),
    ).toMatch(/assembleRelease/);
  });

  it('tells an iOS user to pass --build-if-missing, and why', () => {
    const decision: InstallDecision = { action: 'fail', reason: 'needs-build', because: 'stale' };
    const text = describeInstallDecision(decision, 'iPhone 15', 'ios');
    expect(text).toMatch(/--build-if-missing/);
    expect(text).toMatch(/older than the working tree/);
  });
});

describe('buildProvenance', () => {
  it('records the local APK when the harness installed it this run', () => {
    expect(buildProvenance({ action: 'install', reason: 'stale' }, APK, null)).toEqual({
      artifact: APK.path,
      artifactModifiedAt: APK.modifiedAt,
      sha256: HASH_A,
      verified: true,
      installedThisRun: true,
    });
  });

  it('records the local APK on a verified keep', () => {
    expect(buildProvenance({ action: 'keep', verified: true }, APK, HASH_A)).toEqual({
      artifact: APK.path,
      artifactModifiedAt: APK.modifiedAt,
      sha256: HASH_A,
      verified: true,
      installedThisRun: false,
    });
  });

  it('records what is actually on the device on an unverified keep, with no artifact', () => {
    expect(buildProvenance({ action: 'keep', verified: false }, null, HASH_B)).toEqual({
      artifact: null,
      artifactModifiedAt: null,
      sha256: HASH_B,
      verified: false,
      installedThisRun: false,
    });
  });

  it('refuses to describe a failed decision — no shot is taken after one', () => {
    expect(() =>
      buildProvenance({ action: 'fail', reason: 'no-artifact' }, null, null),
    ).toThrow(/failed install decision/);
  });
});

describe('parsePmPathBaseApk', () => {
  it('returns the base.apk path from `pm path` output', () => {
    expect(
      parsePmPathBaseApk(
        'package:/data/app/~~Zx9w==/com.tuckerbrady.theaxiom-Ab3==/base.apk\r\n',
      ),
    ).toBe('/data/app/~~Zx9w==/com.tuckerbrady.theaxiom-Ab3==/base.apk');
  });

  it('picks base.apk out of a split install', () => {
    expect(
      parsePmPathBaseApk(
        [
          'package:/data/app/x/split_config.arm64_v8a.apk',
          'package:/data/app/x/base.apk',
        ].join('\n'),
      ),
    ).toBe('/data/app/x/base.apk');
  });

  it('is null when the package is not installed', () => {
    expect(parsePmPathBaseApk('')).toBe(null);
  });
});

describe('parseSha256sum', () => {
  it('reads the hash from toybox sha256sum output', () => {
    expect(parseSha256sum(`${HASH_A}  /data/app/x/base.apk\n`)).toBe(HASH_A);
  });

  it('lowercases', () => {
    expect(parseSha256sum(`${HASH_A.toUpperCase()}  f`)).toBe(HASH_A);
  });

  it('is null for an error or anything that is not a sha256', () => {
    expect(parseSha256sum('sha256sum: /data/app/x: Permission denied')).toBe(null);
    expect(parseSha256sum('/system/bin/sh: sha256sum: not found')).toBe(null);
    expect(parseSha256sum('')).toBe(null);
  });
});

describe('iOS install markers', () => {
  it('round-trips', () => {
    const markers = withIosInstallMarker({}, 'UDID-1', HASH_A);
    expect(parseIosInstallMarkers(serializeIosInstallMarkers(markers))).toEqual({
      'UDID-1': HASH_A,
    });
  });

  it('replaces one simulator without touching the others', () => {
    const before = { 'UDID-1': HASH_A, 'UDID-2': HASH_A };
    const after = withIosInstallMarker(before, 'UDID-1', HASH_B);
    expect(after).toEqual({ 'UDID-1': HASH_B, 'UDID-2': HASH_A });
    expect(before['UDID-1']).toBe(HASH_A);
  });

  it('treats a missing or corrupt marker file as no markers — which forces a rebuild', () => {
    expect(parseIosInstallMarkers(null)).toEqual({});
    expect(parseIosInstallMarkers('not json')).toEqual({});
    expect(parseIosInstallMarkers('[1,2]')).toEqual({});
    expect(parseIosInstallMarkers('{"UDID-1": 7, "UDID-2": "x"}')).toEqual({ 'UDID-2': 'x' });
  });
});
