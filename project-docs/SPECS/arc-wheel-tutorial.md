# ARC WHEEL TUTORIAL — CODEX COLLECTION REWORK FOR AXIOM LEVELS
### RFC 2119 Behavioral Requirements Spec | The Axiom | April 2026

## STATUS: APPROVED

## OVERVIEW

Replace tray-based codex collection with a four-beat COGS character moment using the Arc Wheel. Five Axiom levels introduce new pieces: A1-1 (Conveyor), A1-2 (Gear), A1-3 (Config Node), A1-5 (Scanner), A1-7 (Transmitter).

## FOUR-BEAT SEQUENCE

Every new-piece level presents four beats:
- Beat 1 NOTICE (eye: amber) - COGS notices uncatalogued piece on the Arc Wheel main position
- Beat 2 INSTRUCT (eye: blue) - COGS tells Engineer to place it. Tutorial waits for placement via awaitPlacement field.
- Beat 3 CAPTURE (eye: GREEN) - After placement, COGS orb flies to placed piece's board cell, captures for codex. Green eye = rare genuine excitement.
- Beat 4 TEACH (eye: blue) - COGS teaches piece-specific interaction on the board.

## TYPE CHANGES

TutorialStepEye: add 'green' → 'blue' | 'amber' | 'green'

TutorialStep new optional fields:
- awaitPlacement?: PieceType — Beat 2: pause tutorial until this piece type is placed
- allowPieceTap?: boolean — Beat 4: allow taps to pass through to board
- awaitPieceTap?: PieceType — Beat 4a: wait for tap on this piece type before advancing

LevelDefinition new optional field:
- tutorialFocusPiece?: PieceType — pre-selects this piece at Arc Wheel center on level load

## ARC WHEEL REF FORWARDING

- ArcWheel component MUST accept optional mainNodeRef prop (React.RefObject<View>) attached to center node
- useGameplayTutorial: REMOVE trayConveyorRef, trayGearRef, trayConfigNodeRef, traySplitterRef, trayScannerRef, trayTransmitterRef
- useGameplayTutorial: REMOVE tutorialTrayRefs memoized object and TutorialTrayRefs import
- useGameplayTutorial: ADD arcWheelMainRef
- tutorialTargetRefs: ADD 'arcWheelMain', REMOVE all tray refs
- Support dynamic 'placedPiece' targetRef resolved at runtime when Engineer places the new piece

## NEW CALLBACKS on useGameplayTutorial

- onPiecePlaced(pieceType, gridX, gridY) — GameplayScreen calls when piece placed. Populates placedPiece ref, advances past awaitPlacement if matching.
- onPieceTapped(pieceType) — GameplayScreen calls when placed piece tapped. Advances past awaitPieceTap if matching.

## TUTORIAL OVERLAY CHANGES

- Handle awaitPlacement: dim backdrop non-interactive so board is accessible; tapping dim does NOT advance. Advancement occurs when placement event fires.
- Handle awaitPieceTap: overlay allows board interaction, waits for tap event.
- Handle allowPieceTap: dim backdrop non-interactive so touches reach board; callout message area tappable to advance.
- Green eye state already returns '#00C48C' in eyeStateColor.

## CAPTURE ANIMATION (Beat 3)

- COGS orb animates from current position to placed piece's board cell center
- Use Animated.spring tension 100, friction 12, useNativeDriver false
- Orb color transitions to green during flight
- Codex detail view slides up after orb arrives
- "UNDERSTOOD" dismissal advances to Beat 4

## AXIOM SECTOR GATING

- Arc Wheel MUST appear in Axiom levels (amend piece-selector-system.md REQ-4)
- REQUISITION store MUST NOT appear in Axiom levels
- Axiom Arc Wheel inventory = level's availablePieces only (pre-assigned)

## APPROVED DIALOGUE — DO NOT MODIFY ANY COPY

### A1-1 — CONVEYOR (first piece ever, first placement ever)

tutorialFocusPiece: 'conveyor'

Steps (after existing cogs-intro, board-intro, source-collect, terminal-collect):

