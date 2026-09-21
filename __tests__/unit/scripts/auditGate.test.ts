/**
 * The dependency gate, tested as the thing CI actually runs: a child process, a report on disk,
 * and an exit code.
 *
 * The three failure modes matter more than the pass. A gate that only knows how to pass is how
 * `npm audit --audit-level=high` ended up red on master for weeks with nobody acting on it.
 */

import { execFileSync } from 'node:child_process';
import { mkdtempSync, writeFileSync, rmSync } from 'node:fs';
import { tmpdir } from 'node:os';
import path from 'node:path';

const GATE = path.join(process.cwd(), 'scripts', 'audit-gate.mjs');

/** A report shaped like `npm audit --json`, carrying one high advisory. */
function reportWith(url: string, pkg = 'image-size') {
  return {
    vulnerabilities: {
      [pkg]: {
        name: pkg,
        severity: 'high',
        via: [{ url, title: `${pkg}: something bad`, severity: 'high', name: pkg }],
      },
      'some-moderate-thing': {
        name: 'some-moderate-thing',
        severity: 'moderate',
        via: [{ url: 'https://example.invalid/moderate', title: 'ignored', severity: 'moderate', name: 'some-moderate-thing' }],
      },
    },
  };
}

function runGate(report: unknown): { code: number; out: string } {
  const dir = mkdtempSync(path.join(tmpdir(), 'audit-gate-'));
  const file = path.join(dir, 'report.json');
  writeFileSync(file, JSON.stringify(report));
  try {
    const out = execFileSync('node', [GATE, '--input', file], { encoding: 'utf8', stdio: 'pipe' });
    return { code: 0, out };
  } catch (e) {
    const err = e as { status?: number; stdout?: string; stderr?: string };
    return { code: err.status ?? 1, out: `${err.stdout ?? ''}${err.stderr ?? ''}` };
  } finally {
    rmSync(dir, { recursive: true, force: true });
  }
}

describe('dependency gate', () => {
  it('passes when every high advisory is allowlisted and in date', () => {
    // the two advisories in the repo's own allowlist
    const report = {
      vulnerabilities: {
        'image-size': {
          name: 'image-size',
          severity: 'high',
          via: [
            { url: 'https://github.com/advisories/GHSA-5p2g-fcmc-qvqq', title: 'jxl', severity: 'high', name: 'image-size' },
            { url: 'https://github.com/advisories/GHSA-w3rx-r6r6-pgpr', title: 'icns', severity: 'high', name: 'image-size' },
          ],
        },
      },
    };
    const { code, out } = runGate(report);
    expect(out).toContain('clean');
    expect(code).toBe(0);
  });

  it('fails on a high advisory nobody has written down', () => {
    const { code, out } = runGate(reportWith('https://github.com/advisories/GHSA-not-on-the-list', 'something-new'));
    expect(code).toBe(1);
    expect(out).toContain('FAILED');
    expect(out).toContain('something-new');
  });

  it('fails when the allowlist has gone stale', () => {
    // nothing high at all: the repo's two entries now match nothing, which has to be noticed
    const { code, out } = runGate({ vulnerabilities: {} });
    expect(code).toBe(1);
    expect(out).toContain('no longer matches anything');
  });

  it('ignores moderate advisories, which the gate is not set to catch', () => {
    const report = {
      vulnerabilities: {
        'image-size': {
          name: 'image-size',
          severity: 'high',
          via: [
            { url: 'https://github.com/advisories/GHSA-5p2g-fcmc-qvqq', title: 'jxl', severity: 'high', name: 'image-size' },
            { url: 'https://github.com/advisories/GHSA-w3rx-r6r6-pgpr', title: 'icns', severity: 'high', name: 'image-size' },
          ],
        },
        'moderate-thing': {
          name: 'moderate-thing',
          severity: 'moderate',
          via: [{ url: 'https://example.invalid/m', title: 'm', severity: 'moderate', name: 'moderate-thing' }],
        },
      },
    };
    expect(runGate(report).code).toBe(0);
  });
});
