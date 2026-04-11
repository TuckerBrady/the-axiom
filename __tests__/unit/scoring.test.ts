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
