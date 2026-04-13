import { calculateScore, doesConsequenceTrigger } from '../../src/game/scoring';
import type { ExecutionStep, PlacedPiece } from '../../src/game/types';
import { getDefaultPorts } from '../../src/game/engine';

let stepId = 0;
function makeStep(type: string, success = true, pieceId?: string): ExecutionStep {
  return { pieceId: pieceId ?? `p-${type}-${stepId++}`, type, timestamp: 0, success };
}

function makePlayerPiece(id: string, type: PlacedPiece['type']): PlacedPiece {
  const cat = ['configNode', 'scanner', 'transmitter'].includes(type) ? 'protocol' as const : 'physics' as const;
  return { id, type, category: cat, gridX: 0, gridY: 0, ports: getDefaultPorts(type), rotation: 0, isPrePlaced: false };
}

describe('calculateScore', () => {
  it('returns completion bonus when succeeded', () => {
    const result = calculateScore({
      executionSteps: [makeStep('inputPort', true, 'src'), makeStep('outputPort', true, 'out')],
      placedPieces: [],
      optimalPieces: 0,
      totalTrayPieces: 0,
      discipline: 'systems',
      engageDurationMs: 5000,
      elapsedSeconds: 5,
      succeeded: true,
    });
    expect(result.breakdown.completionBonus).toBe(25);
  });

  it('returns 0 completion bonus when failed', () => {
    const result = calculateScore({
      executionSteps: [makeStep('void', false)],
      placedPieces: [],
      optimalPieces: 0,
      totalTrayPieces: 0,
      discipline: 'systems',
      engageDurationMs: 5000,
      succeeded: false,
    });
    expect(result.breakdown.completionBonus).toBe(0);
  });

  it('machine complexity: full marks when all tray pieces used', () => {
    const result = calculateScore({
      executionSteps: [
        makeStep('inputPort', true, 'src'),
        makeStep('conveyor', true, 'c1'),
        makeStep('conveyor', true, 'c2'),
        makeStep('conveyor', true, 'c3'),
        makeStep('conveyor', true, 'c4'),
        makeStep('outputPort', true, 'out'),
      ],
      placedPieces: [
        makePlayerPiece('c1', 'conveyor'),
        makePlayerPiece('c2', 'conveyor'),
        makePlayerPiece('c3', 'conveyor'),
        makePlayerPiece('c4', 'conveyor'),
      ],
      optimalPieces: 4,
      totalTrayPieces: 4,
      discipline: 'drive',
      engageDurationMs: 5000,
      elapsedSeconds: 5,
      succeeded: true,
    });
    expect(result.breakdown.machineComplexity).toBe(30);
  });

  it('machine complexity: partial marks when fewer tray pieces used', () => {
    const result = calculateScore({
      executionSteps: [
        makeStep('inputPort', true, 'src'),
        makeStep('conveyor', true, 'c1'),
        makeStep('outputPort', true, 'out'),
      ],
      placedPieces: [makePlayerPiece('c1', 'conveyor')],
      optimalPieces: 1,
      totalTrayPieces: 4,
      discipline: 'drive',
      engageDurationMs: 5000,
      elapsedSeconds: 5,
      succeeded: true,
    });
    expect(result.breakdown.machineComplexity).toBeLessThan(30);
  });

  it('protocolPrecision: > 0 when protocol pieces active', () => {
    const result = calculateScore({
      executionSteps: [
        makeStep('inputPort', true, 'src'),
        makeStep('configNode', true, 'cn'),
        makeStep('scanner', true, 'sc'),
        makeStep('outputPort', true, 'out'),
      ],
      placedPieces: [makePlayerPiece('cn', 'configNode'), makePlayerPiece('sc', 'scanner')],
      optimalPieces: 2,
      totalTrayPieces: 2,
      discipline: 'systems',
      engageDurationMs: 5000,
      elapsedSeconds: 5,
      succeeded: true,
    });
    expect(result.breakdown.protocolPrecision).toBeGreaterThan(0);
  });

  it('pathIntegrity: full marks when all placed pieces touched', () => {
    const result = calculateScore({
      executionSteps: [
        makeStep('inputPort', true, 'src'),
        makeStep('conveyor', true, 'c1'),
        makeStep('conveyor', true, 'c2'),
        makeStep('outputPort', true, 'out'),
      ],
      placedPieces: [makePlayerPiece('c1', 'conveyor'), makePlayerPiece('c2', 'conveyor')],
      optimalPieces: 2,
      totalTrayPieces: 2,
      discipline: 'drive',
      engageDurationMs: 5000,
      elapsedSeconds: 5,
      succeeded: true,
    });
    expect(result.breakdown.pathIntegrity).toBe(15);
  });

  it('speedBonus: 10 when elapsed < 10s', () => {
    const result = calculateScore({
      executionSteps: [makeStep('inputPort', true, 'src'), makeStep('outputPort', true, 'out')],
      placedPieces: [],
      optimalPieces: 0,
      totalTrayPieces: 0,
      discipline: 'systems',
      engageDurationMs: 5000,
      elapsedSeconds: 5,
      succeeded: true,
    });
    expect(result.breakdown.speedBonus).toBe(10);
  });

  it('speedBonus: 0 when elapsed > 45s', () => {
    const result = calculateScore({
      executionSteps: [makeStep('inputPort', true, 'src'), makeStep('outputPort', true, 'out')],
      placedPieces: [],
      optimalPieces: 0,
      totalTrayPieces: 0,
      discipline: 'systems',
      engageDurationMs: 60000,
      elapsedSeconds: 60,
      succeeded: true,
    });
    expect(result.breakdown.speedBonus).toBe(0);
  });

  it('3 stars when high total', () => {
    const result = calculateScore({
      executionSteps: [
        makeStep('inputPort', true, 'src'),
        makeStep('conveyor', true, 'c1'),
        makeStep('conveyor', true, 'c2'),
        makeStep('conveyor', true, 'c3'),
        makeStep('conveyor', true, 'c4'),
        makeStep('outputPort', true, 'out'),
      ],
      placedPieces: [
        makePlayerPiece('c1', 'conveyor'),
        makePlayerPiece('c2', 'conveyor'),
        makePlayerPiece('c3', 'conveyor'),
        makePlayerPiece('c4', 'conveyor'),
      ],
      optimalPieces: 4,
      totalTrayPieces: 4,
      discipline: 'drive',
      engageDurationMs: 5000,
      elapsedSeconds: 5,
      succeeded: true,
    });
    // completion(25) + complexity(30) + protocol(0) + integrity(15) + speed(10) = 80
    expect(result.total).toBeGreaterThanOrEqual(80);
    expect(result.stars).toBe(3);
  });
});

