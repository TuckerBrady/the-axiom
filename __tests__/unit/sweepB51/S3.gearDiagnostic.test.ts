/**
 * SWEEP-B51 S3 (AXM-038): the Gear jam diagnostic and its COGS lines.
 */
import * as fs from 'fs';
import * as path from 'path';
import { detectGearJam, gearJamLine } from '../../../src/game/engagement/gearJamDiagnostic';
import { handleVoidFailure } from '../../../src/game/engagement/failureHandlers';
import type { VoidFailureParams } from '../../../src/game/engagement/failureHandlers';
import type { ExecutionStep } from '../../../src/game/types';

const NO_EXIT =
  'The Gear had nowhere to turn. It bends the signal ninety degrees, left or right of where it entered. Neither side was listening.';
const TWO_EXITS =
  'The Gear was offered two exits. It takes one, and it will not guess which. Close one side.';

const src = (id: string, ok = true): ExecutionStep => ({ pieceId: id, type: 'source', timestamp: 0, success: ok });
const step = (type: string, success: boolean, extra: Partial<ExecutionStep> = {}): ExecutionStep =>
  ({ pieceId: `${type}-x`, type, timestamp: 0, success, ...extra });
const jam = (reason: 'noExit' | 'twoExits'): ExecutionStep =>
  ({ ...step('gear', false), gearJam: reason });
const voidStep = () => step('void', false);
const terminalOk = () => step('terminal', true);

describe('SWEEP-B51 S3 gear jam diagnostic', () => {
  test('[S3-8] detectGearJam reports the reason for a jammed undelivered pulse', () => {
    expect(detectGearJam([src('s'), jam('noExit'), voidStep()])).toBe('noExit');
    expect(detectGearJam([src('s'), jam('twoExits'), voidStep()])).toBe('twoExits');
    // Multi-pulse: the first jam reason on a pulse that never delivered.
    expect(detectGearJam([
      src('s'), terminalOk(),
      src('s'), jam('twoExits'), voidStep(),
      src('s'), jam('noExit'), voidStep(),
    ])).toBe('twoExits');
    // No jam at all.
    expect(detectGearJam([src('s'), step('conveyor', true), voidStep()])).toBeNull();
    expect(detectGearJam([])).toBeNull();
  });

  test('[S3-8] detectGearJam ignores a jam on a pulse that also delivered', () => {
    expect(detectGearJam([src('s'), jam('noExit'), terminalOk()])).toBeNull();
    expect(detectGearJam([src('s'), jam('twoExits'), terminalOk(), src('s'), terminalOk()])).toBeNull();
  });

  test('[S3-8] gearJamLine returns the verbatim lines', () => {
    expect(gearJamLine('noExit')).toBe(NO_EXIT);
    expect(gearJamLine('twoExits')).toBe(TWO_EXITS);
  });

  test('[S3-9] handleVoidFailure sets the gear line, and null for a wrong-side or plain void', async () => {
    jest.useFakeTimers();
    try {
      const make = (steps: ExecutionStep[]) => {
        const order: string[] = [];
        const params: VoidFailureParams = {
          steps,
          levelId: 'K1-2',
          isAxiomLevel: false,
          failCount: 0,
          findBlownPiece: jest.fn(() => null),
          deletePiece: jest.fn(),
          setBlownCells: jest.fn(),
          setFailCount: jest.fn(),
          setVoidQuoteIndex: jest.fn(),
          setFlashColor: jest.fn(),
          setShowTeachCard: jest.fn(),
          setShowVoid: jest.fn(() => { order.push('showVoid'); }),
          triggerHints: jest.fn(),
          redColor: '#f00',
          setVoidDiagnosticLine: jest.fn((line: string | null) => { order.push(`line:${line}`); }),
        };
        return { params, order };
      };
      const runIt = async (steps: ExecutionStep[]) => {
        const { params, order } = make(steps);
        const p = handleVoidFailure(params);
        await jest.runAllTimersAsync();
        await p;
        return order;
      };

      expect(await runIt([src('s'), jam('noExit'), voidStep()])).toEqual([`line:${NO_EXIT}`, 'showVoid']);
      expect(await runIt([src('s'), jam('twoExits'), voidStep()])).toEqual([`line:${TWO_EXITS}`, 'showVoid']);
      // Wrong-side Terminal takes precedence: no gear line.
      expect(await runIt([
        src('s'), jam('noExit'), step('terminalRejected', false, { side: 'top' }),
      ])).toEqual(['line:null', 'showVoid']);
      // Plain void.
      expect(await runIt([src('s'), step('conveyor', true), voidStep()])).toEqual(['line:null', 'showVoid']);
    } finally {
      jest.useRealTimers();
    }
  });

  test('[S3-10] NARRATIVE.md carries both gear lines with their tags', () => {
    const narrative = fs.readFileSync(path.resolve(__dirname, '../../../docs/NARRATIVE.md'), 'utf-8');
    const section = narrative.slice(narrative.indexOf('### Failure diagnostics'));
    expect(narrative).toContain('### Failure diagnostics');
    const noExitAt = section.indexOf(`"${NO_EXIT}"`);
    const twoExitsAt = section.indexOf(`"${TWO_EXITS}"`);
    expect(noExitAt).toBeGreaterThan(-1);
    expect(twoExitsAt).toBeGreaterThan(-1);
    expect(section.slice(noExitAt).split(/\r?\n/)[1]).toContain('[gear_jam_no_exit | void | RED]');
    expect(section.slice(twoExitsAt).split(/\r?\n/)[1]).toContain('[gear_jam_two_exits | void | RED]');
  });

  test('[S3-11] COMPUTATIONAL_MODEL.md states the Gear rule', () => {
    const model = fs.readFileSync(path.resolve(__dirname, '../../../docs/COMPUTATIONAL_MODEL.md'), 'utf-8');
    expect(model).toContain(
      'Function: Turns the signal 90 degrees. Accepts from any side; leaves through exactly one perpendicular side. Never straight through, never splits. The only Physics piece that turns a corner.',
    );
  });
});
