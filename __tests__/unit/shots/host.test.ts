import {
  ANIMATION_LOG_FAILURE_PATTERNS,
  HostError,
  assertMacHost,
  scanLogForFailures,
} from '../../../src/shots/host';

describe('assertMacHost', () => {
  it('allows a macOS host', () => {
    expect(() => assertMacHost('darwin')).not.toThrow();
  });

  it('refuses Windows, and says why there is no web fallback', () => {
    expect(() => assertMacHost('win32')).toThrow(HostError);
    expect(() => assertMacHost('win32')).toThrow(/needs a macOS host/);
    expect(() => assertMacHost('win32')).toThrow(/no web fallback/);
  });

  it('refuses Linux too', () => {
    expect(() => assertMacHost('linux')).toThrow(HostError);
  });
});

describe('scanLogForFailures', () => {
  it('finds nothing in a clean log', () => {
    expect(
      scanLogForFailures('info app launched\ninfo beam phase CHARGE\ninfo beam phase LOCK'),
    ).toEqual([]);
  });

  it('catches a native abort', () => {
    const hits = scanLogForFailures('info ok\nTheAxiom crashed: SIGABRT in RCTFatal');
    expect(hits).toHaveLength(1);
    expect(hits[0]).toContain('SIGABRT');
  });

  it('catches the Animated host-swap warning REQ-A-1..A-3 is about', () => {
    const hits = scanLogForFailures(
      'Attempting to run JS driven animation on animated node that has been moved to "native" earlier',
    );
    expect(hits).toHaveLength(1);
  });

  it('catches a fatal exception and a redbox', () => {
    expect(scanLogForFailures('Fatal Exception: NSInternalInconsistencyException')).toHaveLength(1);
    expect(scanLogForFailures('showing redbox for error')).toHaveLength(1);
  });

  it('trims and skips blank lines', () => {
    const hits = scanLogForFailures('\n   \n   SIGABRT here   \n');
    expect(hits).toEqual(['SIGABRT here']);
  });

  it('returns every offending line, not just the first', () => {
    expect(scanLogForFailures('SIGABRT one\nfine\nRCTFatal two')).toHaveLength(2);
  });

  it('keeps a non-empty pattern set — an empty one would pass everything', () => {
    expect(ANIMATION_LOG_FAILURE_PATTERNS.length).toBeGreaterThan(0);
  });
});
