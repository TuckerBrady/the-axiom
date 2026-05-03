/**
 * Static analysis: REQ-A-1 native-driver single-host invariant
 *
 * This Jest-based file scan fails CI when any Animated.Value declared
 * with useNativeDriver: true is consumed by an Animated.View host
 * that violates REQ-A-1, in either of two forms:
 *
 *   FORM A — multi-host: the value appears in 2+ different
 *   Animated.View hosts that sit in conditional render branches.
 *   Switching branches swaps the parent of the value's binding.
 *   Caused Build 19 (dimOpacity) and Build 20 (glowPulse).
 *
 *   FORM B — conditional-mount of a single host: the value appears
 *   in exactly ONE Animated.View host, but that host is wrapped in
 *   a JSX conditional render expression (`{cond && <Animated.View>}`
 *   or `{cond ? <Animated.View> : ...}`). When the gate flips
 *   false → true, the host's native node remounts; the next
 *   Animated.timing(useNativeDriver: true) attaches the value to
 *   the new host while iOS still holds the prior binding. Caused
 *   Build 21 (calloutOpacity).
 *
 * Design choice: Jest assertion over AST scan (not ESLint custom rule).
 * Rationale:
 *   - The anti-pattern is a cross-branch structural issue, not a
 *     single-node lint warning. ESLint rules operate per-node and
 *     would require a custom scope-tracking visitor that duplicates
 *     the work of a full file scan.
 *   - Jest integrates into the existing npm test pipeline with zero
 *     additional config. An ESLint rule requires plugin registration,
 *     rule export, and .eslintrc changes.
 *   - The scan is fast (~50ms for the entire src/ tree) and produces
 *     clear, actionable error messages citing the exact file, value
 *     name, and line numbers.
 *   - False-positive rate is low: each detector flags a specific
 *     structural pattern, not all Animated usage.
 *
 * Window widening (Build 20 follow-up):
 *   The original conditional-context window was 5 lines lookback /
 *   2 lines lookahead. That window missed the Build 20 glowPulse
 *   violation in TutorialHUDOverlay.tsx because the conditional
 *   branches that wrap each host (`{phase !== 'flying' && portalBox &&`,
 *   `{showPieceGlow && glowCircle &&`) open 18-20 lines above each
 *   `<Animated.View`. Widening lookback to 60 lines closes the gap
 *   for realistically nested JSX while still requiring some
 *   conditional marker to appear near the host.
 *
 * Conditional-mount detection (Build 21 follow-up):
 *   FORM B detection added to catch the single-host conditional-mount
 *   pattern that the FORM A check ignored (uniqueHosts.length === 1).
 *   The detector walks back from each host line up to 40 lines
 *   looking for a JSX conditional opener (`&& (`, `? (`, `: (`,
 *   `&&`, `?`, `:` at end of line). If found and no early-close
 *   occurs between the opener and the host, the host is classified
 *   conditionally-mounted and flagged.
 *
 * Canonical reference: docs/ANIMATION_RULES.md REQ-A-1, REQ-A-3
 */

import * as fs from 'fs';
import * as path from 'path';

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

const CONDITIONAL_LOOKBACK_LINES = 60;
const CONDITIONAL_LOOKAHEAD_LINES = 5;

function collectTsxFiles(dir: string): string[] {
  const results: string[] = [];
  if (!fs.existsSync(dir)) return results;
  const entries = fs.readdirSync(dir, { withFileTypes: true });
  for (const entry of entries) {
    const full = path.join(dir, entry.name);
    if (entry.isDirectory()) {
      if (entry.name === 'node_modules' || entry.name.startsWith('.')) continue;
      results.push(...collectTsxFiles(full));
    } else if (entry.name.endsWith('.tsx')) {
      results.push(full);
    }
  }
  return results;
}

function findNativeDrivenValues(source: string): Set<string> {
  const nativeValues = new Set<string>();
  const animCallRegex = /Animated\.(timing|spring|decay)\(\s*([a-zA-Z_$][\w$.]*)\s*,\s*\{([^}]*)\}/g;
  let match: RegExpExecArray | null;
  while ((match = animCallRegex.exec(source)) !== null) {
    const valueName = match[2];
    const configBlock = match[3];
    if (/useNativeDriver\s*:\s*true/.test(configBlock)) {
      nativeValues.add(valueName);
    }
  }
  return nativeValues;
}

