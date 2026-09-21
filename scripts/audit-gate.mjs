#!/usr/bin/env node
/**
 * The dependency gate.
 *
 * `npm audit --audit-level=high` is all-or-nothing: one unfixable transitive advisory and the
 * gate is red forever, which is what happened here — every pull request inherited a failing check
 * and people learned to ignore it. A check nobody believes is worse than no check.
 *
 * So the gate still fails on every high and critical advisory, except the ones written down in
 * .audit-allowlist.json with a reason and a date. And it fails three more ways that a blanket
 * `|| true` never would:
 *
 *   - an allowlisted advisory whose review date has passed          (the debt cannot be forgotten)
 *   - an allowlist entry that no longer matches anything            (the list cannot go stale)
 *   - anything high or critical that is not on the list at all      (the original job)
 *
 * Usage:
 *   node scripts/audit-gate.mjs                 run npm audit and judge it
 *   node scripts/audit-gate.mjs --input x.json  judge a saved `npm audit --json` (used by tests)
 */

import { execFileSync } from 'node:child_process';
import { readFileSync, existsSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import path from 'node:path';

const HERE = path.dirname(fileURLToPath(import.meta.url));
const ROOT = path.resolve(HERE, '..');
const ALLOWLIST = path.join(ROOT, '.audit-allowlist.json');
const BAD = new Set(['high', 'critical']);

/** Every high/critical advisory in an `npm audit --json` report, flattened and de-duplicated. */
export function findingsOf(report) {
  const out = new Map();
  for (const [name, node] of Object.entries(report?.vulnerabilities ?? {})) {
    if (!BAD.has(node.severity)) continue;
    for (const via of node.via ?? []) {
      if (typeof via !== 'object' || !via.url) continue;
      out.set(via.url, {
        url: via.url,
        title: via.title ?? '(untitled advisory)',
        severity: via.severity ?? node.severity,
        package: via.name ?? name,
        through: name,
      });
    }
  }
  return [...out.values()].sort((a, b) => a.url.localeCompare(b.url));
}

/**
 * Judge the findings against the allowlist. Pure: the clock is passed in, so the expiry rule is
 * testable without waiting a month.
 */
export function judge(findings, allowlist, now) {
  const entries = allowlist?.allow ?? [];
  const byUrl = new Map(entries.map((e) => [e.advisory, e]));
  const seen = new Set();
  const problems = [];

  for (const f of findings) {
    const entry = byUrl.get(f.url);
    if (!entry) {
      problems.push({
        kind: 'unlisted',
        text: `${f.severity.toUpperCase()} ${f.package} — ${f.title}\n    ${f.url}\n    reached through: ${f.through}`,
      });
      continue;
    }
    seen.add(entry.advisory);
    const until = Date.parse(entry.review_by);
    if (Number.isNaN(until)) {
      problems.push({ kind: 'bad-date', text: `allowlist entry for ${entry.advisory} has an unreadable review_by: ${entry.review_by}` });
    } else if (now > until) {
      problems.push({
        kind: 'expired',
        text: `allowlist entry for ${entry.package} expired on ${entry.review_by}\n    ${entry.advisory}\n    reason given: ${entry.reason}`,
      });
    }
  }

  for (const e of entries) {
    if (!seen.has(e.advisory)) {
      problems.push({
        kind: 'stale',
        text: `allowlist entry for ${e.package} no longer matches anything — delete it\n    ${e.advisory}`,
      });
    }
  }
  return problems;
}

function readReport(argv) {
  const i = argv.indexOf('--input');
  if (i >= 0 && argv[i + 1]) return JSON.parse(readFileSync(argv[i + 1], 'utf8'));
  // npm audit exits non-zero when it finds anything, which is not an error here
  try {
    return JSON.parse(execFileSync('npm', ['audit', '--json'], { cwd: ROOT, encoding: 'utf8', shell: process.platform === 'win32' }));
  } catch (e) {
    if (e.stdout) return JSON.parse(e.stdout);
    throw e;
  }
}

function main(argv) {
  const report = readReport(argv);
  const allowlist = existsSync(ALLOWLIST) ? JSON.parse(readFileSync(ALLOWLIST, 'utf8')) : { allow: [] };
  const findings = findingsOf(report);
  const problems = judge(findings, allowlist, Date.now());

  const allowed = findings.length - problems.filter((p) => p.kind === 'unlisted').length;
  if (problems.length === 0) {
    console.log(`Dependency gate: clean. ${findings.length} high/critical advisor${findings.length === 1 ? 'y' : 'ies'}, all ${allowed} of them allowlisted and in date.`);
    return 0;
  }
  console.error('Dependency gate: FAILED\n');
  for (const p of problems) console.error(`  - ${p.text}\n`);
  console.error(`${problems.length} problem${problems.length === 1 ? '' : 's'}. Fix the dependency, or add it to .audit-allowlist.json with a reason and a review date.`);
  return 1;
}

if (import.meta.url === `file://${process.argv[1]}` || process.argv[1]?.endsWith('audit-gate.mjs')) {
  process.exit(main(process.argv.slice(2)));
}
