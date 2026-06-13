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

  // ── 2: tutorialFocusPiece field is gone from all Axiom levels ─────────────
  // PROMPT_124 removed the field; the per-piece tray refs (trayConveyor,
  // trayGear, trayConfigNode, trayScanner, trayTransmitter) carry the
  // identity instead via targetRef on each step.
  it('2: tutorialFocusPiece is absent from all 8 Axiom levels and the per-piece targetRef is wired correctly', () => {
    for (const block of [a11, a12, a13, a14, a15, a16, a17, a18]) {
      expect(block).not.toContain('tutorialFocusPiece');
    }
    // PROMPT_140: A1 piece intros reveal the Codex inline from the tray.
    // No placement gate, no placedPiece capture beat. Both the notice and
    // the named-reveal beats target the tray slot.
    expect(a11).toMatch(/id: 'conveyor-collect'[\s\S]*?targetRef: 'trayConveyor'/);
    expect(a11).toMatch(/id: 'conveyor-reveal'[\s\S]*?targetRef: 'trayConveyor'/);
    expect(a12).toMatch(/id: 'gear-notice'[\s\S]*?targetRef: 'trayGear'/);
    expect(a12).toMatch(/id: 'gear-reveal'[\s\S]*?targetRef: 'trayGear'/);
    expect(a13).toMatch(/id: 'confignode-notice'[\s\S]*?targetRef: 'trayConfigNode'/);
    expect(a13).toMatch(/id: 'confignode-reveal'[\s\S]*?targetRef: 'trayConfigNode'/);
    expect(a15).toMatch(/id: 'scanner-notice'[\s\S]*?targetRef: 'trayScanner'/);
    expect(a15).toMatch(/id: 'scanner-reveal'[\s\S]*?targetRef: 'trayScanner'/);
    expect(a17).toMatch(/id: 'transmitter-notice'[\s\S]*?targetRef: 'trayTransmitter'/);
    expect(a17).toMatch(/id: 'transmitter-reveal'[\s\S]*?targetRef: 'trayTransmitter'/);
  });

  // ── 3: Inline-reveal step IDs ──────────────────────────────────────────────
  // PROMPT_140: A1 piece intros are notice → named-reveal → teach. The
  // Arc-Wheel-era -instruct (placement gate) and -capture (placedPiece)
  // beats are gone. A1-1 is collect → reveal → board-resume.
  it('3: each piece-intro level contains step IDs in the correct order', () => {
    // A1-1
    expect(a11).toMatch(/id: 'conveyor-collect'[\s\S]*?id: 'conveyor-reveal'[\s\S]*?id: 'board-resume'/);
    // A1-2
    expect(a12).toMatch(/id: 'gear-notice'[\s\S]*?id: 'gear-reveal'[\s\S]*?id: 'gear-teach'/);
    // A1-3 (teach is split into teach-a and teach-b)
    expect(a13).toMatch(/id: 'confignode-notice'[\s\S]*?id: 'confignode-reveal'[\s\S]*?id: 'confignode-teach-a'[\s\S]*?id: 'confignode-teach-b'/);
    // A1-5
    expect(a15).toMatch(/id: 'scanner-notice'[\s\S]*?id: 'scanner-reveal'[\s\S]*?id: 'scanner-teach'/);
    // A1-7
    expect(a17).toMatch(/id: 'transmitter-notice'[\s\S]*?id: 'transmitter-reveal'[\s\S]*?id: 'transmitter-teach'/);
    // The retired beat ids must be gone everywhere.
    for (const src of [a11, a12, a13, a15, a17]) {
      expect(src).not.toMatch(/-instruct'/);
      expect(src).not.toMatch(/-capture'/);
    }
  });

  // ── 4: Eye state sequence amber → green → blue ───────────────────────────
  // PROMPT_140: notice (amber, codex reveal) → named-reveal (green) → teach (blue).
  it('4: piece-intro eye states are amber, green, blue in order (A1-2..A1-7)', () => {
    const eyeSeqRe = (prefix: string) =>
      new RegExp(
        `id: '${prefix}-notice'[\\s\\S]*?eyeState: 'amber'` +
        `[\\s\\S]*?id: '${prefix}-reveal'[\\s\\S]*?eyeState: 'green'` +
        `[\\s\\S]*?id: '${prefix}-teach`,
      );
    expect(a12).toMatch(eyeSeqRe('gear'));
    expect(a13).toMatch(eyeSeqRe('confignode'));
    expect(a15).toMatch(eyeSeqRe('scanner'));
    expect(a17).toMatch(eyeSeqRe('transmitter'));
    // teach beat must be blue
    expect(a12).toMatch(/id: 'gear-teach'[\s\S]*?eyeState: 'blue'/);
    expect(a15).toMatch(/id: 'scanner-teach'[\s\S]*?eyeState: 'blue'/);
    expect(a17).toMatch(/id: 'transmitter-teach'[\s\S]*?eyeState: 'blue'/);
  });

  // ── 5: codexEntryId on the tray-targeted notice step (inline reveal) ──────
  // PROMPT_140: the codex reveal moves onto the -notice beat so it fires
  // while COGS is still showing the tray item. Not on -reveal or -teach.
  it('5: codexEntryId appears on the -notice step, not -reveal/teach (A1-2..A1-7)', () => {
    for (const [src, prefix, codexId] of [
      [a12, 'gear', 'gear'], [a13, 'confignode', 'configNode'],
      [a15, 'scanner', 'scanner'], [a17, 'transmitter', 'transmitter'],
    ] as [string, string, string][]) {
      expect(src).toMatch(new RegExp(`id: '${prefix}-notice'[\\s\\S]*?codexEntryId: '${codexId}'[\\s\\S]*?id: '${prefix}-reveal'`));
      // The named-reveal beat must NOT carry its own codexEntryId. Scope the
      // check to the reveal step's own object (up to its closing "}," ) so
      // unrelated codexEntryId on a later step (e.g. the A1-7 output-tape-notice
      // that follows transmitter-reveal) does not trip this.
      const revealBlock = src.match(new RegExp(`id: '${prefix}-reveal'[\\s\\S]*?\\},`));
      expect(revealBlock).not.toBeNull();
      expect(revealBlock![0]).not.toContain('codexEntryId');
    }
    // A1-1: codexEntryId 'conveyor' lives on the '???' conveyor-collect beat.
    expect(a11).toMatch(/id: 'conveyor-collect'[\s\S]*?codexEntryId: 'conveyor'/);
    expect(a11).not.toMatch(/id: 'conveyor-reveal'[\s\S]*?codexEntryId:/);
  });

  // ── 6: no awaitPlacement / placedPiece anywhere in A1 ─────────────────────
  // PROMPT_140 (Tucker direction): inline reveal, no placement gate, no
  // orb-chase to a placed piece across every A1 level.
  it('6: no A1 level carries awaitPlacement or targetRef placedPiece', () => {
    for (const src of [a11, a12, a13, a14, a15, a16, a17, a18]) {
      expect(src).not.toContain('awaitPlacement');
      expect(src).not.toContain("'placedPiece'");
    }
  });

  // ── 7: A1-3 awaitPieceTap on teach-a ─────────────────────────────────────
  it("7: A1-3 confignode-teach-a has awaitPieceTap: 'configNode'", () => {
    expect(a13).toMatch(/id: 'confignode-teach-a'[\s\S]*?awaitPieceTap: 'configNode'/);
  });

  // ── 8–12: Dialogue integrity — approved messages character-for-character ──

  it('8: A1-1 conveyor dialogue matches the gold conveyor-collect/board-resume copy (PROMPT_129)', () => {
    // PROMPT_129 restored the gold "teach then hand over" flow:
    // catalogue the Conveyor on the first beat, then hand the board
    // over for free play. The four Arc-Wheel-era lines are retired.
    expect(a11).toContain(
      'That piece is not in the Codex yet. It will be.',
    );
    expect(a11).toContain(
      'One exception to the rule. Conveyors rotate when you tap them — the only piece in the game that does. Everything else aligns to the path. Try it.',
    );
  });

  it('9: A1-2 gear dialogue matches approved spec character-for-character', () => {
    expect(a12).toContain(
      "The tray. There is an uncatalogued piece sitting right there.",
    );
    // PROMPT_140: the "Place it. On the board..." instruct line is retired
    // along with the placement gate.
    expect(a12).not.toContain(
      "Place it. On the board. Quickly, please. I want to — I need to verify its behavior before I can file it. Place it.",
    );
    expect(a12).toContain(
      "Gear. Ninety-degree redirection. The signal enters one face, exits an adjacent face. Catalogued. Four entries now. This is... this is acceptable progress.",
    );
    expect(a12).toContain(
      "The Gear does not rotate on tap. It redirects the signal ninety degrees based on where the next piece is placed. Place where a corner is needed. The signal handles the rest.",
    );
  });

  it('10: A1-3 configNode dialogue matches approved spec character-for-character', () => {
    expect(a13).toContain(
      "Another one. The tray is showing a piece I cannot identify from existing records.",
    );
    // PROMPT_140: the "Board. Now..." instruct line is retired.
    expect(a13).not.toContain(
      "Board. Now. I will handle the classification once I observe it in a live circuit. That is how this works.",
    );
    expect(a13).toContain(
      "Config Node. Protocol class. It reads, it decides, it gates. This is not a physics piece — this one thinks. Five entries. The Codex is starting to look like a real archive.",
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
      "I see it. In the tray. Uncatalogued.",
    );
    // PROMPT_140: the "Same procedure as before. Place it..." instruct line is retired.
    expect(a15).not.toContain(
      "Same procedure as before. Place it. Let it run. I will do the rest.",
    );
    expect(a15).toContain(
      "Scanner. Reads the input tape and writes what it finds to the Data Trail. The first piece that moves data instead of signal. Eighth entry. I may need a bigger archive.",
    );
    expect(a15).toContain(
      "The Scanner does not require configuration. Place it in the path. When the signal reaches it, it reads the IN value and transfers it to the Data Trail.",
    );
  });

  it('12: A1-7 transmitter dialogue matches approved spec character-for-character', () => {
    expect(a17).toContain(
      "One more. The tray.",
    );
    // PROMPT_140: the "Place it. You know the drill..." instruct line is retired.
    expect(a17).not.toContain(
      "Place it. You know the drill by now. Operational necessity.",
    );
    expect(a17).toContain(
      "Transmitter. Takes what the Scanner read and writes it to the output tape. Scanner reads, Transmitter writes. Paired operations. Nine entries. The Codex is... it is becoming something.",
    );
    expect(a17).toContain(
      "The Transmitter reads the Data Trail and writes to the OUT tape. A piece that writes. Not sure how I feel about that.",
    );
  });

  // ── 13–15: Tape Codex entries (CONTENT-01) ────────────────────────────────
  const codexSrc = read('src/components/CodexDetailView.tsx');

  it('13: A1-5 catalogues IN tape and Data Trail via ??? -> Codex notice steps', () => {
    expect(a15).toMatch(/id: 'input-tape-notice'[\s\S]*?codexEntryId: 'inputTape'[\s\S]*?id: 'input-tape-reveal'/);
    expect(a15).toMatch(/id: 'data-trail-notice'[\s\S]*?codexEntryId: 'dataTrail'[\s\S]*?id: 'data-trail-reveal'/);
    // The named-reveal beats are green and carry the Scheme-A entry numbers.
    expect(a15).toContain('Sixth entry.');
    expect(a15).toContain('Seventh entry.');
  });

  it('14: A1-7 catalogues OUT tape via a ??? -> Codex notice step', () => {
    expect(a17).toMatch(/id: 'output-tape-notice'[\s\S]*?codexEntryId: 'outputTape'[\s\S]*?id: 'output-tape-reveal'/);
    expect(a17).toContain('Tenth entry.');
  });

  it('15: CodexDetailView defines the three tape entries as DATA STREAM', () => {
    for (const id of ['inputTape', 'dataTrail', 'outputTape']) {
      expect(codexSrc).toMatch(new RegExp(`id: '${id}'[\\s\\S]*?type: 'Stream'`));
    }
    // The DATA STREAM badge label is wired in the component.
    expect(codexSrc).toContain("'DATA STREAM'");
  });

  it('16: tape-row codex steps keep the orb centered (Presentation Mode), not on the ???', () => {
    // Superseded 2026-06-13: COGS now stays centered for every spotlight step
    // (the professor-with-a-laser-pointer model), so the tape-row orb no longer
    // needs a below-the-box override — it is simply centered, clear of the
    // top-of-screen tape highlight and its ??? caption.
    expect(overlaySrc).toMatch(/let targetCy = SCREEN_H \/ 2;/);
    expect(overlaySrc).not.toMatch(/targetCy = box\.top \+ box\.height \+ \d+ \+ ORB_SIZE \/ 2/);
  });
});