interface Violation {
  file: string;
  valueName: string;
  hostCount: number;
  lineNumbers: number[];
  // 'multi-host' = FORM A (multiple Animated.View hosts in conditional branches)
  // 'conditional-mount' = FORM B (single host wrapped in a conditional render expression)
  form: 'multi-host' | 'conditional-mount';
}

// Heuristic: returns true when the Animated.View at lines[hostLineIdx]
// (0-based) sits inside a JSX conditional render expression
// (`{cond && <Animated.View ...>}` or `{cond ? <Animated.View> : ...}`).
// Walks back up to LOOKBACK lines looking for a conditional opener
// pattern at end of line. If one is found and no early `})` or `)}` or
// `: <Tag>` (else-branch transition) appears between the opener and the
// host, the host is classified conditional-mount.
const CONDITIONAL_MOUNT_LOOKBACK = 40;
function isConditionallyMountedHost(lines: string[], hostLineIdx: number): boolean {
  const openerRegex = /(&&|\?|:)\s*\(?\s*$/;
  for (
    let i = hostLineIdx - 1;
    i >= Math.max(0, hostLineIdx - CONDITIONAL_MOUNT_LOOKBACK);
    i--
  ) {
    const trimmed = lines[i].replace(/\/\/.*$/, '').trimEnd();
    if (!openerRegex.test(trimmed)) continue;

    // Walk forward from the opener line to the host line. Track paren
    // depth and brace depth contributed by intervening lines. If either
    // dips below zero we exited the conditional before reaching the host
    // — not a conditional-mount.
    let parenDelta = 0;
    let braceDelta = 0;
    let bailed = false;
    for (let j = i + 1; j < hostLineIdx; j++) {
      // Strip line comments and string literals to avoid counting punctuation
      // inside them. Block comments are rare on these lines and a partial
      // strip is acceptable for the heuristic.
      const stripped = lines[j]
        .replace(/\/\/.*$/, '')
        .replace(/'(?:\\.|[^\\'])*'/g, "''")
        .replace(/"(?:\\.|[^\\"])*"/g, '""')
        .replace(/`(?:\\.|[^\\`])*`/g, '``');
      for (const ch of stripped) {
        if (ch === '(') parenDelta++;
        else if (ch === ')') parenDelta--;
        else if (ch === '{') braceDelta++;
        else if (ch === '}') braceDelta--;
        if (parenDelta < 0 || braceDelta < 0) {
          bailed = true;
          break;
        }
      }
      if (bailed) break;
    }
    if (!bailed) return true;
  }
  return false;
}

function findHostViolations(filePath: string, source: string): Violation[] {
  const nativeValues = findNativeDrivenValues(source);
  if (nativeValues.size === 0) return [];

  const violations: Violation[] = [];
  const lines = source.split('\n');

  for (const valueName of nativeValues) {
    const hostLines: number[] = [];
    const escapedName = valueName.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
    const valueRegex = new RegExp('\\b' + escapedName + '\\b');

    for (let i = 0; i < lines.length; i++) {
      if (/<Animated\.View\b/.test(lines[i])) {
        // Collect the opening tag text only (between <Animated.View and
        // the closing >). Track brace depth so style objects with nested
        // braces do not prematurely end the tag scan.
        let tagText = '';
        let braceDepth = 0;
        let tagClosed = false;
        const lookAhead = Math.min(i + 30, lines.length);
        for (let j = i; j < lookAhead; j++) {
          const line = lines[j];
          const startK = (j === i) ? line.indexOf('<Animated.View') : 0;
          for (let k = startK; k < line.length; k++) {
            const ch = line[k];
            if (ch === '{') braceDepth++;
            else if (ch === '}') braceDepth--;
            else if (ch === '>' && braceDepth <= 0) {
              tagText += line.substring(startK, k + 1);
              tagClosed = true;
              break;
            }
          }
          if (tagClosed) break;
          tagText += line.substring(startK) + '\n';
        }

        if (valueRegex.test(tagText)) {
          hostLines.push(i + 1);
        }
      }
    }

    const uniqueHosts = [...new Set(hostLines)];

    // FORM A — multi-host with conditional context
    if (uniqueHosts.length > 1) {
      const hasConditionalContext = uniqueHosts.some(lineNum => {
        const start = Math.max(0, lineNum - CONDITIONAL_LOOKBACK_LINES);
        const end = Math.min(lines.length, lineNum + CONDITIONAL_LOOKAHEAD_LINES);
        const context = lines.slice(start, end).join('\n');
        return (
          /\?\s*\(/.test(context) ||
          /\?\s*</.test(context) ||
          /&&\s*\(/.test(context) ||
          /&&\s*</.test(context) ||
          /:\s*\(/.test(context) ||
          /:\s*</.test(context) ||
          /\bif\s*\(/.test(context) ||
          /\.map\s*\(/.test(context)
        );
      });

      if (hasConditionalContext) {
        violations.push({
          file: filePath,
          valueName,
          hostCount: uniqueHosts.length,
          lineNumbers: uniqueHosts,
          form: 'multi-host',
        });
        // Skip FORM B for this value — multi-host is the more severe
        // diagnosis, no need to double-report.
        continue;
      }
    }

    // FORM B — single host wrapped in conditional render expression
    // (e.g. `{cond && <Animated.View ...>}`). The native binding
    // detaches when the gate flips false and reattaches when it
    // flips true, hitting the same parent-swap class as multi-host.
    // Build 21 calloutOpacity / glowOpacity / codexTranslate
    // surfaced this form. See
    // project-docs/REPORTS/build21-sigsegv-investigation.md.
    const conditionallyMounted = uniqueHosts.filter(lineNum =>
      isConditionallyMountedHost(lines, lineNum - 1),
    );
    if (conditionallyMounted.length > 0) {
      violations.push({
        file: filePath,
        valueName,
        hostCount: uniqueHosts.length,
        lineNumbers: conditionallyMounted,
        form: 'conditional-mount',
      });
    }
  }

  return violations;
}

// ---------------------------------------------------------------------------
// Tests
// ---------------------------------------------------------------------------

describe('[REQ-A-1] Native-driver host uniqueness static check', () => {
  const SRC_DIR = path.resolve(__dirname, '../../src');

  it('[REQ-A-1] no native-driven Animated.Value appears in multiple Animated.View hosts across conditional branches in src/', () => {
    const files = collectTsxFiles(SRC_DIR);
    expect(files.length).toBeGreaterThan(0);
    const allViolations: Violation[] = [];
    for (const file of files) {
      const source = fs.readFileSync(file, 'utf-8');
      const violations = findHostViolations(file, source);
      allViolations.push(...violations);
    }
    if (allViolations.length > 0) {
      const report = allViolations
        .map(v => {
          const formLabel =
            v.form === 'multi-host'
              ? 'FORM A (multi-host across conditional branches)'
              : 'FORM B (single host wrapped in conditional render expression)';
          return (
            'VIOLATION in ' + path.relative(SRC_DIR, v.file) + ':\n' +
            '  ' + formLabel + '\n' +
            '  Native-driven value "' + v.valueName + '" appears in ' + v.hostCount +
            ' Animated.View host(s) (flagged lines: ' + v.lineNumbers.join(', ') + ').\n' +
            '  REQ-A-1 requires the host to be unique AND always-mounted.\n' +
            '  Demote the value to useNativeDriver: false, or refactor the\n' +
            '  host to be unconditionally mounted with conditional children.\n' +
            '  See docs/ANIMATION_RULES.md and\n' +
            '  project-docs/REPORTS/build21-sigsegv-investigation.md.'
          );
        })
        .join('\n\n');
      throw new Error(
        'REQ-A-1 violation(s) detected. Each native-driven Animated.Value ' +
        'must be consumed by exactly one always-mounted Animated.View host.\n\n' +
        report,
      );
    }
  });

  it('[REQ-A-1 FORM A] correctly identifies the multi-host anti-pattern in a synthetic fixture', () => {
    const fixturePath = path.resolve(
      __dirname,
      '../__fixtures__/nativeDriverAntiPattern.tsx',
    );
    expect(fs.existsSync(fixturePath)).toBe(true);
    const source = fs.readFileSync(fixturePath, 'utf-8');
    const violations = findHostViolations(fixturePath, source);
    expect(violations.length).toBeGreaterThan(0);
    expect(violations[0].valueName).toBe('dimOpacity');
    expect(violations[0].hostCount).toBe(2);
    expect(violations[0].form).toBe('multi-host');
  });

  it('[REQ-A-1 FORM B] correctly identifies the conditional-mount anti-pattern (Build 21 — calloutOpacity)', () => {
    // Build 21 root cause: a single Animated.View host wrapped in
    // a JSX conditional render expression. Detector must flag even
    // when uniqueHosts.length === 1.
    const synthetic = `
import React, { useRef, useEffect } from 'react';
import { Animated, View } from 'react-native';

function Repro() {
  const phase: 'idle' | 'arrived' = 'arrived';
  const calloutOpacity = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    Animated.timing(calloutOpacity, { toValue: 1, useNativeDriver: true }).start();
  }, []);

  return (
    <View>
      {phase === 'arrived' && (
        <Animated.View style={{ opacity: calloutOpacity }} />
      )}
    </View>
  );
}
`;
    const violations = findHostViolations('synthetic-form-b.tsx', synthetic);
    expect(violations.length).toBe(1);
    expect(violations[0].valueName).toBe('calloutOpacity');
    expect(violations[0].form).toBe('conditional-mount');
    expect(violations[0].hostCount).toBe(1);
  });

  it('[REQ-A-1 FORM B] does NOT flag a single always-mounted host (no false positive on safe pattern)', () => {
    // dimOpacity post-96a4aba and exitOpacity in TutorialHUDOverlay
    // both bind to a single, always-mounted Animated.View. The
    // detector must not flag these.
    const synthetic = `
