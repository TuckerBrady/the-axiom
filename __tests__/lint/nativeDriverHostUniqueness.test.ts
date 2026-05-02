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
 * Canonical reference: docs/ANIMATION_RULES.md REQ-A-1, REQ-A-3
 */

import * as fs from 'fs';
import * as path from 'path';

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

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
        const start = Math.max(0, lineNum - 5);
        const end = Math.min(lines.length, lineNum + 2);
        const context = lines.slice(start, end).join('\n');
        return (
          /\?\s*\(/.test(context) ||
          /\?\s*</.test(context) ||
          /&&\s*\(/.test(context) ||
          /&&\s*</.test(context) ||
          /:\s*\(/.test(context) ||
          /:\s*</.test(context) ||
          /\bif\s*\(/.test(context)
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
      fail(
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

  it('[REQ-A-1] passes against current TutorialHUDOverlay.tsx (post-96a4aba)', () => {
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
});
