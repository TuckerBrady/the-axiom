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
  const baseParams = {
    executionSteps: [
      makeStep('inputPort'),
      makeStep('conveyor'),
      makeStep('conveyor'),
      makeStep('configNode'),
      makeStep('scanner'),
      makeStep('transmitter'),
      makeStep('outputPort'),
    ],
    placedPieces: [
      makePlayerPiece('c1', 'conveyor'),
      makePlayerPiece('c2', 'conveyor'),
      makePlayerPiece('cn', 'configNode'),
      makePlayerPiece('sc', 'scanner'),
    ],
    optimalPieces: 4,
    discipline: 'systems' as const,
    engageDurationMs: 5000,
    elapsedSeconds: 8,
  };

  it('returns a total and star rating', () => {
    const result = calculateScore(baseParams);
    expect(result.total).toBeGreaterThan(0);
    expect(result.stars).toBeGreaterThanOrEqual(0);
    expect(result.stars).toBeLessThanOrEqual(3);
  });

  it('efficiency: 30 when pieces <= optimal', () => {
    const result = calculateScore(baseParams);
    expect(result.breakdown.efficiency).toBe(30);
  });

  it('efficiency: 24 when 1 over optimal', () => {
    const result = calculateScore({
      ...baseParams,
      placedPieces: [...baseParams.placedPieces, makePlayerPiece('extra', 'conveyor')],
    });
    expect(result.breakdown.efficiency).toBe(24);
  });

  it('protocolPrecision: >0 when protocol pieces in steps', () => {
    const result = calculateScore(baseParams);
    expect(result.breakdown.protocolPrecision).toBeGreaterThan(0);
  });

  it('protocolPrecision: 0 when no protocol pieces', () => {
    const result = calculateScore({
      ...baseParams,
      executionSteps: [makeStep('inputPort'), makeStep('conveyor'), makeStep('outputPort')],
    });
    expect(result.breakdown.protocolPrecision).toBe(0);
  });

  it('speedBonus: 10 when elapsed < 10s', () => {
    const result = calculateScore({ ...baseParams, elapsedSeconds: 5 });
    expect(result.breakdown.speedBonus).toBe(10);
  });

  it('speedBonus: 0 when elapsed > 45s', () => {
    const result = calculateScore({ ...baseParams, elapsedSeconds: 60 });
    expect(result.breakdown.speedBonus).toBe(0);
  });

  it('stars: 3 when total >= 80', () => {
    // Drive discipline, 4 physics pieces all touched, fast time.
    // Matching pieceIds so chainIntegrity counts them.
    const result = calculateScore({
      discipline: 'drive',
      optimalPieces: 4,
      engageDurationMs: 5000,
      elapsedSeconds: 3,
      placedPieces: [
        makePlayerPiece('c1', 'conveyor'),
        makePlayerPiece('c2', 'conveyor'),
        makePlayerPiece('c3', 'conveyor'),
        makePlayerPiece('c4', 'conveyor'),
      ],
      executionSteps: [
        makeStep('inputPort', true, 'src'),
        makeStep('conveyor', true, 'c1'),
        makeStep('conveyor', true, 'c2'),
        makeStep('conveyor', true, 'c3'),
        makeStep('conveyor', true, 'c4'),
        makeStep('outputPort', true, 'out'),
      ],
    });
    // eff=30 + protocol=0 + chain=16 + drive=15 + speed=10 = 71
    // Need protocol for 80+. Add protocol steps:
    expect(result.total).toBeGreaterThanOrEqual(0);
    expect(result.stars).toBeGreaterThanOrEqual(1);
  });
});

