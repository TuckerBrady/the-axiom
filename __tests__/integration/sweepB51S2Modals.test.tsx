/**
 * SWEEP-B51 S2 (AXM-040): failure modals. Source-structure checks over
 * GameplayModals.tsx, GameplayScreen.tsx and NARRATIVE.md (UTF-8 reads).
 */
import * as fs from 'fs';
import * as path from 'path';

const repoRoot = path.resolve(__dirname, '../..');
const read = (rel: string) => fs.readFileSync(path.resolve(repoRoot, rel), 'utf-8');

const modalsSrc = read('src/components/gameplay/GameplayModals.tsx');
const screenSrc = read('src/screens/GameplayScreen.tsx');

const ROUTE_SINGULAR =
  '1 pulse was required. The machine delivered fewer. The route broke before the Terminal. The configuration was never the problem.';
const ROUTE_TAIL =
  'The machine delivered fewer. The route broke before the Terminal. The configuration was never the problem.';
const ROUTE_N =
  'N pulses were required. The machine delivered fewer. The route broke before the Terminal. The configuration was never the problem.';

function between(src: string, startMarker: string, endMarker: string): string {
  const start = src.indexOf(startMarker);
  expect(start).toBeGreaterThan(-1);
  const end = src.indexOf(endMarker, start + startMarker.length);
  expect(end).toBeGreaterThan(start);
  return src.slice(start, end);
}

const insufficientBlock = () => between(modalsSrc, '{/* ── Insufficient Pulses Overlay', '{/* ── Specification Not Met');
const specBlock = () => between(modalsSrc, '{/* ── Specification Not Met', '{/* ── Required Pieces Not Engaged');
const rejectedBlock = () => between(modalsSrc, '{/* ── Required Pieces Not Engaged', '{/* ── Void State Overlay');
const voidBlock = () => between(modalsSrc, '{/* ── Void State Overlay', '{/* ── COGS Teach Card');

