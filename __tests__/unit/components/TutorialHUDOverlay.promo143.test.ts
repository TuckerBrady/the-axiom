// Discovery caption — source-contract + behavior guards.
//
// History: PROMPT_143 introduced the '???' caption gated on persisted
// discovery state (isCodexStep && !isDiscovered). Tucker notes 2026-06-13:
// (1) on replay the caption never showed for already-discovered pieces; and
// (2) the caption should sit in a label slot ABOVE the highlight square and
// host either '???' (notice) or the piece NAME (reveal), with every piece —
// including Source/Terminal — captured the same way. The caption is now driven
// by an explicit per-step `captionLabel` string, decoupled from discovery
// state, so it replays every session.

import * as fs from 'fs';
import * as path from 'path';

const repoRoot = path.resolve(__dirname, '../../..');
const read = (p: string) => fs.readFileSync(path.resolve(repoRoot, p), 'utf8');

const overlaySrc = read('src/components/TutorialHUDOverlay.tsx');
const levelsSrc = read('src/game/levels.ts');

describe('Discovery caption — captionLabel-driven', () => {
  it('renders the caption text from step.captionLabel above the highlight box', () => {
    expect(overlaySrc).toMatch(/const captionText = step\.captionLabel/);
    // Renders the caption text node, and positions it above the box (box.top - N).
    expect(overlaySrc).toMatch(/\{captionText\}/);
    expect(overlaySrc).toMatch(/top: portalBox\.top - \d+/);
  });

  it('no longer gates the caption on persisted discovery (isDiscovered)', () => {
    expect(overlaySrc).not.toMatch(/captionText[\s\S]{0,80}isDiscovered/);
  });

  it('does not resurrect the removed per-step mission sub-header for non-codex steps', () => {
    const labelRender = overlaySrc.match(/<Text[^>]*style=\{st\.label\}[^>]*>\s*\{step\.label\}/);
    expect(labelRender).toBeNull();
  });

  it('every piece/tape notice step shows the ??? caption', () => {
    const noticeIds = [
      'conveyor-collect', 'source-notice', 'terminal-notice', 'gear-notice',
      'confignode-notice', 'scanner-notice', 'transmitter-notice',
      'input-tape-notice', 'data-trail-notice', 'output-tape-notice',
    ];
    for (const id of noticeIds) {
      expect(levelsSrc).toMatch(new RegExp(`id: '${id}'[\\s\\S]*?captionLabel: '\\?\\?\\?'`));
    }
  });

  it('every reveal beat shows the piece/entity NAME caption', () => {
    const reveals: [string, string][] = [
      ['conveyor-reveal', 'CONVEYOR'], ['source-reveal', 'SOURCE'],
      ['terminal-reveal', 'TERMINAL'], ['gear-reveal', 'GEAR'],
      ['confignode-reveal', 'CONFIG NODE'], ['scanner-reveal', 'SCANNER'],
      ['transmitter-reveal', 'TRANSMITTER'], ['input-tape-reveal', 'INPUT TAPE'],
      ['data-trail-reveal', 'DATA TRAIL'], ['output-tape-reveal', 'OUTPUT TAPE'],
    ];
    for (const [id, name] of reveals) {
      expect(levelsSrc).toMatch(new RegExp(`id: '${id}'[\\s\\S]*?captionLabel: '${name}'`));
    }
  });

  it('Source/Terminal are captured the same way but do not open a Codex page', () => {
    // They carry the ??? notice + named reveal, and the silent-catalogue
    // codexEntryId lives on the notice beat (handlePrimary A1-1 special case).
    expect(levelsSrc).toMatch(/id: 'source-notice'[\s\S]*?codexEntryId: 'source'[\s\S]*?captionLabel: '\?\?\?'/);
    expect(levelsSrc).toMatch(/id: 'terminal-notice'[\s\S]*?codexEntryId: 'terminal'[\s\S]*?captionLabel: '\?\?\?'/);
  });
});

// Behavior model: caption visibility is the presence of captionLabel,
// independent of discovery state.
const captionVisible = (step: { captionLabel?: string }): boolean =>
  !!step.captionLabel;

describe('caption visibility is captionLabel-driven, not discovery-driven', () => {
  it('a step with a captionLabel shows the caption', () => {
    expect(captionVisible({ captionLabel: '???' })).toBe(true);
    expect(captionVisible({ captionLabel: 'CONVEYOR' })).toBe(true);
  });

  it('a step without a captionLabel shows nothing', () => {
    expect(captionVisible({})).toBe(false);
  });
});
