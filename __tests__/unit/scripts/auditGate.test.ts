/**
 * The dependency gate, tested as the thing CI actually runs: a child process, a report on disk,
 * and an exit code.
 *
 * The three failure modes matter more than the pass. A gate that only knows how to pass is how
 * `npm audit --audit-level=high` ended up red on master for weeks with nobody acting on it.
 *
 * Each test brings its own allowlist (`--allowlist`), so the tests do not change meaning when the
 * repo's real `.audit-allowlist.json` does. That file is empty since #51 cleared the high findings
 * on master (AXM-012).
 */

import { execFileSync } from 'node:child_process';
import { mkdtempSync, writeFileSync, rmSync, readFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import path from 'node:path';

const GATE = path.join(process.cwd(), 'scripts', 'audit-gate.mjs');

const JXL = 'https://github.com/advisories/GHSA-5p2g-fcmc-qvqq';
const ICNS = 'https://github.com/advisories/GHSA-w3rx-r6r6-pgpr';

/** An allowlist naming the two image-size advisories, reviewable until `reviewBy`. */
function allowlistFor(reviewBy = '2099-01-01') {
  return {
    allow: [
      { advisory: JXL, package: 'image-size', reason: 'fixture', review_by: reviewBy },
      { advisory: ICNS, package: 'image-size', reason: 'fixture', review_by: reviewBy },
    ],
  };
}

/** A report carrying both image-size advisories, optionally alongside other entries. */
function imageSizeReport(extra: Record<string, unknown> = {}) {
  return {
    vulnerabilities: {
      'image-size': {
        name: 'image-size',
        severity: 'high',
        via: [
          { url: JXL, title: 'jxl', severity: 'high', name: 'image-size' },
          { url: ICNS, title: 'icns', severity: 'high', name: 'image-size' },
        ],
      },
      ...extra,
    },
  };
}

/** A report shaped like `npm audit --json`, carrying one high advisory. */
function reportWith(url: string, pkg: string) {
  return {
    vulnerabilities: {
      [pkg]: {
        name: pkg,
        severity: 'high',
        via: [{ url, title: `${pkg}: something bad`, severity: 'high', name: pkg }],
      },
    },
  };
}

function runGate(report: unknown, allowlist: unknown): { code: number; out: string } {
  const dir = mkdtempSync(path.join(tmpdir(), 'audit-gate-'));
  const reportFile = path.join(dir, 'report.json');
  const allowFile = path.join(dir, 'allow.json');
  writeFileSync(reportFile, JSON.stringify(report));
  writeFileSync(allowFile, JSON.stringify(allowlist));
  try {
    const out = execFileSync('node', [GATE, '--input', reportFile, '--allowlist', allowFile], { encoding: 'utf8', stdio: 'pipe' });
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
    const { code, out } = runGate(imageSizeReport(), allowlistFor());
    expect(out).toContain('clean');
    expect(code).toBe(0);
  });

  it('passes a clean report against an empty allowlist (master since #51)', () => {
    const { code, out } = runGate({ vulnerabilities: {} }, { allow: [] });
    expect(out).toContain('clean');
    expect(code).toBe(0);
  });

  it('fails on a high advisory nobody has written down', () => {
    const { code, out } = runGate(reportWith('https://github.com/advisories/GHSA-not-on-the-list', 'something-new'), { allow: [] });
    expect(code).toBe(1);
    expect(out).toContain('FAILED');
    expect(out).toContain('something-new');
  });

  it('fails when the allowlist has gone stale', () => {
    // nothing high at all: both entries now match nothing, which has to be noticed
    const { code, out } = runGate({ vulnerabilities: {} }, allowlistFor());
    expect(code).toBe(1);
    expect(out).toContain('no longer matches anything');
  });

  it('fails when an allowlisted advisory is past its review date', () => {
    const { code, out } = runGate(imageSizeReport(), allowlistFor('2020-01-01'));
    expect(code).toBe(1);
    expect(out).toContain('expired on 2020-01-01');
  });

  it('ignores moderate advisories, which the gate is not set to catch', () => {
    const report = imageSizeReport({
      'moderate-thing': {
        name: 'moderate-thing',
        severity: 'moderate',
        via: [{ url: 'https://example.invalid/m', title: 'm', severity: 'moderate', name: 'moderate-thing' }],
      },
    });
    expect(runGate(report, allowlistFor()).code).toBe(0);
  });

  it("the repo's own allowlist is well-formed", () => {
    const repoList = JSON.parse(readFileSync(path.join(process.cwd(), '.audit-allowlist.json'), 'utf8'));
    expect(Array.isArray(repoList.allow)).toBe(true);
    for (const e of repoList.allow) {
      expect(typeof e.advisory).toBe('string');
      expect(typeof e.reason).toBe('string');
      expect(Number.isNaN(Date.parse(e.review_by))).toBe(false);
    }
  });
});
