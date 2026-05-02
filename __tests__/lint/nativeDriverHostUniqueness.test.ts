/**
 * Static analysis: REQ-A-1 native-driver single-host invariant
 *
 * This Jest-based file scan fails CI when any Animated.Value declared
 * with useNativeDriver: true appears in more than one Animated.View
 * host across conditional render branches in the same file.
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
 *   - False-positive rate is low: the heuristic flags the specific
 *     pattern (native-driven value -> multiple Animated.View hosts
 *     inside conditional branches) rather than all Animated usage.
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
        });
      }
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
        .map(v =>
          'VIOLATION in ' + path.relative(SRC_DIR, v.file) + ':\n' +
          '  Native-driven value "' + v.valueName + '" appears in ' + v.hostCount +
          ' Animated.View hosts (lines: ' + v.lineNumbers.join(', ') + ').\n' +
          '  REQ-A-1 requires exactly one host per native-driven value.\n' +
          '  See docs/ANIMATION_RULES.md for refactoring guidance.',
        )
        .join('\n\n');
      throw new Error(
        'REQ-A-1 violation(s) detected. Each native-driven Animated.Value ' +
        'must be consumed by exactly one Animated.View host across all ' +
        'conditional render branches.\n\n' + report,
      );
    }
  });

  it('[REQ-A-1] correctly identifies the anti-pattern in a synthetic fixture', () => {
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
  });

  it('[REQ-A-1] passes against current TutorialHUDOverlay.tsx (post-Build-20 fix)', () => {
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
  });
});
