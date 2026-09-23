import {
  ANDROID_LOG_FAILURE_PATTERNS,
  emulatorSerialForAvd,
  parseAdbDevices,
  scanLogcatForFailures,
} from '../../../src/shots/androidLog';

describe('parseAdbDevices', () => {
  it('parses a normal listing', () => {
    expect(
      parseAdbDevices('List of devices attached\nemulator-5554\tdevice\n'),
    ).toEqual([{ serial: 'emulator-5554', state: 'device' }]);
  });

  it('tolerates the cold-start daemon preamble', () => {
    const stdout = [
      '* daemon not running; starting now at tcp:5037',
      '* daemon started successfully',
      'List of devices attached',
      'emulator-5554\tdevice',
      'emulator-5556\toffline',
      '',
    ].join('\n');
    expect(parseAdbDevices(stdout)).toEqual([
      { serial: 'emulator-5554', state: 'device' },
      { serial: 'emulator-5556', state: 'offline' },
    ]);
  });

  it('returns nothing when no device is attached', () => {
    expect(parseAdbDevices('List of devices attached\n\n')).toEqual([]);
  });
});

describe('emulatorSerialForAvd', () => {
  const running = [
    { serial: 'emulator-5554', avd: 'axiom_compact' },
    { serial: 'emulator-5556', avd: 'axiom_standard' },
  ];

  it('finds the serial hosting an AVD', () => {
    expect(emulatorSerialForAvd(running, 'axiom_standard')).toBe('emulator-5556');
  });

  it('is null when that AVD is not up', () => {
    expect(emulatorSerialForAvd(running, 'axiom_large')).toBeNull();
  });
});

describe('scanLogcatForFailures', () => {
  it('catches a native crash of our own process', () => {
    const log = [
      '09-20 20:15:01.100 E/AndroidRuntime( 123): FATAL EXCEPTION: main',
      '09-20 20:15:01.100 F/libc    ( 123): Fatal signal 6 (SIGABRT)',
    ].join('\n');
    expect(scanLogcatForFailures(log)).toHaveLength(2);
  });

  it('catches an ANR in our package and ignores one in another app', () => {
    const ours = 'ActivityManager: ANR in com.tuckerbrady.theaxiom';
    const theirs = 'ActivityManager: ANR in com.example.other';
    expect(scanLogcatForFailures(ours)).toHaveLength(1);
    expect(scanLogcatForFailures(theirs)).toHaveLength(0);
  });

  it('catches the JS-driven-animation warning', () => {
    const log =
      'ReactNativeJS: Attempting to run JS driven animation on animated node ' +
      'that has been moved to "native" earlier by starting an animation with ' +
      'useNativeDriver: true';
    expect(scanLogcatForFailures(log)).toHaveLength(1);
  });

  it('is quiet on an ordinary log', () => {
    const log = [
      '09-20 20:15:01.100 I/ReactNativeJS( 123): Running application',
      '09-20 20:15:02.200 D/Choreographer( 123): Skipped 31 frames!',
      '',
    ].join('\n');
    expect(scanLogcatForFailures(log)).toEqual([]);
  });

  it('trims what it returns so a report line is readable', () => {
    expect(scanLogcatForFailures('    FATAL EXCEPTION: main   ')).toEqual([
      'FATAL EXCEPTION: main',
    ]);
  });

  it('does not carry the iOS-only REQ-A-1..A-3 crash signatures', () => {
    // Android is deliberately NOT reported against REQ-A-1..A-3, so the
    // Android pattern list must not claim to cover the iOS crash class.
    const source = ANDROID_LOG_FAILURE_PATTERNS.map(String).join(' ');
    expect(source).not.toMatch(/RCTFatal/);
  });
});
