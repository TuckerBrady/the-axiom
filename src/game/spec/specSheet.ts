// SE-TM-032 — Spec Sheet statement derivation (Unit C Part 1, semantic layer).
//
// Pure functions that derive STRUCTURED, COGS-voice-free facts from level data.
// These are the semantic statements behind the Spec Sheet panel; the rendered
// RFC-2119 copy (SHALL/SHOULD/MAY/WILL/MUST/CAN, COGS voice) is [PROPOSED] and
// lands in Unit C Part 2 after Tucker sign-off. This module emits the meaning,
// not the words.
//
// Scope (this prompt): WILL (given facts), SHALL (1-star pass conditions), and
// SHOULD (2/3-star guidance). MAY/MUST/CAN are deliberately not derived here
// (SE-TM-031a / Codex-narrative — Unit C Part 2+). Rule-based output SHALL
// (SE-TM-040) is Unit D — the ShallStatement union leaves room for it but this
// module only implements the literal variant.

import type { LevelDefinition, OutputTapeValue, ScoringCategory } from '../types';
import type { TopologyPredicateType } from './topologyValidator';

// ─── Statement types ──────────────────────────────────────────────────────────

// WILL — facts the level hands the Engineer (the givens: tapes, board shape).
export type WillStatement =
  | { type: 'inputTapeLength'; value: number }
  | { type: 'inputTapeValues'; range: [number, number] };

// SHALL — the 1-star pass condition(s). Discriminated union with deliberate
// room for SE-TM-040's future rule-based variant (e.g. 'predicateOutputMatch')
// — Unit D, NOT implemented here. Adding it must not require touching the
// existing variants.
export type ShallStatement =
  // The output tape must exactly match a literal expected tape (the live gate
  // when expectedOutput.length === inputTape.length — SE-TM-002 discriminator).
  | { type: 'literalOutputMatch'; expected: OutputTapeValue[] }
  // At least N pulses must reach the Terminal (live gate for tape levels with a
  // short/documentary expectedOutput — A1-5/A1-6).
  | { type: 'requiredTerminalCount'; value: number }
  // The signal must reach the Terminal (the base condition for stateless,
  // non-tape levels — A1-1/A1-3, and the routing base of A1-4).
  | { type: 'reachTerminal' }
  // A board-topology requirement (SE-TM-035), keyed by the validator's
  // predicate registry. Independent of the output/terminal gate above.
  | { type: 'topology'; predicate: TopologyPredicateType; value: number };

// SHOULD — 2/3-star guidance. Derived from the level's visible scoring
// categories (the per-level signal; the underlying weights are global).
export type ShouldStatement =
  | { type: 'scoringCategory'; category: ScoringCategory };

// ─── Discriminator (shared with Prompt 149 / SE-TM-002) ───────────────────────

/**
 * True when `expectedOutput` is the live win gate: it is present, full-length
 * (one cell per input pulse), and the level has an input tape. Short/
 * documentary expectedOutput (A1-5/A1-6) returns false — those gate on
 * requiredTerminalCount instead.
 */
export function expectedOutputIsLiveGate(level: LevelDefinition): boolean {
  return (
    !!level.inputTape &&
    !!level.expectedOutput &&
    level.expectedOutput.length === level.inputTape.length
  );
}

// ─── WILL ─────────────────────────────────────────────────────────────────────

/**
 * Facts about the tapes/board the level provides. Currently: input tape length
 * and value range. Returns [] for stateless levels (no input tape) — A1-1
 * through A1-4.
 */
export function deriveWillStatements(level: LevelDefinition): WillStatement[] {
  const statements: WillStatement[] = [];
  const tape = level.inputTape;
  if (tape && tape.length > 0) {
    statements.push({ type: 'inputTapeLength', value: tape.length });
    statements.push({
      type: 'inputTapeValues',
      range: [Math.min(...tape), Math.max(...tape)],
    });
  }
  return statements;
}

// ─── SHALL ────────────────────────────────────────────────────────────────────

/**
 * The 1-star pass condition(s). Combines the primary completion gate with any
 * independent topology requirement:
 *   - output live gate  -> literalOutputMatch (A1-7/A1-8)
 *   - tape + requiredTerminalCount (short expectedOutput) -> requiredTerminalCount (A1-5/A1-6)
 *   - otherwise (stateless/non-tape) -> reachTerminal (A1-1..A1-4)
 *   - plus topology SHALL when topologyRequirements is declared (A1-2/A1-4),
 *     appended as an independent statement.
 */
export function deriveShallStatements(level: LevelDefinition): ShallStatement[] {
  const statements: ShallStatement[] = [];

  // Primary completion gate.
  if (expectedOutputIsLiveGate(level)) {
    statements.push({
      type: 'literalOutputMatch',
      expected: level.expectedOutput as OutputTapeValue[],
    });
  } else if (level.inputTape && level.requiredTerminalCount !== undefined) {
    statements.push({
      type: 'requiredTerminalCount',
      value: level.requiredTerminalCount,
    });
  } else {
    statements.push({ type: 'reachTerminal' });
  }

  // Independent topology SHALL (SE-TM-035), if declared.
  const minBends = level.topologyRequirements?.minDirectionChanges;
  if (minBends !== undefined) {
    statements.push({
      type: 'topology',
      predicate: 'minDirectionChanges',
      value: minBends,
    });
  }

  return statements;
}

// ─── SHOULD ───────────────────────────────────────────────────────────────────

// REQ-62 (scoring-algorithm-v2.md, AXM-010): scoringCategoriesVisible is
// removed from LevelDefinition — under v1 it curated which categories were
// relevant per level; under v2 all six are always structurally meaningful
// everywhere, so per-level curation stopped conveying real information.
//
// This fixed subset — not all six — is deliberate: SHOULD_COPY
// (specSheetCopy.ts) is Tucker-approved COGS voice (Design Principle 2),
// and rewriting it to cover completion/investment/diversity honestly is a
// copy decision, not a scoring one — REQ-59's dialogue rewrite track, not
// this mission's. These three reuse pre-existing approved sentences whose
// meaning still holds under v2 (pathIntegrity ~= the old "every piece
// participates" line, discipline ~= the old "reflects your training" line,
// signalDepth ~= the old "make full use of requisitioned pieces" line).
const SHOULD_CATEGORIES: ScoringCategory[] = ['pathIntegrity', 'signalDepth', 'discipline'];

/**
 * 2/3-star guidance. One statement per category in SHOULD_CATEGORIES,
 * for every level — no longer level-specific (see note above).
 */
export function deriveShouldStatements(_level: LevelDefinition): ShouldStatement[] {
  return SHOULD_CATEGORIES.map(category => ({ type: 'scoringCategory', category }));
}
