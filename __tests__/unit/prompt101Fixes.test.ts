// Source-contract guards for Prompt 101 — Source/Terminal rename
// across user-facing copy, and Codex beam color forced to cyan
// regardless of piece type. Each describe block pins one fix so a
// future refactor can't silently regress it.

import * as fs from 'fs';
import * as path from 'path';

const repoRoot = path.resolve(__dirname, '../..');
const read = (p: string) => fs.readFileSync(path.resolve(repoRoot, p), 'utf8');

const levelsSrc = read('src/game/levels.ts');
const distressSrc = read('src/screens/onboarding/DistressScreen.tsx');
const lockPhaseSrc = read('src/game/engagement/lockPhase.ts');
const pieceIconSrc = read('src/components/PieceIcon.tsx');
const pieceSimSrc = read('src/components/PieceSimulation.tsx');
const claudeMdSrc = read('CLAUDE.md');
const computationalModelSrc = read('docs/COMPUTATIONAL_MODEL.md');
const levelDesignSrc = read('docs/LEVEL_DESIGN_FRAMEWORK.md');
const keplerLevelsSrc = read('project-docs/SPECS/kepler-belt-levels.md');

describe('Prompt 101 — Source/Terminal rename + Codex beam color', () => {
  describe('Tutorial dialogue (A1-1)', () => {
    it('A1-1 uses Source/Terminal terminology, not Input/Output port', () => {
      // board-intro no longer pre-names the fixtures (standardized discovery,
      // 2026-06-13: they are named on their reveal beats so the ??? notice
      // isn't contradicted). The Source/Terminal terminology now lives on the
      // reveal steps; the Input/Output port rename guard still holds.
      const a11 = levelsSrc.match(/levelA1_1:\s*LevelDefinition\s*=\s*\{[\s\S]*?\n\};/);
      expect(a11).not.toBeNull();
      expect(a11?.[0]).toMatch(/message: 'Source\. The origin/);
      expect(a11?.[0]).toMatch(/message: 'Terminal\. Where the signal/);
      expect(a11?.[0]).not.toMatch(/Input port, output port/);
      expect(a11?.[0]).toMatch(/Bridge them\./); // bridging language retained
    });

    it("A1-1 source-reveal step copy is Source", () => {
      // Standardized discovery (2026-06-13): source-collect split into
      // source-notice (???) + source-reveal (named).
      const a11 = levelsSrc.match(/levelA1_1:\s*LevelDefinition\s*=\s*\{[\s\S]*?\n\};/);
      expect(a11?.[0]).toMatch(
        /id: 'source-reveal'[\s\S]*?message: 'Source\./,
      );
    });

    it("A1-1 terminal-reveal step copy is Terminal", () => {
      const a11 = levelsSrc.match(/levelA1_1:\s*LevelDefinition\s*=\s*\{[\s\S]*?\n\};/);
      expect(a11?.[0]).toMatch(
        /id: 'terminal-reveal'[\s\S]*?message: 'Terminal\./,
      );
    });

    it("A1-2 prerequisiteConcept references Source/Terminal", () => {
      const a12 = levelsSrc.match(/levelA1_2:\s*LevelDefinition\s*=\s*\{[\s\S]*?\n\};/);
      expect(a12).not.toBeNull();
      expect(a12?.[0]).toMatch(/Source and a Terminal/);
      expect(a12?.[0]).not.toMatch(/input port and an output port/);
    });
  });

  describe('Onboarding copy', () => {
    it('Distress transmission references Source and Terminal, not output node', () => {
      expect(distressSrc).toMatch(/between the Source and the Terminal\./);
      expect(distressSrc).not.toMatch(/output node/);
    });
  });

  describe('Code comments', () => {
    it('lockPhase wrong-output ring comment refers to Terminal', () => {
      expect(lockPhaseSrc).toMatch(/Wrong-output ring expansion at the Terminal\./);
      expect(lockPhaseSrc).not.toMatch(/at the Output Port/);
    });

    it('PieceIcon comments refer to Source / Terminal not Input / Output port', () => {
      expect(pieceIconSrc).toMatch(/Source charge sequence/);
      expect(pieceIconSrc).toMatch(/Terminal lock sequence/);
      expect(pieceIconSrc).not.toMatch(/Input port charge sequence/);
      expect(pieceIconSrc).not.toMatch(/Output port lock sequence/);
    });
  });

  describe('Documentation', () => {
    it('CLAUDE.md three-layer architecture line uses Source/Terminal', () => {
      expect(claudeMdSrc).toMatch(/physical route from Source to Terminal/);
      expect(claudeMdSrc).not.toMatch(/physical route from Input Port to Output Port/);
    });

    it('CLAUDE.md decisions list documents Source/Terminal as the locked names', () => {
      expect(claudeMdSrc).toMatch(
        /Source = origin of signal \(formerly Input Port\), Terminal = destination of signal \(formerly Output Port\) — locked/,
      );
    });

    it('CLAUDE.md auto-orientation gotcha references Source', () => {
      expect(claudeMdSrc).toMatch(/Auto-orientation: only Source triggers it/);
    });

    it('COMPUTATIONAL_MODEL.md Layer 1 description uses Source/Terminal', () => {
      expect(computationalModelSrc).toMatch(
        /signal travels from Source to Terminal\./,
      );
    });

    it('LEVEL_DESIGN_FRAMEWORK.md tutorial copy uses Source/Terminal', () => {
      expect(levelDesignSrc).toMatch(/connect the Source to the Terminal/);
      expect(levelDesignSrc).toMatch(/The Source and Terminal are not aligned/);
      expect(levelDesignSrc).toMatch(/before it reaches the Terminal/);
    });

    it('kepler-belt-levels SPECS no longer reference Input Port / Output Port', () => {
      expect(keplerLevelsSrc).not.toMatch(/Input Port/);
      expect(keplerLevelsSrc).not.toMatch(/Output Port/);
      expect(keplerLevelsSrc).toMatch(/Pre-placed: Source/);
      expect(keplerLevelsSrc).toMatch(/Terminal/);
    });
  });

  describe('Codex beam color — all blue', () => {
    it('PieceSimulation default litColor for connection lines is Codex cyan', () => {
      expect(pieceSimSrc).toMatch(/litColor = 'rgba\(0,212,255,0\.6\)'/);
      expect(pieceSimSrc).not.toMatch(/litColor = 'rgba\(240,180,41/);
    });

    it('PieceSimulation never strokes a beam line/ring with AMBER', () => {
      expect(pieceSimSrc).not.toMatch(/stroke=\{AMBER\}/);
    });

    it('PieceSimulation never fills a beam head with AMBER', () => {
      expect(pieceSimSrc).not.toMatch(/fill=\{AMBER\}/);
    });

    it('CYAN constant in PieceSimulation is the Protocol beam color', () => {
      expect(pieceSimSrc).toMatch(/const CYAN = '#00D4FF'/);
    });

    it('No tutorial-step UI label still spells INPUT PORT or OUTPUT PORT', () => {
      expect(levelsSrc).not.toMatch(/label: 'INPUT PORT'/);
      expect(levelsSrc).not.toMatch(/label: 'OUTPUT PORT'/);
    });
  });
});