describe('doesConsequenceTrigger', () => {
  it('returns false when no consequence', () => {
    expect(doesConsequenceTrigger(undefined, true, 3)).toBe(false);
  });

  it('returns true on failure', () => {
    expect(doesConsequenceTrigger(
      { cogsWarning: 'w', failureEffect: 'f' },
      false, 0,
    )).toBe(true);
  });

  it('returns true when requireThreeStars and stars < 3', () => {
    expect(doesConsequenceTrigger(
      { cogsWarning: 'w', failureEffect: 'f', requireThreeStars: true },
      true, 2,
    )).toBe(true);
  });

  it('returns false when requireThreeStars and stars === 3', () => {
    expect(doesConsequenceTrigger(
      { cogsWarning: 'w', failureEffect: 'f', requireThreeStars: true },
      true, 3,
    )).toBe(false);
  });
});

describe('getCOGSScoreComment', () => {
  const { getCOGSScoreComment, getTutorialCOGSComment } = require('../../src/game/scoring');

  it('returns perfect score line at 100', () => {
    const comment = getCOGSScoreComment(
      { completionBonus: 25, machineComplexity: 30, protocolPrecision: 20, pathIntegrity: 15, speedBonus: 10, efficiency: 25, chainIntegrity: 15, disciplineBonus: 30 },
      'systems', 3, 4, 4,
    );
    expect(comment).toContain('One hundred');
  });

  it('returns line for each star level', () => {
    for (const stars of [3, 2, 1, 0] as const) {
      const comment = getCOGSScoreComment(
        { completionBonus: 10, machineComplexity: 10, protocolPrecision: 5, pathIntegrity: 5, speedBonus: 4, efficiency: 10, chainIntegrity: 5, disciplineBonus: 10 },
        'systems', stars, 2, 4,
      );
      expect(comment).toBeTruthy();
    }
  });

  it('getTutorialCOGSComment returns for all disciplines', () => {
    for (const d of ['systems', 'drive', 'field'] as const) {
      expect(getTutorialCOGSComment(90, d)).toBeTruthy();
      expect(getTutorialCOGSComment(60, d)).toBeTruthy();
      expect(getTutorialCOGSComment(20, d)).toBeTruthy();
    }
  });
});
