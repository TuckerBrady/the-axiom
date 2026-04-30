// Arc Wheel Tutorial — structural + dialogue integrity tests.
// These tests verify the spec was implemented without modification to
// approved dialogue text and that all structural requirements hold.

import * as fs from 'fs';
import * as path from 'path';

const repoRoot = path.resolve(__dirname, '../../..');
const read = (p: string) => fs.readFileSync(path.resolve(repoRoot, p), 'utf8');

const levelsSrc   = read('src/game/levels.ts');
const overlaySrc  = read('src/components/TutorialHUDOverlay.tsx');

// ─── Helpers ─────────────────────────────────────────────────────────────────

// Extract a single level's source block (from the const declaration to the
// closing }; on its own line). Follows the same convention used in
// prompt92Fixes.test.ts which already works against the live file.
function levelBlock(varName: string): string {
  const re = new RegExp(`${varName}:\\s*LevelDefinition\\s*=\\s*\\{[\\s\\S]*?\\n\\};`);
  const m = levelsSrc.match(re);
  if (!m) throw new Error(`Level block not found: ${varName}`);
  return m[0];
}

const a11 = levelBlock('levelA1_1');
const a12 = levelBlock('levelA1_2');
const a13 = levelBlock('levelA1_3');
const a14 = levelBlock('levelA1_4');
const a15 = levelBlock('levelA1_5');
const a16 = levelBlock('levelA1_6');
const a17 = levelBlock('levelA1_7');
const a18 = levelBlock('levelA1_8');