import React, { useRef, useEffect } from 'react';
import { Animated, View } from 'react-native';

function Repro() {
  const dimOpacity = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    Animated.timing(dimOpacity, { toValue: 1, useNativeDriver: true }).start();
  }, []);

  return (
    <View>
      <Animated.View style={{ opacity: dimOpacity }} />
    </View>
  );
}
`;
    const violations = findHostViolations('synthetic-safe.tsx', synthetic);
    expect(violations.length).toBe(0);
  });

  it('[REQ-A-1] passes against current TutorialHUDOverlay.tsx (post-Build-21 fix)', () => {
    const overlayPath = path.resolve(SRC_DIR, 'components/TutorialHUDOverlay.tsx');
    expect(fs.existsSync(overlayPath)).toBe(true);
    const source = fs.readFileSync(overlayPath, 'utf-8');
    const violations = findHostViolations(overlayPath, source);
    expect(violations).toEqual([]);
  });

  it('[REQ-A-3] scan covers all .tsx files in src/', () => {
    const files = collectTsxFiles(SRC_DIR);
    const tsxWithAnimatedView = files.filter(f => {
      const source = fs.readFileSync(f, 'utf-8');
      return /Animated\.View/.test(source);
    });
    expect(tsxWithAnimatedView.length).toBeGreaterThanOrEqual(1);
    expect(
      tsxWithAnimatedView.some(f => f.includes('TutorialHUDOverlay')),
    ).toBe(true);
  });

  it('[REQ-A-1] widened conditional-context window catches the Build 20 glowPulse pattern', () => {
    // Regression guard: the original 5-line lookback missed the Build 20
    // glowPulse violation because the surrounding conditional opened
    // 18-20 lines above each host. This test verifies the widened window
    // would catch a synthetic reintroduction of that pattern.
    const synthetic = `
