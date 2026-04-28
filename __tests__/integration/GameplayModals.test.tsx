// Integration tests for the extracted GameplayModals component
// (Phase 1 of the GameplayScreen refactor — see
// project-docs/SPECS/gameplay-screen-refactor.md).
//
// The render path through GameplayModals is exercised end-to-end on
// device via Maestro. Here we verify the component's contract by source
// inspection: every modal must be guarded by its boolean flag, the
// component must not own any stateful logic of its own, and the
// navigation callbacks the prompt cares about must be wired through to
// the props the component receives.

import * as fs from 'fs';
import * as path from 'path';

const repoRoot = path.resolve(__dirname, '../..');
const modalsSrc = fs.readFileSync(
  path.resolve(repoRoot, 'src/components/gameplay/GameplayModals.tsx'),
  'utf8',
);
const screenSrc = fs.readFileSync(
  path.resolve(repoRoot, 'src/screens/GameplayScreen.tsx'),
  'utf8',
);

describe('GameplayModals — flag-gated rendering', () => {
  it.each([
    ['Pause modal',         /\{showPauseModal && \(/],
    ['Void state',          /\{showVoid && \(/],
    ['Results overlay',     /\{showResults && \(/],
    ['Wrong output',        /\{showWrongOutput && wrongOutputData && \(/],
    ['Insufficient pulses', /\{showInsufficientPulses && pulseResultData && \(/],
    ['Out of lives',        /\{showOutOfLives && \(/],
    ['Economy intro',       /\{showEconomyIntro && \(/],
    ['System restored',     /\{showSystemRestored && \(/],
    ['Completion scene',    /\{showCompletionScene && \(/],
    ['Discipline card',     /\{showDisciplineCard && discipline && \(/],
    ['Teach card',          /\{showTeachCard && \(/],
    ['Completion CONTINUE', /\{showCompletionCard && !showResults && \(/],
  ])('%s renders only when its flag is set', (_name, pattern) => {
    expect(modalsSrc).toMatch(pattern);
  });
});

describe('GameplayModals — pure render contract', () => {
  it('does not call useState (state is owned by useGameplayModals)', () => {
    expect(modalsSrc).not.toMatch(/\buseState\b/);
  });

  it('does not call useEffect (effects belong to the hook layer)', () => {
    expect(modalsSrc).not.toMatch(/\buseEffect\b/);
  });

  it('does not call useCallback (callbacks come in via props)', () => {
    expect(modalsSrc).not.toMatch(/\buseCallback\b/);
  });

  it('wraps the implementation in React.memo for prop-equality bailouts', () => {
    expect(modalsSrc).toMatch(/React\.memo\(GameplayModalsImpl\)/);
  });
});

describe('GameplayModals — navigation callbacks', () => {
  it('Results CONTINUE resets the navigation stack to [Tabs, LevelSelect]', () => {
    expect(modalsSrc).toMatch(
      /navigation\.reset\(\{\s*index: 1,\s*routes: \[\{ name: 'Tabs' \}, \{ name: 'LevelSelect' \}\]/,
    );
  });

  it('Discipline card dismiss resets the navigation stack', () => {
    // The discipline card's onPress wraps the same navigation.reset
    // call as the Results CONTINUE button. We assert the literal stack
    // shape appears at least twice (Results + Discipline).
    const matches = modalsSrc.match(
      /navigation\.reset\(\{\s*index: 1,\s*routes: \[\{ name: 'Tabs' \}, \{ name: 'LevelSelect' \}\]/g,
    );
    expect(matches?.length ?? 0).toBeGreaterThanOrEqual(2);
  });

  it('Out of Lives MAYBE LATER calls navigation.goBack', () => {
    expect(modalsSrc).toMatch(
      /label="MAYBE LATER"[\s\S]*?onPress=\{[\s\S]*?navigation\.goBack\(\)/,
    );
  });

  it('Void state BACK TO MAP calls navigation.goBack', () => {
    expect(modalsSrc).toMatch(/onPress=\{\(\) => navigation\.goBack\(\)\}/);
  });

  it('Pause modal CONFIRM ABANDON pops 2 frames when lives remain', () => {
    expect(modalsSrc).toMatch(/navigation\.pop\(2\)/);
  });

  it('passes navigation through GameplayModalsProps (typed)', () => {
    expect(modalsSrc).toMatch(
      /navigation:\s*NativeStackNavigationProp<RootStackParamList,\s*'Gameplay'>/,
    );
  });
});

describe('GameplayModals — A1-3 discipline acknowledgment branching', () => {
  it('Results CONTINUE checks the A1-3 + firstTimeBonus + discipline gate', () => {
    expect(modalsSrc).toMatch(
      /level\.id === 'A1-3' && firstTimeBonus && discipline/,
    );
  });

  it('Results CONTINUE writes axiom_a13_discipline_seen to AsyncStorage', () => {
    expect(modalsSrc).toMatch(
      /AsyncStorage\.setItem\('axiom_a13_discipline_seen',\s*'1'\)/,
    );
  });

  it('Results CONTINUE routes to the discipline card on first A1-3 completion', () => {
    expect(modalsSrc).toMatch(/setShowResults\(false\);[\s\S]*?setShowDisciplineCard\(true\)/);
  });
});

describe('GameplayScreen — Phase 1 wiring', () => {
  it('imports the extracted GameplayModals component', () => {
    expect(screenSrc).toMatch(
      /import\s+GameplayModals\s+from\s+'\.\.\/components\/gameplay\/GameplayModals'/,
    );
  });

  it('imports the extracted hooks', () => {
    expect(screenSrc).toMatch(
      /import\s*\{\s*useGameplayFailure\s*\}\s*from\s*'\.\.\/hooks\/useGameplayFailure'/,
    );
    expect(screenSrc).toMatch(
      /import\s*\{\s*useGameplayModals\s*\}\s*from\s*'\.\.\/hooks\/useGameplayModals'/,
    );
  });

  it('renders the GameplayModals component once', () => {
    const matches = screenSrc.match(/<GameplayModals\s/g);
    expect(matches).not.toBeNull();
    expect(matches?.length).toBe(1);
  });

  it('passes onCompletionContinue (handleCompletionContinue) to GameplayModals', () => {
    expect(screenSrc).toMatch(/onCompletionContinue=\{handleCompletionContinue\}/);
  });

  it('passes onWrongOutputRetry (handleWrongOutputRetry) to GameplayModals', () => {
    expect(screenSrc).toMatch(/onWrongOutputRetry=\{handleWrongOutputRetry\}/);
  });

  it('declares handleCompletionContinue as a useCallback in GameplayScreen', () => {
    expect(screenSrc).toMatch(/handleCompletionContinue\s*=\s*useCallback/);
  });

  it('declares handleWrongOutputRetry as a useCallback in GameplayScreen', () => {
    expect(screenSrc).toMatch(/handleWrongOutputRetry\s*=\s*useCallback/);
  });

  it('no longer declares the moved modal state inline', () => {
    // After the extraction these flags are owned by useGameplayModals —
    // any inline `useState<...>` or `useState(...)` declaration of the
    // same names regresses the Phase 1 contract.
    expect(screenSrc).not.toMatch(/const \[showPauseModal,\s*setShowPauseModal\] = useState\(/);
    expect(screenSrc).not.toMatch(/const \[showVoid,\s*setShowVoid\] = useState\(/);
    expect(screenSrc).not.toMatch(/const \[showResults,\s*setShowResults\] = useState\(/);
    expect(screenSrc).not.toMatch(/const \[showWrongOutput,\s*setShowWrongOutput\] = useState\(/);
    expect(screenSrc).not.toMatch(/const \[showOutOfLives,\s*setShowOutOfLives\] = useState\(/);
    expect(screenSrc).not.toMatch(/const \[blownCells,\s*setBlownCells\] = useState/);
  });
});
