// Pending tests — requiredPieces instance-to-type resolution at the calling boundary.
// Contract: project-docs/SPECS/SPEC_KEPLER_ENGINE.md Section 3.4 (G4).
// Driving levels: K1-6 (Colonist Hub), K1-8 (Transit Gate).
//
// The core evaluateRequiredPieces logic (placed-AND-fired; bypass fails; floor solve
// passes) is already covered by __tests__/unit/keplerRequiredPieces.test.ts
// (REQ-RP-1 .. REQ-RP-5). This file adds ONLY the audit gap 9 requirement: a fired
// piece carrying an Arc Wheel instance id (e.g. `inv-NN`, not a type string) MUST be
// resolved to its TYPE before matching requiredPieces, or K1-6/K1-8 silently report
// zero engaged.
//
// PENDING STATUS: `it.todo` — the exact resolution API (caller signature vs. a
// widened evaluateRequiredPieces) is Phase 3's to finalize; the assertions describe
// the required observable outcome precisely enough to activate.

describe('requiredPieces instance-to-type resolution (3.4.1)', () => {
  it.todo(
    '[REQ-REQPIECES-MAP-1] on K1-6, a real placed-and-fired Splitter and Merger whose ' +
      'instance ids are inventory ids (e.g. inv-03, inv-07) evaluate to result "satisfied" ' +
      '(instance ids are resolved to types before matching requiredPieces)',
  );
  it.todo(
    '[REQ-REQPIECES-MAP-1] on K1-8, real placed-and-fired Bridge + Latch + Splitter + Merger ' +
      'with inventory instance ids evaluate to result "satisfied"',
  );
  it.todo(
    '[REQ-REQPIECES-MAP-1] a fired instance with an inventory id MUST NOT be counted as missing ' +
      'merely because its raw id string does not equal the requiredPieces entry type',
  );
});