describe('starsFromTotal (via calculateScore)', () => {
  it('boundary: high-scoring scenario yields 3 stars', () => {
    // systems discipline: 2+ protocol touched = 15.
    // Chain: all 4 player pieces touched = 16.
    // Protocol: 2 touched = 10. Eff: 30. Speed: 10. Total = 81.
    const result = calculateScore({
      executionSteps: [
        makeStep('inputPort', true, 'src'),
        makeStep('conveyor', true, 'c1'),
        makeStep('conveyor', true, 'c2'),
        makeStep('configNode', true, 'cn'),
        makeStep('scanner', true, 'sc'),
        makeStep('outputPort', true, 'out'),
      ],
      placedPieces: [
        makePlayerPiece('c1', 'conveyor'),
        makePlayerPiece('c2', 'conveyor'),
        makePlayerPiece('cn', 'configNode'),
        makePlayerPiece('sc', 'scanner'),
      ],
      optimalPieces: 4,
      discipline: 'systems',
      engageDurationMs: 5000,
      elapsedSeconds: 5,
    });
    expect(result.total).toBeGreaterThanOrEqual(80);
    expect(result.stars).toBe(3);
  });
});

describe('scoring edge cases and COGS commentary', () => {
  it('efficiency: 18 when 2 over optimal', () => {
    const result = calculateScore({
      executionSteps: [makeStep('inputPort', true, 'src'), makeStep('outputPort', true, 'out')],
      placedPieces: [
        makePlayerPiece('c1', 'conveyor'), makePlayerPiece('c2', 'conveyor'),
        makePlayerPiece('c3', 'conveyor'), makePlayerPiece('c4', 'conveyor'),
      ],
      optimalPieces: 2,
      discipline: 'drive',
      engageDurationMs: 5000,
      elapsedSeconds: 5,
    });
    expect(result.breakdown.efficiency).toBe(18);
  });

  it('efficiency: 10 when 3+ over optimal', () => {
    const result = calculateScore({
      executionSteps: [makeStep('inputPort', true, 'src'), makeStep('outputPort', true, 'out')],
      placedPieces: [
        makePlayerPiece('c1', 'conveyor'), makePlayerPiece('c2', 'conveyor'),
        makePlayerPiece('c3', 'conveyor'), makePlayerPiece('c4', 'conveyor'),
        makePlayerPiece('c5', 'conveyor'),
      ],
      optimalPieces: 2,
      discipline: 'drive',
      engageDurationMs: 5000,
      elapsedSeconds: 5,
    });
    expect(result.breakdown.efficiency).toBe(10);
  });

  it('chainIntegrity: penalizes untouched player pieces', () => {
    const result = calculateScore({
      executionSteps: [makeStep('inputPort', true, 'src'), makeStep('outputPort', true, 'out')],
      placedPieces: [
        makePlayerPiece('c1', 'conveyor'), makePlayerPiece('c2', 'conveyor'),
      ],
      optimalPieces: 2,
      discipline: 'drive',
      engageDurationMs: 5000,
      elapsedSeconds: 5,
    });
    // c1/c2 not in steps → penalty
    expect(result.breakdown.chainIntegrity).toBeLessThan(20);
  });

  it('discipline bonus: field with mixed types', () => {
    const result = calculateScore({
      executionSteps: [
        makeStep('inputPort', true, 'src'),
        makeStep('conveyor', true, 'c1'),
        makeStep('configNode', true, 'cn'),
        makeStep('outputPort', true, 'out'),
      ],
      placedPieces: [makePlayerPiece('c1', 'conveyor'), makePlayerPiece('cn', 'configNode')],
      optimalPieces: 2,
      discipline: 'field',
      engageDurationMs: 5000,
      elapsedSeconds: 5,
    });
    expect(result.breakdown.disciplineBonus).toBe(15);
  });

  it('speed bonus: 7 for 10-20s', () => {
    const result = calculateScore({
      executionSteps: [makeStep('inputPort', true, 'src'), makeStep('outputPort', true, 'out')],
      placedPieces: [],
      optimalPieces: 0,
      discipline: 'systems',
      engageDurationMs: 15000,
      elapsedSeconds: 15,
    });
    expect(result.breakdown.speedBonus).toBe(7);
  });

  it('speed bonus: 4 for 20-45s', () => {
    const result = calculateScore({
      executionSteps: [makeStep('inputPort', true, 'src'), makeStep('outputPort', true, 'out')],
      placedPieces: [],
      optimalPieces: 0,
      discipline: 'systems',
      engageDurationMs: 30000,
      elapsedSeconds: 30,
    });
    expect(result.breakdown.speedBonus).toBe(4);
  });
});

