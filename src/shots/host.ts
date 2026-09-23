/**
 * Host preconditions and log analysis for the shots harness.
 *
 * Pure on purpose: these are the two judgements the harness makes that a
 * machine with no simulator still needs to be able to test — "can this host
 * run the harness at all", and "did REQ-A-1..A-3 actually pass".
 */

export class HostError extends Error {
  constructor(message: string) {
    super(message);
    this.name = 'HostError';
  }
}

/**
 * Refuse to run anywhere the iOS simulator cannot exist.
 *
 * PROMPT_159 fixes the harness to Maestro against the iOS simulator and
 * gives it no fallback: a browser run cannot answer board-size legibility on
 * a real device width, and a native `Animated.View` host-swap crash cannot
 * appear in a browser at all. So the runner stops rather than producing
 * shots from a build that could not prove anything.
 */
export function assertMacHost(platform: string = process.platform): void {
  if (platform !== 'darwin') {
    throw new HostError(
      `npm run shots needs a macOS host with Xcode and an iOS simulator; this is "${platform}". ` +
        'The harness is deliberately simulator-only: browser shots cannot answer board-size ' +
        'legibility or native animation-host safety, so there is no web fallback.',
    );
  }
}

/**
 * Failure signatures REQ-A-1..A-3 cares about.
 *
 * A Maestro pass with any of these in the device log is not a pass: the
 * whole point of task 4 is that the crash class is native and silent at the
 * flow level.
 */
export const ANIMATION_LOG_FAILURE_PATTERNS: readonly RegExp[] = Object.freeze([
  /SIGABRT/,
  /Fatal Exception/i,
  /RCTFatal/,
  /Attempting to run JS driven animation on animated node that has been moved to "native"/i,
  /Animated: `useNativeDriver`/i,
  /redbox/i,
]);

/** Every log line matching a failure signature, trimmed. */
export function scanLogForFailures(contents: string): string[] {
  const hits: string[] = [];
  for (const line of contents.split('\n')) {
    const trimmed = line.trim();
    if (trimmed.length === 0) continue;
    if (ANIMATION_LOG_FAILURE_PATTERNS.some(pattern => pattern.test(trimmed))) {
      hits.push(trimmed);
    }
  }
  return hits;
}