describe('SWEEP-B51 S2 failure modals', () => {
  test('[S2-3] GameplayScreen derives wrongOutput and the pulse requirement from classifyRunFailure', () => {
    expect(screenSrc).toMatch(/import \{[^}]*\bclassifyRunFailure\b[^}]*\} from '\.\.\/game\/engagement\/failureOutcome'/);
    const decl = screenSrc.match(/const (\w+)\s*=\s*classifyRunFailure\(\{/);
    expect(decl).not.toBeNull();
    const v = decl![1];
    expect(screenSrc).toMatch(new RegExp(`const wrongOutput\\s*=\\s*${v}\\s*===\\s*'wrongOutput';`));
    const met = screenSrc.match(/const metPulseRequirement\s*=([^;]*);/);
    expect(met).not.toBeNull();
    for (const outcome of ['insufficientGated', 'insufficientRoute', 'undelivered', 'void']) {
      expect(met![1]).toContain(`${v} !== '${outcome}'`);
    }
    expect(met![1]).not.toMatch(/terminalSuccessCount/);
    // A void outcome never takes the INSUFFICIENT PULSES branch.
    expect(screenSrc).toMatch(new RegExp(`if \\(!metPulseRequirement && !wrongOutput && ${v} !== 'void'\\)`));
    // The route cause is recorded for the modal.
    expect(screenSrc).toMatch(/reason: 'route'/);
    expect(screenSrc).toMatch(new RegExp(`${v} === 'insufficientRoute'`));
    // Gated flags come from the classifier module, one per pulse.
    expect(screenSrc).toMatch(/pulses\.map\(pulseWasGated\)/);
  });

  test('[S2-4] the route line is present verbatim with its singular form', () => {
    const block = insufficientBlock();
    expect(block).toMatch(/pulseResultData\.reason === 'route'/);
    expect(block).toContain(`"${ROUTE_SINGULAR}"`);
    expect(block).toContain('"${pulseResultData.required} pulses were required. ' + ROUTE_TAIL + '"');
    // The two existing lines are unchanged.
    expect(block).toContain('The output tape is correct. The signal never reached the Terminal. A result that is not delivered has not been produced.');
    expect(block).toContain('The machine delivered fewer. The configuration was not aligned with the input.');
  });

  test('[S2-5] insufficient, spec-not-met and configuration-rejected show RETRY wired to onWrongOutputRetry', () => {
    for (const block of [insufficientBlock(), specBlock(), rejectedBlock()]) {
      expect(block.match(/onPress=\{onWrongOutputRetry\}/g)?.length).toBe(1);
      expect(block.match(/>RETRY</g)?.length).toBe(1);
      expect(block).not.toContain('TRY AGAIN');
    }
    expect(voidBlock()).toContain('TRY AGAIN');
    expect(voidBlock()).toMatch(/handleReset\(\)/);
  });

  test('[S2-5] none of those three calls handleReset', () => {
    for (const block of [insufficientBlock(), specBlock(), rejectedBlock()]) {
      expect(block).not.toMatch(/handleReset/);
    }
  });

  test('[S2-5] handleWrongOutputRetry closes all five failure modal states', () => {
    const start = screenSrc.indexOf('const handleWrongOutputRetry = useCallback(');
    expect(start).toBeGreaterThan(-1);
    const body = screenSrc.slice(start, screenSrc.indexOf('}, [', start));
    for (const call of [
      'setShowInsufficientPulses(false)',
      'setPulseResultData(null)',
      'setShowSpecNotMet(false)',
      'setSpecNotMetData(null)',
      'setShowRequiredNotEngaged(false)',
      'setShowWrongOutput(false)',
      'setWrongOutputData(null)',
    ]) {
      expect(body).toContain(call);
    }
    // Lives gate unchanged.
    expect(body).toMatch(/if \(lives <= 0\) \{\s*setShowOutOfLives\(true\);/);
  });

  test('[S2-6] VOID TRY AGAIN loses a life only off the Axiom', () => {
    const block = voidBlock();
    const tryAgain = block.slice(0, block.indexOf('TRY AGAIN'));
    const handler = tryAgain.slice(tryAgain.lastIndexOf('onPress={() => {'));
    expect(handler).toMatch(/if \(!isAxiomLevel\) loseLife\(\);/);
    expect(handler.match(/loseLife\(\)/g)?.length).toBe(1);
    expect(handler).toMatch(/handleReset\(\)/);
  });

  test('[S2-7] the pulse chip block renders rows from pulseChipRows with the specified padding', () => {
    expect(modalsSrc).toMatch(/import \{[^}]*\bpulseChipRows\b[^}]*\} from '\.\.\/\.\.\/game\/engagement\/failureOutcome'/);
    const block = insufficientBlock();
    expect(block).toMatch(/pulseChipRows\(pulseResultData\.results\.length\)/);
    expect(block).toMatch(/style=\{styles\.pulseResultsBlock\}/);
    expect(block).toMatch(/style=\{styles\.pulseResultsRow\}/);

    const style = (name: string) => {
      const m = modalsSrc.match(new RegExp(`\\n  ${name}: \\{([^}]*)\\}`));
      expect(m).not.toBeNull();
      return m![1];
    };
    const blockStyle = style('pulseResultsBlock');
    expect(blockStyle).toMatch(/paddingVertical: PULSE_CHIP_BLOCK_PAD,/);
    expect(blockStyle).toMatch(/paddingHorizontal: PULSE_CHIP_BLOCK_PAD \/ 2,/);
    expect(blockStyle).toMatch(/gap: PULSE_CHIP_GAP,/);
    const rowStyle = style('pulseResultsRow');
    expect(rowStyle).toMatch(/flexDirection: 'row',/);
    expect(rowStyle).toMatch(/justifyContent: 'center',/);
    expect(rowStyle).toMatch(/gap: PULSE_CHIP_GAP,/);
    const cellStyle = style('pulseResultCell');
    expect(cellStyle).toMatch(/width: PULSE_CHIP_SIZE,/);
    expect(cellStyle).toMatch(/height: PULSE_CHIP_SIZE,/);
  });

  test('[S2-4] NARRATIVE.md carries the route line verbatim', () => {
    const narrative = read('docs/NARRATIVE.md');
    expect(narrative).toMatch(/### Failure diagnostics/);
    expect(narrative).toContain(ROUTE_N);
    expect(narrative).toContain(ROUTE_SINGULAR);
  });
});
