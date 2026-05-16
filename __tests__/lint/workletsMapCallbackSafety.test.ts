/**
 * Static analysis: REQ-W-1 — no Reanimated entering= builder chain
 * inside a .map() callback.
 *
 * Root cause this rule prevents:
 *   Build 25 crashed on Thread 4 (JS thread) with EXC_BAD_ACCESS /
 *   KERN_INVALID_ADDRESS. Stack trace:
 *
 *     worklets::makeSerializableObject
 *       -> HermesRuntimeImpl::setNativeState
 *       -> GCSymbolID::set
 *
 *   …writing to freed memory during HadesGC concurrent collection.
 *
 *   The trigger is constructing a Reanimated builder chain such as
 *   `FadeInUp.delay(i * 200).duration(400)` inside a `.map()` callback
 *   during a render pass. The intermediate object returned by `.delay()`
 *   is not yet GC-rooted by the time HadesGC (running on a sibling
 *   worker thread) can sweep it. When `.duration()` then calls
 *   makeSerializableObject -> setNativeState, it writes into freed
 *   memory and the process dies.
 *
 * Rule (REQ-W-1, analogous to REQ-A-1):
 *   A Reanimated entering= animation builder chain (FadeIn, FadeInUp,
 *   FadeOut, BounceIn, SlideIn, ZoomIn, or any chained .delay()/.duration()
 *   call on those) MUST NOT be constructed inside a `.map()` callback,
 *   array iteration, or async/Promise callback in render-path code.
 *   Builder chains used in entering= props MUST be declared as
 *   module-scope constants and referenced by index.
 *
 * Detection strategy:
 *   Scan each .tsx/.ts file under src/. For each line that matches a
 *   Reanimated entering= builder chain literal
 *     entering={FadeIn… .delay(…)  OR  entering={FadeIn… .duration(…)
 *   check whether the surrounding ~20 lines (lookback) contain a
 *   `.map(` call. If so, the chain is being constructed inside a map
 *   callback and the file is flagged.
 *
 * Canonical reference: project-docs/REPORTS/build25-crashlog.crash
 */

import * as fs from 'fs';
import * as path from 'path';

const MAP_LOOKBACK_LINES = 20;

const ENTERING_BUILDER_REGEX =
  /entering=\{(FadeIn|FadeInUp|FadeOut|BounceIn|SlideIn|ZoomIn)[^}]*\.(delay|duration)\(/;

function collectSourceFiles(dir: string): string[] {
  const results: string[] = [];
  if (!fs.existsSync(dir)) return results;
  const entries = fs.readdirSync(dir, { withFileTypes: true });
  for (const entry of entries) {
    const full = path.join(dir, entry.name);
    if (entry.isDirectory()) {
      if (entry.name === 'node_modules' || entry.name.startsWith('.')) continue;
      results.push(...collectSourceFiles(full));
    } else if (entry.name.endsWith('.tsx') || entry.name.endsWith('.ts')) {
      results.push(full);
    }
  }
  return results;
}

interface Violation {
  file: string;
  lineNumber: number;
  lineContent: string;
}

function findMapCallbackViolations(
  filePath: string,
  source: string,
): Violation[] {
  const violations: Violation[] = [];
  const lines = source.split('\n');

  for (let i = 0; i < lines.length; i++) {
    const line = lines[i];
    if (!ENTERING_BUILDER_REGEX.test(line)) continue;

    const start = Math.max(0, i - MAP_LOOKBACK_LINES);
    const context = lines.slice(start, i + 1).join('\n');
    if (/\.map\s*\(/.test(context)) {
      violations.push({
        file: filePath,
        lineNumber: i + 1,
        lineContent: line.trim(),
      });
    }
  }

  return violations;
}

describe('[REQ-W-1] No Reanimated entering= builder chain inside .map() callback', () => {
  const SRC_DIR = path.resolve(__dirname, '../../src');

  it('[REQ-W-1] no entering= builder chains constructed inside .map() callbacks in src/', () => {
    const files = collectSourceFiles(SRC_DIR);
    expect(files.length).toBeGreaterThan(0);

    const allViolations: Violation[] = [];
    for (const file of files) {
      const source = fs.readFileSync(file, 'utf-8');
      const violations = findMapCallbackViolations(file, source);
      allViolations.push(...violations);
    }

    if (allViolations.length > 0) {
      const report = allViolations
        .map(v =>
          'VIOLATION in ' + path.relative(SRC_DIR, v.file) + ':' + v.lineNumber + '\n' +
          '  ' + v.lineContent + '\n' +
          '  REQ-W-1 forbids constructing Reanimated entering= builder chains\n' +
          '  inside .map() callbacks. The intermediate builder objects are not\n' +
          '  GC-rooted before HadesGC can sweep them, which corrupts memory\n' +
          '  inside worklets::makeSerializableObject (Build 25 crash).\n' +
          '  Move the chain to a module-scope constant and reference by index.',
        )
        .join('\n\n');
      throw new Error(
        'REQ-W-1 violation(s) detected. Reanimated entering= builder chains ' +
        'must be declared at module scope, not constructed inside .map() callbacks.\n\n' +
        report,
      );
    }
  });

  it('[REQ-W-1] correctly identifies a synthetic FadeInUp chain inside .map()', () => {
    const synthetic = `
import React from 'react';
import Animated, { FadeInUp } from 'react-native-reanimated';

function Stars() {
  return [1, 2, 3].map(i => (
    <Animated.View
      key={i}
      entering={FadeInUp.delay(i * 200).duration(400)}
    />
  ));
}
`;
    const violations = findMapCallbackViolations('synthetic.tsx', synthetic);
    expect(violations.length).toBe(1);
    expect(violations[0].lineContent).toContain('FadeInUp.delay');
  });

  it('[REQ-W-1] does NOT flag a module-scope builder constant referenced from .map()', () => {
    const synthetic = `
import React from 'react';
import Animated, { FadeInUp } from 'react-native-reanimated';

const STAR_ENTERS = [
  FadeInUp.delay(200).duration(400),
  FadeInUp.delay(400).duration(400),
  FadeInUp.delay(600).duration(400),
];

function Stars() {
  return [1, 2, 3].map(i => (
    <Animated.View
      key={i}
      entering={STAR_ENTERS[i - 1]}
    />
  ));
}
`;
    const violations = findMapCallbackViolations('synthetic-safe.tsx', synthetic);
    expect(violations.length).toBe(0);
  });

  it('[REQ-W-1] does NOT flag a single FadeIn().duration() at top level (not inside .map())', () => {
    const synthetic = `
import React from 'react';
import Animated, { FadeIn } from 'react-native-reanimated';

function Card() {
  return (
    <Animated.View entering={FadeIn.duration(300)} />
  );
}
`;
    const violations = findMapCallbackViolations('synthetic-top.tsx', synthetic);
    expect(violations.length).toBe(0);
  });
});