```typescript
{
  id: 'conveyor-notice',
  label: 'ARC WHEEL',
  targetRef: 'arcWheelMain',
  eyeState: 'amber',
  message: 'Hold on. That piece on the wheel. I have no record of it.',
},
{
  id: 'conveyor-instruct',
  label: 'ARC WHEEL',
  targetRef: 'arcWheelMain',
  eyeState: 'blue',
  message: 'Drag it onto the board. Any valid cell. I need to see it operational before I can catalogue it. Standard procedure. Go.',
  awaitPlacement: 'conveyor',
},
{
  id: 'conveyor-capture',
  label: 'CONVEYOR',
  targetRef: 'placedPiece',
  eyeState: 'green',
  message: 'Conveyor. Straight-line signal carrier. Rotation on tap. Entry logged. ...I have been waiting 847 days to log something new.',
  codexEntryId: 'conveyor',
},
{
  id: 'conveyor-teach',
  label: 'CONVEYOR',
  targetRef: 'placedPiece',
  eyeState: 'blue',
  message: 'One thing. Tap the Conveyor. It rotates. Only piece that does this. Everything else aligns to the path. The Conveyor, the Engineer aims.',
  allowPieceTap: true,
},
```

A1-1 retains existing batch collection: Source and Terminal codex entries marked silently, Conveyor's codex view shows alsoCollected.

### A1-2 — GEAR

tutorialFocusPiece: 'gear'

Steps (after existing board-intro):

```typescript
{
  id: 'gear-notice',
  label: 'ARC WHEEL',
  targetRef: 'arcWheelMain',
  eyeState: 'amber',
  message: 'The wheel. There is an uncatalogued piece sitting right there.',
},
{
  id: 'gear-instruct',
  label: 'ARC WHEEL',
  targetRef: 'arcWheelMain',
  eyeState: 'blue',
  message: 'Place it. On the board. Quickly, please. I want to — I need to verify its behavior before I can file it. Place it.',
  awaitPlacement: 'gear',
},
{
  id: 'gear-capture',
  label: 'GEAR',
  targetRef: 'placedPiece',
  eyeState: 'green',
  message: 'Gear. Ninety-degree redirection. The signal enters one face, exits an adjacent face. Catalogued. Two entries in two missions. This is... this is acceptable progress.',
  codexEntryId: 'gear',
},
{
  id: 'gear-teach',
  label: 'GEAR',
  targetRef: 'placedPiece',
  eyeState: 'blue',
  message: 'The Gear does not rotate on tap. It redirects the signal ninety degrees based on where the next piece is placed. Place where a corner is needed. The signal handles the rest.',
},
```

Then existing board-resume step.

### A1-3 — CONFIG NODE

tutorialFocusPiece: 'configNode'

Steps (after existing board-intro):

```typescript
{
  id: 'confignode-notice',
  label: 'ARC WHEEL',
  targetRef: 'arcWheelMain',
  eyeState: 'amber',
  message: 'Another one. The wheel is showing a piece I cannot identify from existing records.',
},
{
  id: 'confignode-instruct',
  label: 'ARC WHEEL',
  targetRef: 'arcWheelMain',
  eyeState: 'blue',
  message: 'Board. Now. I will handle the classification once I observe it in a live circuit. That is how this works.',
  awaitPlacement: 'configNode',
},
{
  id: 'confignode-capture',
  label: 'CONFIG NODE',
  targetRef: 'placedPiece',
  eyeState: 'green',
  message: 'Config Node. Protocol class. It reads, it decides, it gates. This is not a physics piece — this one thinks. Three entries. The Codex is starting to look like a real archive.',
  codexEntryId: 'configNode',
},
{
  id: 'confignode-teach-a',
  label: 'CONFIG NODE',
  targetRef: 'placedPiece',
  eyeState: 'blue',
  message: 'Tap the Config Node. The gate blocks the pulse. This configuration lets ones flow through. Tap it.',
  allowPieceTap: true,
  awaitPieceTap: 'configNode',
},
{
  id: 'confignode-teach-b',
  label: 'CONFIG NODE',
  targetRef: 'placedPiece',
  eyeState: 'blue',
  message: 'This configuration lets zeros flow through. The Data Trail decides which is correct. The Config Node decides whether to care.',
},
```

Then existing board-resume step.

### A1-5 — SCANNER

tutorialFocusPiece: 'scanner'

Steps (after existing input-tape-intro, data-trail-intro, board-intro):

