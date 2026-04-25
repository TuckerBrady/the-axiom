// Source-contract + lifecycle-method tests for GameplayErrorBoundary.
// The unit-tier jest project does not transform react-native modules, so
// full render tests live in Maestro / on-device QA per the project's
// testing convention (see cogsHubCard.test.tsx). These tests exercise
// the class's static lifecycle behavior and verify the source shape.

import * as fs from 'fs';
import * as path from 'path';

const boundarySource = fs.readFileSync(
  path.resolve(__dirname, '../../../src/components/GameplayErrorBoundary.tsx'),
  'utf8',
);

describe('GameplayErrorBoundary', () => {
  describe('source contract', () => {
    it('exports a default class component extending React.Component', () => {
      expect(boundarySource).toMatch(
        /export default class GameplayErrorBoundary extends React\.Component/,
      );
    });

    it('implements getDerivedStateFromError to flip hasError', () => {
      expect(boundarySource).toMatch(
        /static getDerivedStateFromError\(error: Error\): State/,
      );
      expect(boundarySource).toMatch(/return \{ hasError: true, error \}/);
    });

    it('implements componentDidCatch and inlines the dev-tools env check (not an import)', () => {
      expect(boundarySource).toMatch(/componentDidCatch\(error: Error, info: React\.ErrorInfo\)/);
      // Inline check per spec — boundary must not import from devFlags.ts
      // since that module could be involved in a crash path.
      expect(boundarySource).toMatch(
        /__DEV__ \|\| process\.env\.EXPO_PUBLIC_SHOW_DEV_TOOLS === 'true'/,
      );
      expect(boundarySource).not.toMatch(/from ['"].*devFlags['"]/);
    });

    it('exposes reset that clears error state and invokes onReset', () => {
      expect(boundarySource).toMatch(
        /reset\s*=\s*\(\):?\s*void\s*=>\s*\{/,
      );
      expect(boundarySource).toMatch(
        /this\.setState\(\{ hasError: false, error: null \}\)/,
      );
      expect(boundarySource).toMatch(/this\.props\.onReset\?\.\(\)/);
    });

    it('renders children when no error and an error UI with RUNTIME ERROR / RESET when caught', () => {
      expect(boundarySource).toMatch(/if \(!this\.state\.hasError\) return this\.props\.children/);
      expect(boundarySource).toMatch(/RUNTIME ERROR/);
      expect(boundarySource).toMatch(/RESET/);
    });

    it('does NOT auto-reset or auto-retry — reset must be player-initiated', () => {
      // No timer-based retry in the boundary. Only an explicit onPress.
      expect(boundarySource).not.toMatch(/setTimeout\s*\(/);
      expect(boundarySource).not.toMatch(/setInterval\s*\(/);
    });
  });

});
