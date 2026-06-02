/**
 * Regression: tutorial (Axiom) levels must never charge credits, and
 * pre-assigned pieces are always free regardless of sector.
 *
 * Bug (PROMPT_139): GameplayScreen's tray-placement path deducted
 * credits via getPieceCost() without checking whether the level was a
 * tutorial or the piece was pre-assigned. Protocol pieces (Scanner,
 * Config Node, Transmitter) carry non-zero base costs, so the credit
 * gate fired on A1-3/5/6/7/8 — "Insufficient credits" when placing the
 * Scanner on A1-6.
 *
 * The screen identifies tutorial levels by `level.sector === 'axiom'`
 * (the `isAxiomLevel` flag), matching successHandlers.ts. This file
 * pins that effective-cost rule against real level data and guards the
 * source so the predicate cannot silently regress.
 */

import * as fs from 'fs';
import * as path from 'path';
import { getPieceCost } from '../../src/game/types';
import type { LevelDefinition, PieceType } from '../../src/game/types';
import { AXIOM_LEVELS, levelA1_6 } from '../../src/game/levels';

// Mirrors the effective-cost decision in GameplayScreen.handleCanvasTap:
//   const isPreAssigned = level?.availablePieces?.includes(piece) ?? false;
//   const cost = isAxiomLevel || isPreAssigned ? 0 : getPieceCost(piece, discipline);
function effectiveCost(
  level: Pick<LevelDefinition, 'sector' | 'availablePieces'>,
  piece: PieceType,
  discipline: 'systems' | 'drive' | 'field' | null,
): number {
  const isAxiomLevel = level.sector === 'axiom';
  const isPreAssigned = level.availablePieces?.includes(piece) ?? false;
  return isAxiomLevel || isPreAssigned ? 0 : getPieceCost(piece, discipline);
}

describe('tutorial credit charge guard', () => {
  it('Scanner has a non-zero base cost (so the guard is doing real work)', () => {
    expect(getPieceCost('scanner', null)).toBeGreaterThan(0);
    expect(getPieceCost('configNode', null)).toBeGreaterThan(0);
    expect(getPieceCost('transmitter', null)).toBeGreaterThan(0);
  });

  it('placing a Scanner on A1-6 (tutorial) does not deduct credits', () => {
    expect(levelA1_6.sector).toBe('axiom');
    expect(levelA1_6.availablePieces).toContain('scanner');
    expect(effectiveCost(levelA1_6, 'scanner', null)).toBe(0);
    expect(effectiveCost(levelA1_6, 'configNode', 'systems')).toBe(0);
  });

  it('every piece offered on every Axiom level is free', () => {
    for (const level of AXIOM_LEVELS) {
      for (const piece of level.availablePieces) {
        expect(effectiveCost(level, piece, null)).toBe(0);
        expect(effectiveCost(level, piece, 'systems')).toBe(0);
      }
    }
  });

  it('pre-assigned pieces are free even on a non-tutorial level', () => {
    const keplerLike = {
      sector: 'kepler',
      availablePieces: ['scanner'] as PieceType[],
    };
    expect(effectiveCost(keplerLike, 'scanner', null)).toBe(0);
  });

  it('non-tutorial credit logic is unchanged for non-pre-assigned pieces', () => {
    const keplerLike = {
      sector: 'kepler',
      availablePieces: ['conveyor'] as PieceType[],
    };
    expect(effectiveCost(keplerLike, 'scanner', null)).toBe(
      getPieceCost('scanner', null),
    );
    expect(effectiveCost(keplerLike, 'scanner', 'systems')).toBe(
      getPieceCost('scanner', 'systems'),
    );
    expect(effectiveCost(keplerLike, 'scanner', null)).toBeGreaterThan(0);
  });
});

describe('GameplayScreen source keeps the credit guard', () => {
  const screenSrc = fs.readFileSync(
    path.resolve(__dirname, '../../src/screens/GameplayScreen.tsx'),
    'utf8',
  );

  it('skips the charge when the level is Axiom or the piece is pre-assigned', () => {
    expect(screenSrc).toMatch(
      /const cost = isAxiomLevel \|\| isPreAssigned \? 0 : getPieceCost\(/,
    );
    expect(screenSrc).toMatch(
      /const isPreAssigned = level\?\.availablePieces\?\.includes\(selectedPieceFromTray\) \?\? false;/,
    );
  });
});
