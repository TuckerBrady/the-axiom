// SE-TM-032 / SE-TM-031 — Spec Sheet COGS-voice copy layer (Unit C Part 2).
//
// Turns the structured, word-free statements from specSheet.ts into the
// RFC-2119 sentences the Engineer reads on the Spec Sheet panel. The labels
// (WILL / SHALL / SHOULD / MAY) are rendered as section headers by the panel;
// this module produces the sentence BODY for each statement.
//
// ── Two hard rules ──────────────────────────────────────────────────────────
// 1. COGS copy. Approved by Tucker 2026-06-14 (CLAUDE.md Design Principle 2).
//    Any future wording change needs fresh sign-off.
// 2. NEVER leak the answer. A `literalOutputMatch` SHALL knows the exact
//    expected tape, but the copy must describe the REQUIREMENT ("match the
//    expected result"), never print the expected values. The Spec Sheet is a
//    second framing of the problem, not a solution key.
//
// The register is deliberately terse and formal — a COGS-authored spec
// document, not conversational COGS. That coldness is on-brand and is what
// sells "this is a real specification" without ever naming systems engineering.

import type { ScoringCategory } from '../types';
import type {
  WillStatement,
  ShallStatement,
  ShouldStatement,
} from './specSheet';

// ─── WILL (the givens) ──────────────────────────────────────────────────────

export function willStatementToCopy(s: WillStatement): string {
  switch (s.type) {
    case 'inputTapeLength':
      return `The Input Tape WILL contain exactly ${s.value} ${
        s.value === 1 ? 'value' : 'values'
      }.`;
    case 'inputTapeValues': {
      const [min, max] = s.range;
      return min === max
        ? `Every value on the Input Tape WILL be ${min}.`
        : `Each value on the Input Tape WILL fall between ${min} and ${max}.`;
    }
  }
}

// ─── SHALL (the 1-star pass conditions) ─────────────────────────────────────

export function shallStatementToCopy(s: ShallStatement): string {
  switch (s.type) {
    case 'literalOutputMatch':
      // Describe the requirement, NOT the expected array (rule 2 above).
      return 'The Output Tape SHALL match the expected result for every value.';
    case 'requiredTerminalCount':
      return s.value === 1
        ? 'The signal SHALL reach the Terminal.'
        : `At least ${s.value} pulses SHALL reach the Terminal.`;
    case 'reachTerminal':
      return 'The signal SHALL reach the Terminal.';
    case 'topology':
      // Only predicate currently is minDirectionChanges.
      return s.value === 1
        ? 'The signal path SHALL change direction at least once.'
        : `The signal path SHALL change direction at least ${s.value} times.`;
  }
}

// ─── SHOULD (2/3-star guidance) ─────────────────────────────────────────────

// REQ-62 (scoring-algorithm-v2.md, AXM-010): the v1 category keys are gone
// (types.ts's ScoringCategory is now the six v2 names). Rather than author
// new COGS copy for completion/investment/diversity — a wording decision
// needing Tucker's sign-off (Design Principle 2), same as REQ-59's dialogue
// rewrite, not this mission's — this map only covers the three categories
// (see specSheet.ts's SHOULD_CATEGORIES) whose v1 sentence still describes
// the v2 category honestly, reused verbatim rather than rewritten:
//   - pathIntegrity was v1's "chainIntegrity" line
//   - discipline was v1's "disciplineBonus" line
//   - signalDepth was v1's "elaboration" line
// completion/investment/diversity intentionally have no SHOULD line yet —
// they're not surfaced in the Spec Sheet until Design provides real copy.
const SHOULD_COPY: Partial<Record<ScoringCategory, string>> = {
  pathIntegrity: 'Every placed piece SHOULD participate in the signal chain.',
  discipline: 'The solution SHOULD reflect the discipline you trained in.',
  signalDepth: 'The machine SHOULD make full use of the pieces you requisitioned.',
};

export function shouldStatementToCopy(s: ShouldStatement): string {
  return SHOULD_COPY[s.category] ?? '';
}

// ─── A1-1 activation hook (SE-TM-033) ───────────────────────────────────────
//
// The one-time COGS line shown the first time A1-1 loads, framed as routing a
// feed that was always on file, NOT new instrumentation. Pointed at the
// (re-enabled) top-right Spec Sheet icon. Approved by Tucker 2026-06-14 —
// the literal "top right" 4th-wall nod is intentional (player-benefit).
export const SPEC_SHEET_ACTIVATION_HOOK: string[] = [
  'I am routing the job’s tasking to your console.',
  'The specifications were always on file. You simply had no reason to read them.',
  'Now you do. Top right, when you want them.',
];