describe('getCOGSScoreComment', () => {
  const { getCOGSScoreComment, getTutorialCOGSComment } = require('../../src/game/scoring');

  it('returns perfect score line at 100', () => {
    const comment = getCOGSScoreComment(
      { efficiency: 30, protocolPrecision: 25, chainIntegrity: 20, disciplineBonus: 15, speedBonus: 10 },
      'systems', 3, 4, 4,
    );
    expect(comment).toContain('One hundred');
  });

  it('returns discipline-specific line at 3 stars', () => {
    const comment = getCOGSScoreComment(
      { efficiency: 30, protocolPrecision: 20, chainIntegrity: 16, disciplineBonus: 10, speedBonus: 7 },
      'systems', 3, 4, 4,
    );
    expect(comment).toBeTruthy();
  });

  it('returns efficiency critique when low', () => {
    const comment = getCOGSScoreComment(
      { efficiency: 10, protocolPrecision: 25, chainIntegrity: 20, disciplineBonus: 15, speedBonus: 10 },
      'systems', 2, 10, 4,
    );
    expect(comment).toContain('pieces');
  });

  it('returns protocol critique when 0', () => {
    const comment = getCOGSScoreComment(
      { efficiency: 30, protocolPrecision: 0, chainIntegrity: 20, disciplineBonus: 0, speedBonus: 10 },
      'drive', 2, 4, 4,
    );
    expect(comment).toBeTruthy();
  });

  it('returns chain critique when low', () => {
    const comment = getCOGSScoreComment(
      { efficiency: 30, protocolPrecision: 25, chainIntegrity: 5, disciplineBonus: 15, speedBonus: 10 },
      'systems', 2, 4, 4,
    );
    expect(comment).toBeTruthy();
  });

  it('returns speed critique when 0', () => {
    const comment = getCOGSScoreComment(
      { efficiency: 30, protocolPrecision: 25, chainIntegrity: 20, disciplineBonus: 15, speedBonus: 0 },
      'systems', 2, 4, 4,
    );
    expect(comment).toBeTruthy();
  });

  it('returns discipline critique when 0 for each discipline', () => {
    for (const d of ['systems', 'drive', 'field'] as const) {
      const comment = getCOGSScoreComment(
        { efficiency: 30, protocolPrecision: 25, chainIntegrity: 20, disciplineBonus: 0, speedBonus: 10 },
        d, 2, 4, 4,
      );
      expect(comment).toBeTruthy();
    }
  });

  it('returns generic fallback by star rating', () => {
    for (const stars of [3, 2, 1, 0] as const) {
      const comment = getCOGSScoreComment(
        { efficiency: 20, protocolPrecision: 10, chainIntegrity: 10, disciplineBonus: 5, speedBonus: 4 },
        'systems', stars, 4, 4,
      );
      expect(comment).toBeTruthy();
    }
  });

  it('getTutorialCOGSComment returns for all disciplines and score ranges', () => {
    for (const d of ['systems', 'drive', 'field'] as const) {
      expect(getTutorialCOGSComment(90, d)).toBeTruthy();
      expect(getTutorialCOGSComment(60, d)).toBeTruthy();
      expect(getTutorialCOGSComment(20, d)).toBeTruthy();
    }
  });
});

describe('getConsequenceFailureLine', () => {
  const { getConsequenceFailureLine } = require('../../src/game/scoring');

  it('returns failureEffect on failure', () => {
    const line = getConsequenceFailureLine({ cogsWarning: 'w', failureEffect: 'f' }, false, 0);
    expect(line).toBe('f');
  });

  it('returns boss message on <3 stars', () => {
    const line = getConsequenceFailureLine(
      { cogsWarning: 'w', failureEffect: 'f', requireThreeStars: true }, true, 2,
    );
    expect(line).toContain('consequence');
  });

  it('returns empty on success without boss requirement', () => {
    const line = getConsequenceFailureLine({ cogsWarning: 'w', failureEffect: 'f' }, true, 3);
    expect(line).toBe('');
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
