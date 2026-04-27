# SPEC: Splitter Redesign — Magnet Mechanic
### Sprint 18B | April 2026 | COMPLETE

---

## Problem

The current Splitter uses rotation-based port definitions with no
clear visual language for input vs output sides. It does not
communicate how it works and does not feel good to use.

---

## New Design: Magnet Mechanic

### Visual Design

- Small central circle node in the middle of the piece square
- Two smaller oval "magnets" connected to center by thin wires
- At rest: magnets retracted close to center, wires slack
- When adjacent piece placed: nearest magnet extends and snaps
  to that connection point (~150ms snap animation)
- When both magnets connected: Splitter ready to fire

### Interaction Model

- Input: omnidirectional. Signal enters center node from
  whatever piece is connected. Splitter auto-orients its back
  toward incoming signal source (same auto-orient as Source
  adjacency)
- Outputs: three remaining sides (left, front, right relative
  to back). Magnets auto-connect to first two adjacent pieces
  placed on those sides
- Both magnets fire simultaneously — always. Not selective
- Third adjacent piece on output side is ignored
- Tap action: none. Direction derived from connected pieces
  per plumber model
- Long press: returns to tray (same as all pieces). Magnets
  retract
- Magnet priority: first two adjacent pieces placed on valid
  output sides get magnets. Order of placement determines
  which two

### Animation States

- At rest (no adjacent): magnets retracted, wires slack
- One magnet connected: one extended and locked, wire taut,
  second still retracted and visibly searching
- Two magnets connected (ready): both extended, both wires
  taut, piece ready to fire
- During execution: center node pulses, both wires light up
  simultaneously in beam color, signal exits both paths
- Magnet snap: ~150ms, satisfying, tactile

### Engine Behavior

- Input port: auto-detected from upstream signal direction
  (consistent with omnidirectional piece handling)
- Output ports: the two sides where magnets connected, stored
  as connectedMagnetSides on PlacedPiece
- Execution: signal fires simultaneously to both
  connectedMagnetSides. Both paths continue in parallel
- If only one magnet connected: Splitter blocks. Both outputs
  must exist for split to be valid

### Data Model

Add to PlacedPiece type:
  connectedMagnetSides?: ('north' | 'south' | 'east' | 'west')[]
  Default: []
  Max length: 2
  Populated when adjacent pieces placed on valid output sides

This replaces rotation-based port resolution for Splitter.

---

## What Is Not Changing

- Cost: 15 CR
- Category: Physics piece
- Both outputs always fire simultaneously
- Cannot be used as single-direction piece — blocks if only
  one output connected

---

## Implementation Record

Phase 1 (data model + engine): commit eeb7488
  - connectedMagnetSides on PlacedPiece
  - computeSplitterMagnets in gameStore
  - Dynamic port resolution in engine
  - 12 new unit tests

Phase 2 (PieceIcon magnet visuals): commit e83c900
  - Magnet SVG with extend/retract animations
  - connectedMagnetSides prop pipeline

Phase 3 (beam fork animation): commit 5713cbd
  - partitionBranches step annotation
  - runLinearPath reusable beam primitive
  - Dual-head rAF with syncHeads merge
  - branchTrails state for parallel trail rendering

Known limitation: nested Splitter forks (Splitter feeding into
another Splitter) animate the inner fork as single-path. Only
the first fork in a pulse gets dual-beam treatment. Out of scope
unless a level design requires it.
