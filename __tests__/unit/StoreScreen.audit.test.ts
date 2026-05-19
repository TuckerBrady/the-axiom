/**
 * Static analysis: StoreScreen UX audit fixes (PROMPT_120).
 *
 * Fix 6 — Extra Life icon:
 *   The 'life' branch of PowerUpIcon used the heart SVG path
 *   (d="M12 21.35l-1.45..."), which reads as an emoji shape and
 *   breaks the Y2K geometric language used by the other icons.
 *   The replacement is a Rect frame + two Line strokes (cross).
 *
 * Fix 7 — Axiom economy isolation:
 *   Axiom is the safe-zone tutorial sector. Credits exist but
 *   purchases must not deduct them. Store still renders so the
 *   player sees what items exist; prices display as FREE.
 *
 *   "Active sector is Axiom" = `useProgressionStore.activeSector === 'A1'`
 *   ('A1' is the canonical Axiom identifier in progressionStore;
 *   `'axiom'` only appears as the `level.sector` field, which is
 *   not the relevant signal when the Store is open outside a level.)
 */

import * as fs from 'fs';
import * as path from 'path';

const STORE_PATH = path.resolve(__dirname, '../../src/screens/StoreScreen.tsx');

describe('StoreScreen — UX audit round 1', () => {
  let source: string;
  let lifeIconBlock: string;

  beforeAll(() => {
    source = fs.readFileSync(STORE_PATH, 'utf-8');
    // Extract the `case 'life':` block — everything from that case
    // through the next `case ` or `default:` opener.
    const match = source.match(/case 'life':[\s\S]*?(?=case '|default:)/);
    lifeIconBlock = match ? match[0] : '';
  });

  describe('Fix 6 — Extra Life icon', () => {
    it('locates the life-icon block in the source', () => {
      expect(lifeIconBlock).not.toBe('');
    });

    it('does not render the heart path (d="M12 21.35...")', () => {
      expect(lifeIconBlock).not.toMatch(/d=\s*["']M12 21\.35/);
    });

    it('contains a Rect element for the frame', () => {
      expect(lifeIconBlock).toMatch(/<Rect\b/);
    });

    it('contains at least two Line elements for the cross strokes', () => {
      const lineMatches = lifeIconBlock.match(/<Line\b/g) ?? [];
      expect(lineMatches.length).toBeGreaterThanOrEqual(2);
    });
  });

  describe('Fix 7 — Axiom economy isolation', () => {
    it('imports useProgressionStore so the active sector can be read', () => {
      expect(source).toMatch(
        /import\s*\{[^}]*\buseProgressionStore\b[^}]*\}\s*from\s*['"]\.\.\/store\/progressionStore['"]/,
      );
    });

    it('checks for the Axiom sector identifier "A1"', () => {
      // Either via a literal compare or a derived boolean — both forms
      // must contain the 'A1' literal in the StoreScreen source.
      expect(source).toContain("'A1'");
    });

    it('displays "FREE" instead of a CR price when active sector is Axiom', () => {
      expect(source).toContain("'FREE'");
    });

    it('still displays the "CR" credit suffix when not in Axiom', () => {
      expect(source).toContain('CR');
    });
  });

  // ── PROMPT_122 Fix 2 — credit balance color ──
  describe('Fix 2 — currencyAmount uses copper, not amber', () => {
    let block: string;

    beforeAll(() => {
      // Extract the currencyAmount StyleSheet entry: from the key
      // through its closing `},`.
      const match = source.match(/currencyAmount:\s*\{[\s\S]*?\},/);
      block = match ? match[0] : '';
    });

    it('locates the currencyAmount style block in the source', () => {
      expect(block).not.toBe('');
    });

    it('color is Colors.copper', () => {
      expect(block).toMatch(/color:\s*Colors\.copper\b/);
    });

    it('color is NOT Colors.amber', () => {
      expect(block).not.toMatch(/color:\s*Colors\.amber\b/);
    });
  });

  // ── PROMPT_122 Fix 3 — IAP credit-pack amount color ──
  describe('Fix 3 — ccAmount uses copper, not circuit purple', () => {
    let block: string;

    beforeAll(() => {
      const match = source.match(/ccAmount:\s*\{[\s\S]*?\},/);
      block = match ? match[0] : '';
    });

    it('locates the ccAmount style block in the source', () => {
      expect(block).not.toBe('');
    });

    it('color is Colors.copper', () => {
      expect(block).toMatch(/color:\s*Colors\.copper\b/);
    });

    it('color is NOT Colors.circuit', () => {
      expect(block).not.toMatch(/color:\s*Colors\.circuit\b/);
    });
  });
});
