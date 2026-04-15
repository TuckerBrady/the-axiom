import { BUILD_INFO } from '../../src/buildInfo';

const pkg = require('../../package.json');

describe('BUILD_INFO', () => {
  it('has the expected shape', () => {
    expect(typeof BUILD_INFO.version).toBe('string');
    expect(typeof BUILD_INFO.sha).toBe('string');
    expect(typeof BUILD_INFO.branch).toBe('string');
    expect(typeof BUILD_INFO.dirty).toBe('boolean');
    expect(typeof BUILD_INFO.builtAt).toBe('string');
  });

  it('version matches package.json version', () => {
    expect(BUILD_INFO.version).toBe(pkg.version);
  });

  it('builtAt is a valid ISO 8601 timestamp', () => {
    const parsed = new Date(BUILD_INFO.builtAt);
    expect(Number.isNaN(parsed.getTime())).toBe(false);
  });

  it('sha is either "unknown" or a short hex string', () => {
    const sha: string = BUILD_INFO.sha;
    expect(sha === 'unknown' || /^[0-9a-f]{7,40}$/.test(sha)).toBe(true);
  });
});
