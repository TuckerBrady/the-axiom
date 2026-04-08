# Piece Creation Standard

No piece ships without completing every item on this checklist.

## Engine
- [ ] engine.ts case: handles success AND failure paths
- [ ] getInputPorts(piece): rotation-aware input port directions defined
- [ ] getOutputPorts(piece): rotation-aware output port directions defined
- [ ] PieceType union: engine ID added to PieceType in types.ts
- [ ] getPieceCategory(): assigned to Physics or Protocol

## Icon
- [ ] PieceIcon case: complete SVG icon using primary color prop plus
      hardcoded secondary accents that survive board color override
- [ ] Color identity: immediately recognizable at a glance.
      Physics pieces use amber/copper accents.
      Protocol pieces use circuit purple or blue accents.
- [ ] Icon legible at 32x32px (tray) and 52x52px (board)

## Animations
- [ ] Success animation prop: boolean on PieceIcon, communicates what
      the piece is doing to the signal. Duration 150-400ms.
      useNativeDriver: false.
- [ ] Failure state: either general failure (red border, red glow,
      red X) or piece-specific failure animation
- [ ] getBeamColor(pieceType) returns correct color:
      Physics → #F0B429, Protocol → #00D4FF

## Codex Entry
- [ ] Entry exists in Codex data
- [ ] id: matches engine piece type ID
- [ ] name: display name
- [ ] type: 'Physics' | 'Protocol'
- [ ] status: 'unlocked'
- [ ] description: 2-3 sentences. Facts only. No marketing language.
- [ ] cogsNote: one line, COGS voice. Tucker sign-off required.
      Tag [PROPOSED] until approved.
- [ ] firstEncountered: "THE AXIOM — A1-X Level Name"
- [ ] fieldSimulation: PieceSimulation showing input and output behavior

## Tutorial
- [ ] Tutorial step defined in levels.ts if piece appears in a
      tutorial level
- [ ] Step has: id, targetRef, eyeState, message (Tucker sign-off),
      codexEntryId

## Gameplay Integration
- [ ] Appears in at least one level tray
- [ ] That level is solvable with the piece used as intended
- [ ] Free-to-play solvable with zero credits using tray pieces only

## COGS Voice Rule
All proposed COGS lines require Tucker's explicit sign-off before
entering the codebase. Tag all proposed lines [PROPOSED]. This applies
to every piece, every sprint, forever.