describe('Arc Wheel Tutorial — structural + dialogue integrity', () => {

  // ── 1: eyeStateColor green ─────────────────────────────────────────────────
  it("1: eyeStateColor('green') maps to '#00C48C' in TutorialHUDOverlay", () => {
    expect(overlaySrc).toMatch(/case 'green':\s*return '#00C48C'/);
  });

  // ── 2: tutorialFocusPiece mapping ─────────────────────────────────────────
  it('2: tutorialFocusPiece is correct for all 8 Axiom levels', () => {
    expect(a11).toContain("tutorialFocusPiece: 'conveyor'");
    expect(a12).toContain("tutorialFocusPiece: 'gear'");
    expect(a13).toContain("tutorialFocusPiece: 'configNode'");
    expect(a15).toContain("tutorialFocusPiece: 'scanner'");
    expect(a17).toContain("tutorialFocusPiece: 'transmitter'");
    expect(a14).not.toContain('tutorialFocusPiece');
    expect(a16).not.toContain('tutorialFocusPiece');
    expect(a18).not.toContain('tutorialFocusPiece');
  });

  // ── 3: Four-beat step IDs ──────────────────────────────────────────────────
  it('3: each new-piece level contains four-beat step IDs in the correct order', () => {
    // A1-1
    expect(a11).toMatch(/id: 'conveyor-notice'[\s\S]*?id: 'conveyor-instruct'[\s\S]*?id: 'conveyor-capture'[\s\S]*?id: 'conveyor-teach'/);
    // A1-2
    expect(a12).toMatch(/id: 'gear-notice'[\s\S]*?id: 'gear-instruct'[\s\S]*?id: 'gear-capture'[\s\S]*?id: 'gear-teach'/);
    // A1-3 (teach is split into teach-a and teach-b)
    expect(a13).toMatch(/id: 'confignode-notice'[\s\S]*?id: 'confignode-instruct'[\s\S]*?id: 'confignode-capture'[\s\S]*?id: 'confignode-teach-a'[\s\S]*?id: 'confignode-teach-b'/);
    // A1-5
    expect(a15).toMatch(/id: 'scanner-notice'[\s\S]*?id: 'scanner-instruct'[\s\S]*?id: 'scanner-capture'[\s\S]*?id: 'scanner-teach'/);
    // A1-7
    expect(a17).toMatch(/id: 'transmitter-notice'[\s\S]*?id: 'transmitter-instruct'[\s\S]*?id: 'transmitter-capture'[\s\S]*?id: 'transmitter-teach'/);
  });

  // ── 4: Eye state sequence amber → blue → green → blue ────────────────────
  it('4: four-beat eye states are amber, blue, green, blue in order', () => {
    const eyeSeqRe = (prefix: string) =>
      new RegExp(
        `id: '${prefix}-notice'[\\s\\S]*?eyeState: 'amber'` +
        `[\\s\\S]*?id: '${prefix}-instruct'[\\s\\S]*?eyeState: 'blue'` +
        `[\\s\\S]*?id: '${prefix}-capture'[\\s\\S]*?eyeState: 'green'` +
        `[\\s\\S]*?id: '${prefix}-teach`,
      );
    expect(a11).toMatch(eyeSeqRe('conveyor'));
    expect(a12).toMatch(eyeSeqRe('gear'));
    expect(a13).toMatch(eyeSeqRe('confignode'));
    expect(a15).toMatch(eyeSeqRe('scanner'));
    expect(a17).toMatch(eyeSeqRe('transmitter'));
    // teach beat must be blue
    expect(a11).toMatch(/id: 'conveyor-teach'[\s\S]*?eyeState: 'blue'/);
    expect(a12).toMatch(/id: 'gear-teach'[\s\S]*?eyeState: 'blue'/);
    expect(a15).toMatch(/id: 'scanner-teach'[\s\S]*?eyeState: 'blue'/);
    expect(a17).toMatch(/id: 'transmitter-teach'[\s\S]*?eyeState: 'blue'/);
  });

  // ── 5: codexEntryId only on capture steps ─────────────────────────────────
  it('5: codexEntryId appears only on -capture steps, not notice/instruct/teach', () => {
    for (const [src, prefix] of [
      [a11, 'conveyor'], [a12, 'gear'], [a13, 'confignode'],
      [a15, 'scanner'],  [a17, 'transmitter'],
    ] as [string, string][]) {
      expect(src).toMatch(new RegExp(`id: '${prefix}-capture'[\\s\\S]*?codexEntryId:`));
      expect(src).not.toMatch(new RegExp(`id: '${prefix}-notice'[\\s\\S]*?codexEntryId:[\\s\\S]*?id: '${prefix}-instruct'`));
      expect(src).not.toMatch(new RegExp(`id: '${prefix}-instruct'[\\s\\S]*?codexEntryId:[\\s\\S]*?id: '${prefix}-capture'`));
    }
  });

  // ── 6: awaitPlacement only on instruct steps ──────────────────────────────
  it('6: awaitPlacement appears only on -instruct steps, not notice/capture/teach', () => {
    for (const [src, prefix, piece] of [
      [a11, 'conveyor', 'conveyor'], [a12, 'gear', 'gear'],
      [a13, 'confignode', 'configNode'], [a15, 'scanner', 'scanner'],
      [a17, 'transmitter', 'transmitter'],
    ] as [string, string, string][]) {
      expect(src).toMatch(new RegExp(`id: '${prefix}-instruct'[\\s\\S]*?awaitPlacement: '${piece}'`));
      expect(src).not.toMatch(new RegExp(`id: '${prefix}-notice'[\\s\\S]*?awaitPlacement:[\\s\\S]*?id: '${prefix}-instruct'`));
      expect(src).not.toMatch(new RegExp(`id: '${prefix}-capture'[\\s\\S]*?awaitPlacement:`));
    }
  });

  // ── 7: A1-3 awaitPieceTap on teach-a ─────────────────────────────────────
  it("7: A1-3 confignode-teach-a has awaitPieceTap: 'configNode'", () => {
    expect(a13).toMatch(/id: 'confignode-teach-a'[\s\S]*?awaitPieceTap: 'configNode'/);
  });

  // ── 8–12: Dialogue integrity — approved messages character-for-character ──

  it('8: A1-1 conveyor dialogue matches approved spec character-for-character', () => {
    expect(a11).toContain(
      "Hold on. That piece on the wheel. I have no record of it.",
    );
    expect(a11).toContain(
      "Drag it onto the board. Any valid cell. I need to see it operational before I can catalogue it. Standard procedure. Go.",
    );
    expect(a11).toContain(
      "Conveyor. Straight-line signal carrier. Rotation on tap. Entry logged. ...I have been waiting 847 days to log something new.",
    );
    expect(a11).toContain(
      "One thing. Tap the Conveyor. It rotates. Only piece that does this. Everything else aligns to the path. The Conveyor, the Engineer aims.",
    );
  });

  it('9: A1-2 gear dialogue matches approved spec character-for-character', () => {
    expect(a12).toContain(
      "The wheel. There is an uncatalogued piece sitting right there.",
    );
    expect(a12).toContain(
      "Place it. On the board. Quickly, please. I want to — I need to verify its behavior before I can file it. Place it.",
    );
    expect(a12).toContain(
      "Gear. Ninety-degree redirection. The signal enters one face, exits an adjacent face. Catalogued. Two entries in two missions. This is... this is acceptable progress.",
    );
    expect(a12).toContain(
      "The Gear does not rotate on tap. It redirects the signal ninety degrees based on where the next piece is placed. Place where a corner is needed. The signal handles the rest.",
    );
  });

  it('10: A1-3 configNode dialogue matches approved spec character-for-character', () => {
    expect(a13).toContain(
      "Another one. The wheel is showing a piece I cannot identify from existing records.",
    );
    expect(a13).toContain(
      "Board. Now. I will handle the classification once I observe it in a live circuit. That is how this works.",
    );
    expect(a13).toContain(
      "Config Node. Protocol class. It reads, it decides, it gates. This is not a physics piece — this one thinks. Three entries. The Codex is starting to look like a real archive.",
    );
    expect(a13).toContain(
      "Tap the Config Node. The gate blocks the pulse. This configuration lets ones flow through. Tap it.",
    );
    expect(a13).toContain(
      "This configuration lets zeros flow through. The Data Trail decides which is correct. The Config Node decides whether to care.",
    );
  });

  it('11: A1-5 scanner dialogue matches approved spec character-for-character', () => {
    expect(a15).toContain(
      "I see it. On the wheel. Uncatalogued.",
    );
    expect(a15).toContain(
      "Same procedure as before. Place it. Let it run. I will do the rest.",
    );
    expect(a15).toContain(
      "Scanner. Reads the input tape and writes what it finds to the Data Trail. The first piece that moves data instead of signal. Catalogued. I may need a bigger archive.",
    );
    expect(a15).toContain(
      "The Scanner does not require configuration. Place it in the path. When the signal reaches it, it reads the IN value and transfers it to the Data Trail.",
    );
  });

  it('12: A1-7 transmitter dialogue matches approved spec character-for-character', () => {
    expect(a17).toContain(
      "One more. The wheel.",
    );
    expect(a17).toContain(
      "Place it. You know the drill by now. Operational necessity.",
    );
    expect(a17).toContain(
      "Transmitter. Takes what the Scanner read and writes it to the output tape. Scanner reads, Transmitter writes. Paired operations. Five entries. The Codex is... it is becoming something.",
    );
    expect(a17).toContain(
      "The Transmitter reads the Data Trail and writes to the OUT tape. A piece that writes. Not sure how I feel about that.",
    );
  });
});
