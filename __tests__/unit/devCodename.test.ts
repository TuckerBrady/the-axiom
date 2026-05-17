import { getDevCodename } from '../../src/utils/devCodename';

describe('getDevCodename', () => {
  it('returns a two-word uppercase string for a valid hash', () => {
    const result = getDevCodename('f5bc504a');
    expect(result).toMatch(/^[A-Z]+ [A-Z]+$/);
  });

  it('is deterministic — same hash always produces same codename', () => {
    const hash = 'f5bc504a';
    expect(getDevCodename(hash)).toBe(getDevCodename(hash));
  });

  it('produces different codenames for different hashes', () => {
    // These are real project hashes — they must not collide
    const a = getDevCodename('f5bc504a');
    const b = getDevCodename('8c608c5d');
    const c = getDevCodename('0612ada1');
    expect(a).not.toBe(b);
    expect(b).not.toBe(c);
  });

  it('returns UNKNOWN BUILD for missing hash', () => {
    expect(getDevCodename('')).toBe('UNKNOWN BUILD');
    expect(getDevCodename('unknown')).toBe('UNKNOWN BUILD');
  });

  it('returns UNKNOWN BUILD for a hash shorter than 8 characters', () => {
    expect(getDevCodename('abc')).toBe('UNKNOWN BUILD');
  });

  it('adjective index is derived from first 4 hex chars', () => {
    // '0000' = 0 → index 0 → 'AMBER'
    const result = getDevCodename('00001234');
    expect(result.startsWith('AMBER')).toBe(true);
  });

  it('noun index is derived from chars 4-8', () => {
    // '0000' at positions 4-8 → index 0 → 'RELAY'
    const result = getDevCodename('12340000');
    expect(result.endsWith('RELAY')).toBe(true);
  });

  it('result uses only words from the defined wordlists', () => {
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
    const result = getDevCodename('a1b2c3d4');
    const [adj, noun] = result.split(' ');
    expect(ADJECTIVES).toContain(adj);
    expect(NOUNS).toContain(noun);
  });
});