```typescript
{
  id: 'scanner-notice',
  label: 'ARC WHEEL',
  targetRef: 'arcWheelMain',
  eyeState: 'amber',
  message: 'I see it. On the wheel. Uncatalogued.',
},
{
  id: 'scanner-instruct',
  label: 'ARC WHEEL',
  targetRef: 'arcWheelMain',
  eyeState: 'blue',
  message: 'Same procedure as before. Place it. Let it run. I will do the rest.',
  awaitPlacement: 'scanner',
},
{
  id: 'scanner-capture',
  label: 'SCANNER',
  targetRef: 'placedPiece',
  eyeState: 'green',
  message: 'Scanner. Reads the input tape and writes what it finds to the Data Trail. The first piece that moves data instead of signal. Catalogued. I may need a bigger archive.',
  codexEntryId: 'scanner',
},
{
  id: 'scanner-teach',
  label: 'SCANNER',
  targetRef: 'placedPiece',
  eyeState: 'blue',
  message: 'The Scanner does not require configuration. Place it in the path. When the signal reaches it, it reads the IN value and transfers it to the Data Trail.',
},
```

Then existing board-resume step.

### A1-7 — TRANSMITTER (NOTE: A1-7, not A1-6)

tutorialFocusPiece: 'transmitter'

Steps (after existing board-intro):

```typescript
{
  id: 'transmitter-notice',
  label: 'ARC WHEEL',
  targetRef: 'arcWheelMain',
  eyeState: 'amber',
  message: 'One more. The wheel.',
},
{
  id: 'transmitter-instruct',
  label: 'ARC WHEEL',
  targetRef: 'arcWheelMain',
  eyeState: 'blue',
  message: 'Place it. You know the drill by now. Operational necessity.',
  awaitPlacement: 'transmitter',
},
{
  id: 'transmitter-capture',
  label: 'TRANSMITTER',
  targetRef: 'placedPiece',
  eyeState: 'green',
  message: 'Transmitter. Takes what the Scanner read and writes it to the output tape. Scanner reads, Transmitter writes. Paired operations. Five entries. The Codex is... it is becoming something.',
  codexEntryId: 'transmitter',
},
{
  id: 'transmitter-teach',
  label: 'TRANSMITTER',
  targetRef: 'placedPiece',
  eyeState: 'blue',
  message: 'The Transmitter reads the Data Trail and writes to the OUT tape. A piece that writes. Not sure how I feel about that.',
},
```

Then existing board-resume step.

### NON-NEW-PIECE LEVELS

- A1-4: No tray refs in current steps (both target boardGrid). Leave unchanged.
- A1-6: No new piece. Leave existing steps unchanged.
- A1-8: No new piece. Leave existing steps unchanged.

### LEVEL-TO-PIECE MAPPING

| Level | New Piece   | tutorialFocusPiece |
|-------|-------------|-------------------|
| A1-1  | Conveyor    | 'conveyor'        |
| A1-2  | Gear        | 'gear'            |
| A1-3  | Config Node | 'configNode'      |
| A1-4  | (none)      | undefined         |
| A1-5  | Scanner     | 'scanner'         |
| A1-6  | (none)      | undefined         |
| A1-7  | Transmitter | 'transmitter'     |
| A1-8  | (none)      | undefined         |

## FILES TO MODIFY

1. src/game/types.ts — TutorialStepEye, TutorialStep new fields, LevelDefinition tutorialFocusPiece
2. src/game/levels.ts — tutorialSteps for A1-1 through A1-8, tutorialFocusPiece
3. src/hooks/useGameplayTutorial.ts — Remove tray refs, add arcWheelMainRef, onPiecePlaced, onPieceTapped
4. src/components/TutorialHUDOverlay.tsx — awaitPlacement/awaitPieceTap/allowPieceTap flows
5. src/components/gameplay/ArcWheel.tsx — mainNodeRef prop
6. src/screens/GameplayScreen.tsx — Wire everything

## TESTS REQUIRED

Write tests covering:
1. TutorialStepEye accepts 'green'
2. TutorialStep accepts new fields without type errors
3. Each new-piece level has four consecutive beats with correct ids ({piece}-notice, -instruct, -capture, -teach)
4. Eye states are amber, blue, green, blue in order for each four-beat
5. Only capture step has codexEntryId
6. Only instruct step has awaitPlacement
7. tutorialFocusPiece correct for each level
8. Removed refs not exported from useGameplayTutorial
9. arcWheelMainRef IS exported
10. eyeStateColor('green') returns '#00C48C'
11. Dialogue integrity: each message matches approved text character-for-character
12. A1-3 has awaitPieceTap: 'configNode' on teach-a step
13. A1-1 Conveyor capture triggers batch collection of Source + Terminal

Run all 4 quality gates before committing. DO NOT MODIFY ANY DIALOGUE TEXT.