import React, { useRef, useEffect } from 'react';
import { Animated, View } from 'react-native';

function Repro() {
  const phase: 'idle' | 'arrived' = 'arrived';
  const showGlow = true;
  const showSpot = true;
  const glowPulse = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    Animated.timing(glowPulse, { toValue: 1, useNativeDriver: true }).start();
  }, []);

  return (
    <View>
      {phase === 'arrived' && (
        <View>
          <Text>spacer line 1</Text>
          <Text>spacer line 2</Text>
          <Text>spacer line 3</Text>
          <Text>spacer line 4</Text>
          <Text>spacer line 5</Text>
          <Text>spacer line 6</Text>
          <Text>spacer line 7</Text>
          <Text>spacer line 8</Text>
          <Text>spacer line 9</Text>
          <Text>spacer line 10</Text>
          <Animated.View style={{ opacity: glowPulse.interpolate({ inputRange: [0, 1], outputRange: [0, 1] }) }} />
        </View>
      )}
      {showGlow && (
        <View>
          <Text>spacer line 1</Text>
          <Text>spacer line 2</Text>
          <Text>spacer line 3</Text>
          <Text>spacer line 4</Text>
          <Text>spacer line 5</Text>
          <Text>spacer line 6</Text>
          <Text>spacer line 7</Text>
          <Text>spacer line 8</Text>
          <Text>spacer line 9</Text>
          <Text>spacer line 10</Text>
          <Animated.View style={{ opacity: glowPulse.interpolate({ inputRange: [0, 1], outputRange: [0, 1] }) }} />
        </View>
      )}
    </View>
  );
}
`;
    const violations = findHostViolations('synthetic.tsx', synthetic);
    expect(violations.length).toBe(1);
    expect(violations[0].valueName).toBe('glowPulse');
    expect(violations[0].hostCount).toBe(2);
    expect(violations[0].form).toBe('multi-host');
  });
});
