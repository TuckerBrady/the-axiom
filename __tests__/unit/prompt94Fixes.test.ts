// Source-contract guards for Prompt 94 — per-pulse animation
// cleanup + wire render optimization. Each describe block pins one
// fix so a future refactor can't silently regress it.

import * as fs from 'fs';
import * as path from 'path';

const repoRoot = path.resolve(__dirname, '../..');
const read = (p: string) => fs.readFileSync(path.resolve(repoRoot, p), 'utf8');

const screenSrc = read('src/screens/GameplayScreen.tsx');
const beamSrc = read('src/game/engagement/beamAnimation.ts');
const chargeSrc = read('src/game/engagement/chargePhase.ts');
const lockSrc = read('src/game/engagement/lockPhase.ts');
const typesSrc = read('src/game/engagement/types.ts');

describe('Prompt 94 — per-pulse animation cleanup + wire render', () => {
  describe('Fix 1 — flashTimers swept at start of each pulse', () => {
    it('handleEngage clears flashTimersRef inside the pulse loop, before engageRunPulse', () => {
      // The sweep must live inside the per-pulse loop so the array
      // doesn't grow unbounded across the run. We pin both the
      // forEach(clearTimeout) call and the array re-init, anchored
      // by the comment that documents why.
      const block = screenSrc.match(
        /for \(let p = 0; p < pulses\.length; p\+\+\) \{[\s\S]*?await engageRunPulse/,
      );
      expect(block).not.toBeNull();
      expect(block?.[0]).toMatch(
        /flashTimersRef\.current\.forEach\(t => clearTimeout\(t\)\)/,
      );
      expect(block?.[0]).toMatch(/flashTimersRef\.current = \[\]/);
    });
  });

  describe('Fix 2 — Splitter RAF ref isolation', () => {
    it('EngagementContext.animFrameRef is a Map<number | null, number | null>', () => {
      expect(typesSrc).toMatch(
        /animFrameRef:\s*MutableRefObject<Map<number \| null,\s*number \| null>>/,
      );
    });

    it('GameplayScreen initializes animFrameRef as new Map()', () => {
      expect(screenSrc).toMatch(
        /const animFrameRef = useRef<Map<number \| null,\s*number \| null>>\(\s*new Map\(\),?\s*\)/,
      );
    });

    it('beamAnimation routes every RAF assignment through animFrameRef.current.set(branchSlot, ...)', () => {
      // Every RAF assignment in this file must be set(branchSlot,
      // requestAnimationFrame(...)). No bare assignment survives.
      expect(beamSrc).not.toMatch(/ctx\.animFrameRef\.current\s*=\s*requestAnimationFrame/);
      const sets = beamSrc.match(
        /ctx\.animFrameRef\.current\.set\(\s*branchSlot,\s*requestAnimationFrame\(/g,
      ) ?? [];
      // Three RAF callsites remain after Prompt 99C, Fix 2: pause-
      // resume, mid-tick, final start. The two void inner-tick RAFs
      // were removed when the void burst migrated to native-driven
      // voidPulseRingProgressAnim.
      expect(sets.length).toBeGreaterThanOrEqual(3);
    });

    it('chargePhase / lockPhase no longer manage RAF (Prompt 99A — native driver owns the frame loop)', () => {
      // Pre-99A this guard pinned chargePhase + lockPhase to the main
      // beam slot (key null) of the per-slot RAF Map. After 99A's
      // migration to useNativeDriver: true, the JS thread no longer
      // schedules per-frame callbacks for these phases — the native
      // driver owns the timing loop. The guard now inverts: the files
      // must contain ZERO requestAnimationFrame references.
      expect(chargeSrc).not.toMatch(/requestAnimationFrame/);
      expect(lockSrc).not.toMatch(/requestAnimationFrame/);
      // The pre-99A bare-assignment pattern is also still forbidden
      // (was the original bug Prompt 94 Fix 2 caught).
      expect(chargeSrc).not.toMatch(/ctx\.animFrameRef\.current\s*=\s*requestAnimationFrame/);
      expect(lockSrc).not.toMatch(/ctx\.animFrameRef\.current\s*=\s*requestAnimationFrame/);
    });

    it('GameplayScreen cleanup blocks walk the Map and call cancelAnimationFrame on each id', () => {
      // The three cleanup callsites — unmount, handleReset, and
      // post-completion CONTINUE — each iterate the Map and clear it.
      // Pre-fix they each held a single id check.
      const cleanups = screenSrc.match(
        /animFrameRef\.current\.forEach\(id => \{\s*if \(id != null\) cancelAnimationFrame\(id\);\s*\}\);\s*animFrameRef\.current\.clear\(\);/g,
      ) ?? [];
      expect(cleanups.length).toBeGreaterThanOrEqual(3);
    });

    it('does NOT retain the pre-Fix bare animFrameRef.current = null nullification', () => {
      // The old single-id pattern set the ref to null on cancel.
      // After Fix 2 we use Map.clear() instead.
      expect(screenSrc).not.toMatch(/animFrameRef\.current\s*=\s*null/);
    });
  });

  describe('Fix 3 — beamOpacity dim/brighten stops prior animation', () => {
    it('EngagementContext exposes a beamOpacityAnim handle', () => {
      expect(typesSrc).toMatch(
        /beamOpacityAnim\?:\s*Animated\.CompositeAnimation/,
      );
    });

    it('dimBeam stops the previous animation before queuing the new one', () => {
      const dim = beamSrc.match(/function dimBeam\(ctx: EngagementContext\)[\s\S]*?\n\}/);
      expect(dim).not.toBeNull();
      expect(dim?.[0]).toMatch(/ctx\.beamOpacityAnim\?\.stop\(\)/);
      expect(dim?.[0]).toMatch(/ctx\.beamOpacityAnim = Animated\.timing/);
      expect(dim?.[0]).toMatch(/ctx\.beamOpacityAnim\.start\(\)/);
    });

    it('brightenBeam stops the previous animation before queuing the new one', () => {
      const bright = beamSrc.match(/function brightenBeam\(ctx: EngagementContext\)[\s\S]*?\n\}/);
      expect(bright).not.toBeNull();
      expect(bright?.[0]).toMatch(/ctx\.beamOpacityAnim\?\.stop\(\)/);
      expect(bright?.[0]).toMatch(/ctx\.beamOpacityAnim = Animated\.timing/);
      expect(bright?.[0]).toMatch(/ctx\.beamOpacityAnim\.start\(\)/);
    });
  });

  describe('Fix 4 — Wire render uses memoized pieceById Map', () => {
    it('GameplayScreen builds pieceById via useMemo keyed on pieces', () => {
      expect(screenSrc).toMatch(
        /const pieceById = useMemo\(\s*\(\)\s*=>\s*new Map\(pieces\.map\(p => \[p\.id, p\]\)\),\s*\[pieces\],?\s*\)/,
      );
    });

    it('the wire render block calls pieceById.get(...) instead of pieces.find(...)', () => {
      // Prompt 99B — wire rendering moved to WireOverlay.tsx; the
      // pieceById.get pattern lives there now.
      const wireOverlaySrc = fs.readFileSync(
        path.resolve(__dirname, '../../src/components/gameplay/WireOverlay.tsx'),
        'utf8',
      );
      const wireBlock = wireOverlaySrc.match(
        /wires\.map\(wire =>[\s\S]*?\}\)\}/,
      );
      expect(wireBlock).not.toBeNull();
      expect(wireBlock?.[0]).toMatch(
        /const fromPiece = pieceById\.get\(wire\.fromPieceId\)/,
      );
      expect(wireBlock?.[0]).toMatch(
        /const toPiece = pieceById\.get\(wire\.toPieceId\)/,
      );
      // Regression sentinel: no `pieces.find(` survives in the wire
      // map block.
      expect(wireBlock?.[0]).not.toMatch(/pieces\.find\(/);
    });
  });
});
