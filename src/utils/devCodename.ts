// Wordlists drawn from game vocabulary.
// 20 adjectives x 20 nouns = 400 combinations.
// Deterministic: same hash always produces same codename.

const ADJECTIVES = [
  'AMBER', 'STATIC', 'FROZEN', 'SILENT', 'CHARGED',
  'SEVERED', 'HOLLOW', 'DRIFTING', 'LOCKED', 'SCATTERED',
  'DORMANT', 'FRACTURED', 'DARK', 'LIVE', 'SEALED',
  'DIRECT', 'BROKEN', 'FAINT', 'OPEN', 'CLEAR',
];

const NOUNS = [
  'RELAY', 'LATCH', 'CONVEYOR', 'SCANNER', 'SPLITTER',
  'MERGER', 'AMPLIFIER', 'JUNCTION', 'SEQUENCER', 'TRANSMITTER',
  'INVERTER', 'COUNTER', 'CAPACITOR', 'NAVIGATOR', 'RESONATOR',
  'THRESHOLD', 'BRIDGE', 'GEAR', 'BEACON', 'SIGNAL',
];

/**
 * Converts a git commit hash (short or full) into a deterministic
 * two-word codename using game vocabulary.
 *
 * Algorithm:
 *   adjective = parseInt(hash.slice(0, 4), 16) % ADJECTIVES.length
 *   noun      = parseInt(hash.slice(4, 8), 16) % NOUNS.length
 *
 * Falls back to 'UNKNOWN BUILD' if hash is missing or malformed.
 */
export function getDevCodename(hash: string): string {
  if (!hash || hash === 'unknown' || hash.length < 8) {
    return 'UNKNOWN BUILD';
  }
  const adjIndex = parseInt(hash.slice(0, 4), 16) % ADJECTIVES.length;
  const nounIndex = parseInt(hash.slice(4, 8), 16) % NOUNS.length;
  return `${ADJECTIVES[adjIndex]} ${NOUNS[nounIndex]}`;
}
