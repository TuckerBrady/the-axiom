/**
 * SWEEP-B51 H1 (AXM-040): the mixed-fault INSUFFICIENT PULSES line
 * (contract v1.3 R-H1.3, clauses H1-9..H1-11). Source-structure checks over
 * GameplayScreen.tsx, useGameplayModals.ts, GameplayModals.tsx and
 * NARRATIVE.md (UTF-8 reads).
 */
import * as fs from 'fs';
import * as path from 'path';

const repoRoot = path.resolve(__dirname, '../..');
const read = (rel: string) => fs.readFileSync(path.resolve(repoRoot, rel), 'utf-8');

const modalsSrc = read('src/components/gameplay/GameplayModals.tsx');
const screenSrc = read('src/screens/GameplayScreen.tsx');
const hookSrc = read('src/hooks/useGameplayModals.ts');
const narrative = read('docs/NARRATIVE.md');

const MIXED_TAIL =
  'The machine delivered fewer. The configuration held some back, and the route lost the rest before the Terminal. Two faults, not one.';
const MIXED_N = `N pulses were required. ${MIXED_TAIL}`;
const MIXED_SINGULAR = `1 pulse was required. ${MIXED_TAIL}`;

const ROUTE_TAIL =
  'The machine delivered fewer. The route broke before the Terminal. The configuration was never the problem.';
const ROUTE_N = `N pulses were required. ${ROUTE_TAIL}`;
const ROUTE_SINGULAR = `1 pulse was required. ${ROUTE_TAIL}`;
const UNDELIVERED_LINE =
  'The output tape is correct. The signal never reached the Terminal. A result that is not delivered has not been produced.';
const GATED_EXPR =
  '`"${pulseResultData.required} pulse${pulseResultData.required === 1 ? \'\' : \'s\'} ${pulseResultData.required === 1 ? \'was\' : \'were\'} required. The machine delivered fewer. The configuration was not aligned with the input."`';

function between(src: string, startMarker: string, endMarker: string): string {
  const start = src.indexOf(startMarker);
  expect(start).toBeGreaterThan(-1);
  const end = src.indexOf(endMarker, start + startMarker.length);
  expect(end).toBeGreaterThan(start);
  return src.slice(start, end);
}

const insufficientBlock = () => between(modalsSrc, '{/* ── Insufficient Pulses Overlay', '{/* ── Specification Not Met');

describe('SWEEP-B51 H1 mixed-fault diagnostics', () => {
  it('[H1-9] GameplayScreen fails the pulse requirement on insufficientMixed and records reason mixed', () => {
    const decl = screenSrc.match(/const (\w+)\s*=\s*classifyRunFailure\(\{/);
    expect(decl).not.toBeNull();
    const v = decl![1];
    const met = screenSrc.match(/const metPulseRequirement\s*=([^;]*);/);
    expect(met).not.toBeNull();
    for (const outcome of ['insufficientGated', 'insufficientRoute', 'insufficientMixed', 'undelivered', 'void']) {
      expect(met![1]).toContain(`${v} !== '${outcome}'`);
    }

    // The documentary setPulseResultData call: route -> 'route', mixed -> 'mixed'.
    const docCall = screenSrc.match(/setPulseResultData\(\{\s*results: reachedPerPulse,\s*required: requiredCount,[\s\S]*?\}\);/);
    expect(docCall).not.toBeNull();
    const call = docCall![0];
    expect(call).toContain(`${v} === 'insufficientRoute' ? { reason: 'route' as const } : {}`);
    expect(call).toContain(`${v} === 'insufficientMixed' ? { reason: 'mixed' as const } : {}`);

    // A mixed run takes the same branch, and costs a life off the Axiom.
    expect(screenSrc).toMatch(new RegExp(`if \\(!metPulseRequirement && !wrongOutput && ${v} !== 'void'\\)`));
    const branch = between(screenSrc, `if (!metPulseRequirement && !wrongOutput && ${v} !== 'void')`, 'return;');
    expect(branch).toContain('setShowInsufficientPulses(true);');
    expect(branch).toContain('if (!isAxiomLevel) loseLife();');
  });

  it('[H1-9] PulseResultData reason includes mixed', () => {
    expect(hookSrc).toContain("reason?: 'count' | 'undelivered' | 'route' | 'mixed';");
  });

  it('[H1-10] the mixed line is present verbatim with its singular form', () => {
    const block = insufficientBlock();
    expect(block).toMatch(/pulseResultData\.reason === 'mixed'/);
    expect(block).toContain(`'"${MIXED_SINGULAR}"'`);
    expect(block).toContain('`"${pulseResultData.required} pulses were required. ' + MIXED_TAIL + '"`');
    // The mixed branch picks the singular form when one pulse was required.
    const mixed = block.slice(block.indexOf("pulseResultData.reason === 'mixed'"));
    const branch = mixed.slice(0, mixed.indexOf('Two faults, not one."`') + 1);
    expect(branch).toMatch(/pulseResultData\.required === 1\s*\?\s*'"1 pulse was required\./);
  });

  it('[H1-10] the route and gated lines are unchanged', () => {
    const block = insufficientBlock();
    expect(block).toContain(UNDELIVERED_LINE);
    expect(block).toContain(`'"${ROUTE_SINGULAR}"'`);
    expect(block).toContain('`"${pulseResultData.required} pulses were required. ' + ROUTE_TAIL + '"`');
    expect(block).toContain(GATED_EXPR);
    expect(block).toMatch(/pulseResultData\.reason === 'route'/);
  });

  it('[H1-11] NARRATIVE.md carries both mixed lines with their tags', () => {
    const lines = narrative.split(/\r?\n/);
    const idx = (s: string) => {
      const i = lines.indexOf(s);
      expect(i).toBeGreaterThan(-1);
      return i;
    };
    const routeSingularTag = idx('> [insufficient_pulses_route_singular | insufficientPulses | RED | N = 1]');
    const mixedLine = idx(`> "${MIXED_N}"`);
    const mixedTag = idx(
      '> [insufficient_pulses_mixed | insufficientPulses | RED | N is the required pulse count; singular form below. SWEEP-B51 H1-10]',
    );
    const mixedSingularLine = idx(`> "${MIXED_SINGULAR}"`);
    const mixedSingularTag = idx('> [insufficient_pulses_mixed_singular | insufficientPulses | RED | N = 1]');

    // Directly after the route entries, one blank line between entries.
    expect(idx(`> "${ROUTE_N}"`)).toBeLessThan(routeSingularTag);
    expect(mixedLine).toBe(routeSingularTag + 2);
    expect(lines[routeSingularTag + 1]).toBe('');
    expect(mixedTag).toBe(mixedLine + 1);
    expect(lines[mixedTag + 1]).toBe('');
    expect(mixedSingularLine).toBe(mixedTag + 2);
    expect(mixedSingularTag).toBe(mixedSingularLine + 1);

    // Under "Failure diagnostics".
    const section = narrative.indexOf('### Failure diagnostics');
    expect(section).toBeGreaterThan(-1);
    expect(narrative.indexOf(`> "${MIXED_N}"`)).toBeGreaterThan(section);
    // The lines never address the player.
    expect(MIXED_TAIL).not.toMatch(/\byou\b/i);
  });
});
