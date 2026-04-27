// Source-contract tests for the shared Button component. The unit-tier
// jest project does not transform react-native modules (per the project's
// testing convention; see cogsHubCard.test.tsx and GameplayErrorBoundary.test.tsx),
// so we verify the component's spec by inspecting its source.

import * as fs from 'fs';
import * as path from 'path';

const buttonSource = fs.readFileSync(
  path.resolve(__dirname, '../../../src/components/Button.tsx'),
  'utf8',
);

describe('Button component', () => {
  describe('public API', () => {
    it('exports a ButtonVariant type with all four variants', () => {
      expect(buttonSource).toMatch(
        /export type ButtonVariant\s*=\s*'primary' \| 'secondary' \| 'danger' \| 'gradient'/,
      );
    });

    it('exports a ButtonProps interface with required fields', () => {
      expect(buttonSource).toMatch(/export interface ButtonProps/);
      expect(buttonSource).toMatch(/label: string/);
      expect(buttonSource).toMatch(/onPress: \(\) => void/);
      expect(buttonSource).toMatch(/variant\?: ButtonVariant/);
      expect(buttonSource).toMatch(/disabled\?: boolean/);
      expect(buttonSource).toMatch(/style\?:/);
    });

    it('defaults the variant prop to "primary"', () => {
      expect(buttonSource).toMatch(/variant\s*=\s*'primary'/);
    });

    it('defaults the disabled prop to false', () => {
      expect(buttonSource).toMatch(/disabled\s*=\s*false/);
    });

    it('forwards a ref to the underlying TouchableOpacity', () => {
      expect(buttonSource).toMatch(/React\.forwardRef/);
    });
  });

  describe('onPress wiring', () => {
    it('passes onPress through to TouchableOpacity', () => {
      expect(buttonSource).toMatch(/onPress=\{onPress\}/);
    });

    it('passes disabled through to TouchableOpacity', () => {
      expect(buttonSource).toMatch(/disabled=\{disabled\}/);
    });

    it('disables tap feedback when disabled (activeOpacity 1)', () => {
      expect(buttonSource).toMatch(/activeOpacity=\{disabled \? 1 : ACTIVE_OPACITY\[variant\]\}/);
    });
  });

  describe('disabled state', () => {
    it('applies a disabled style to the container when disabled', () => {
      expect(buttonSource).toMatch(/disabled\s*\?\s*\[styles\.disabled\]/);
    });

    it('applies a disabledText style to the label when disabled', () => {
      expect(buttonSource).toMatch(/disabled\s*\?\s*\[styles\.disabledText\]/);
    });

    it('defines disabled with opacity 0.5', () => {
      expect(buttonSource).toMatch(/disabled:\s*\{\s*opacity:\s*0\.5/);
    });

    it('defines disabledText with Colors.dim', () => {
      expect(buttonSource).toMatch(/disabledText:\s*\{\s*color:\s*Colors\.dim/);
    });
  });

  describe('primary variant style', () => {
    it('uses translucent cyan background and border', () => {
      expect(buttonSource).toMatch(/primaryButton:[\s\S]*?backgroundColor:\s*'rgba\(0,212,255,0\.08\)'/);
      expect(buttonSource).toMatch(/primaryButton:[\s\S]*?borderColor:\s*'rgba\(0,212,255,0\.4\)'/);
      expect(buttonSource).toMatch(/primaryButton:[\s\S]*?borderWidth:\s*1\.5/);
      expect(buttonSource).toMatch(/primaryButton:[\s\S]*?minHeight:\s*48/);
    });

    it('uses Orbitron 12 bold cyan text with letterSpacing 1.5', () => {
      expect(buttonSource).toMatch(/primaryText:[\s\S]*?fontFamily:\s*Fonts\.orbitron/);
      expect(buttonSource).toMatch(/primaryText:[\s\S]*?fontSize:\s*12/);
      expect(buttonSource).toMatch(/primaryText:[\s\S]*?fontWeight:\s*'bold'/);
      expect(buttonSource).toMatch(/primaryText:[\s\S]*?color:\s*'#00D4FF'/);
      expect(buttonSource).toMatch(/primaryText:[\s\S]*?letterSpacing:\s*1\.5/);
    });
  });

  describe('secondary variant style', () => {
    it('uses transparent fill and steel border', () => {
      expect(buttonSource).toMatch(/secondaryButton:[\s\S]*?backgroundColor:\s*'transparent'/);
      expect(buttonSource).toMatch(/secondaryButton:[\s\S]*?borderColor:\s*Colors\.steel/);
      expect(buttonSource).toMatch(/secondaryButton:[\s\S]*?minHeight:\s*40/);
    });

    it('uses Space Mono 11 muted text', () => {
      expect(buttonSource).toMatch(/secondaryText:[\s\S]*?fontFamily:\s*Fonts\.spaceMono/);
      expect(buttonSource).toMatch(/secondaryText:[\s\S]*?fontSize:\s*11/);
      expect(buttonSource).toMatch(/secondaryText:[\s\S]*?color:\s*Colors\.muted/);
    });
  });

  describe('danger variant style', () => {
    it('uses translucent red fill and border', () => {
      expect(buttonSource).toMatch(/dangerButton:[\s\S]*?backgroundColor:\s*'rgba\(224,85,85,0\.06\)'/);
      expect(buttonSource).toMatch(/dangerButton:[\s\S]*?borderColor:\s*'rgba\(224,85,85,0\.3\)'/);
      expect(buttonSource).toMatch(/dangerButton:[\s\S]*?minHeight:\s*48/);
    });

    it('uses Orbitron 12 bold red text', () => {
      expect(buttonSource).toMatch(/dangerText:[\s\S]*?fontFamily:\s*Fonts\.orbitron/);
      expect(buttonSource).toMatch(/dangerText:[\s\S]*?color:\s*Colors\.red/);
    });
  });

  describe('gradient variant style', () => {
    it('uses translucent copper fill (NOT a solid LinearGradient)', () => {
      expect(buttonSource).toMatch(/gradientButton:[\s\S]*?backgroundColor:\s*'rgba\(200,121,65,0\.10\)'/);
      expect(buttonSource).toMatch(/gradientButton:[\s\S]*?borderColor:\s*'rgba\(200,121,65,0\.5\)'/);
      expect(buttonSource).toMatch(/gradientButton:[\s\S]*?minHeight:\s*52/);
      // No LinearGradient component used in this file.
      expect(buttonSource).not.toMatch(/LinearGradient/);
    });

    it('uses Orbitron 14 bold amber text with letterSpacing 2', () => {
      expect(buttonSource).toMatch(/gradientText:[\s\S]*?fontFamily:\s*Fonts\.orbitron/);
      expect(buttonSource).toMatch(/gradientText:[\s\S]*?fontSize:\s*14/);
      expect(buttonSource).toMatch(/gradientText:[\s\S]*?color:\s*'#f0b429'/);
      expect(buttonSource).toMatch(/gradientText:[\s\S]*?letterSpacing:\s*2/);
    });
  });
});

describe('GameplayScreen button migration', () => {
  const screenSource = fs.readFileSync(
    path.resolve(__dirname, '../../../src/screens/GameplayScreen.tsx'),
    'utf8',
  );

  it('imports the shared Button component', () => {
    expect(screenSource).toMatch(/from '\.\.\/components\/Button'/);
  });

  it('uses Button variant="gradient" for the engage CTA', () => {
    expect(screenSource).toMatch(/variant="gradient"[\s\S]*?label="ENGAGE MACHINE"/);
  });

  it('uses Button variant="secondary" for RESET', () => {
    expect(screenSource).toMatch(/variant="secondary"[\s\S]*?label="RESET"/);
  });

  it('uses Button variant="primary" for RESUME', () => {
    expect(screenSource).toMatch(/variant="primary"[\s\S]*?label="RESUME"/);
  });

  it('uses Button variant="secondary" for RESTART LEVEL', () => {
    expect(screenSource).toMatch(/variant="secondary"[\s\S]*?label="RESTART LEVEL"/);
  });

  it('uses Button variant="danger" for ABANDON MISSION', () => {
    expect(screenSource).toMatch(/variant="danger"[\s\S]*?label="ABANDON MISSION"/);
  });

  it('uses Button variant="primary" for completion CONTINUE', () => {
    expect(screenSource).toMatch(/variant="primary"[\s\S]*?label="CONTINUE"/);
  });

  it('removes the pause-button HUD bracket corner styles', () => {
    expect(screenSource).not.toMatch(/pauseBtnCorner/);
  });

  it('removes the deprecated engageBtn / resetBtn StyleSheet entries', () => {
    expect(screenSource).not.toMatch(/^\s+engageBtn:/m);
    expect(screenSource).not.toMatch(/^\s+engageBtnGradient:/m);
    expect(screenSource).not.toMatch(/^\s+engageBtnText:/m);
    expect(screenSource).not.toMatch(/^\s+resetBtn:/m);
    expect(screenSource).not.toMatch(/^\s+resetBtnText:/m);
  });

  it('removes the deprecated pause-button StyleSheet entries', () => {
    expect(screenSource).not.toMatch(/^\s+pauseResumeBtn:/m);
    expect(screenSource).not.toMatch(/^\s+pauseRestartBtn:/m);
    expect(screenSource).not.toMatch(/^\s+pauseAbandonBtn:/m);
    expect(screenSource).not.toMatch(/^\s+pauseResumeText:/m);
    expect(screenSource).not.toMatch(/^\s+pauseRestartText:/m);
    expect(screenSource).not.toMatch(/^\s+pauseAbandonText:/m);
  });

  it('removes the deprecated completionCardBtn StyleSheet entries', () => {
    expect(screenSource).not.toMatch(/^\s+completionCardBtn:/m);
    expect(screenSource).not.toMatch(/^\s+completionCardBtnText:/m);
  });

  describe('Prompt 89 — results + out-of-lives button migrations', () => {
    it('renders results-screen REPLAY as a secondary Button', () => {
      expect(screenSource).toMatch(/variant="secondary"[\s\S]*?label="REPLAY"/);
    });

    it('renders results-screen CONTINUE as a gradient Button preserving navigation', () => {
      expect(screenSource).toMatch(/variant="gradient"[\s\S]*?label="CONTINUE"/);
      // Prompt 106 Fix 2 swapped the bare `navigate('LevelSelect')` for a
      // stack-resetting `navigation.reset(...)` so any Gameplay instance
      // pushed via HubScreen's `navigate` flow can't linger underneath.
      expect(screenSource).toMatch(
        /navigation\.reset\(\{\s*index: 1,\s*routes: \[\{ name: 'Tabs' \}, \{ name: 'LevelSelect' \}\]/,
      );
    });

    it('renders out-of-lives REFILL/NEED CR as a gradient Button gated by livesCredits', () => {
      expect(screenSource).toMatch(/variant="gradient"[\s\S]*?label=\{livesCredits >= 30 \? 'REFILL LIVES · 30 CR'/);
      expect(screenSource).toMatch(/disabled=\{livesCredits < 30\}/);
    });

    it('renders out-of-lives MAYBE LATER as a secondary Button (label preserved)', () => {
      expect(screenSource).toMatch(/variant="secondary"[\s\S]*?label="MAYBE LATER"/);
    });

    it('drops the deprecated resultsSecondaryBtn / resultsPrimaryBtn StyleSheet entries', () => {
      expect(screenSource).not.toMatch(/^\s+resultsSecondaryBtn:/m);
      expect(screenSource).not.toMatch(/^\s+resultsSecondaryText:/m);
      expect(screenSource).not.toMatch(/^\s+resultsPrimaryBtn:/m);
      expect(screenSource).not.toMatch(/^\s+resultsPrimaryGradient:/m);
      expect(screenSource).not.toMatch(/^\s+resultsPrimaryText:/m);
    });
  });
});

describe('Prompt 86B — remaining screen button migrations', () => {
  const read = (p: string) =>
    fs.readFileSync(path.resolve(__dirname, '../../..', p), 'utf8');

  describe('LoginScreen', () => {
    const src = read('src/screens/onboarding/LoginScreen.tsx');
    it('imports the shared Button component', () => {
      expect(src).toMatch(/from '\.\.\/\.\.\/components\/Button'/);
    });
    it('renders BEGIN as a primary Button', () => {
      expect(src).toMatch(/variant="primary"[\s\S]*?label="BEGIN"/);
    });
    it('drops the deprecated beginBtn StyleSheet text style', () => {
      expect(src).not.toMatch(/^\s+beginBtnText:/m);
    });
  });

  describe('MissionDossierScreen', () => {
    const src = read('src/screens/MissionDossierScreen.tsx');
    it('imports the shared Button component', () => {
      expect(src).toMatch(/from '\.\.\/components\/Button'/);
    });
    it('renders LAUNCH MISSION as a gradient Button when active', () => {
      expect(src).toMatch(/variant="gradient"[\s\S]*?label="LAUNCH MISSION"/);
    });
    it('renders REPLAY as a secondary Button when completed', () => {
      expect(src).toMatch(/variant="secondary"[\s\S]*?label="REPLAY"/);
    });
    it('renders LOCKED as a disabled Button when locked', () => {
      expect(src).toMatch(/label="LOCKED"[\s\S]*?disabled/);
    });
    it('drops the deprecated launchBtn StyleSheet entries', () => {
      expect(src).not.toMatch(/^\s+launchBtn:/m);
      expect(src).not.toMatch(/^\s+launchBtnGrad:/m);
      expect(src).not.toMatch(/^\s+launchBtnText:/m);
    });
  });

  describe('CharacterNameScreen', () => {
    const src = read('src/screens/onboarding/CharacterNameScreen.tsx');
    it('imports the shared Button component', () => {
      expect(src).toMatch(/from '\.\.\/\.\.\/components\/Button'/);
    });
    it('renders CONFIRM as a primary Button gated by name input', () => {
      expect(src).toMatch(/variant="primary"[\s\S]*?label="CONFIRM"/);
      expect(src).toMatch(/disabled=\{!nameInput\.trim\(\)\}/);
    });
    it('drops the deprecated confirmBtn StyleSheet entries', () => {
      expect(src).not.toMatch(/^\s+confirmBtn:/m);
      expect(src).not.toMatch(/^\s+confirmBtnText:/m);
    });
  });

  describe('DailyChallengeDossierScreen', () => {
    const src = read('src/screens/DailyChallengeDossierScreen.tsx');
    it('imports the shared Button component', () => {
      expect(src).toMatch(/from '\.\.\/components\/Button'/);
    });
    it('renders ACCEPT MISSION as a gradient Button (label preserved)', () => {
      expect(src).toMatch(/variant="gradient"[\s\S]*?label="ACCEPT MISSION"/);
    });
    it('drops the deprecated acceptBtn StyleSheet entries', () => {
      expect(src).not.toMatch(/^\s+acceptBtn:/m);
      expect(src).not.toMatch(/^\s+acceptGradient:/m);
      expect(src).not.toMatch(/^\s+acceptText:/m);
    });
  });

  describe('DailyRewardScreen', () => {
    const src = read('src/screens/DailyRewardScreen.tsx');
    it('imports the shared Button component', () => {
      expect(src).toMatch(/from '\.\.\/components\/Button'/);
    });
    it('renders COLLECT as a gradient Button', () => {
      expect(src).toMatch(/variant="gradient"[\s\S]*?label="COLLECT"/);
    });
    it('drops the deprecated collectBtn text/gradient styles', () => {
      expect(src).not.toMatch(/^\s+collectGradient:/m);
      expect(src).not.toMatch(/^\s+collectText:/m);
    });
  });

  describe('SettingsScreen', () => {
    const src = read('src/screens/SettingsScreen.tsx');
    it('imports the shared Button component', () => {
      expect(src).toMatch(/from '\.\.\/components\/Button'/);
    });
    it('renders EDIT as a secondary Button', () => {
      expect(src).toMatch(/variant="secondary"[\s\S]*?label="EDIT"/);
    });
    it('drops the deprecated editBtn text style', () => {
      expect(src).not.toMatch(/^\s+editBtnText:/m);
    });
  });

  describe('StoreScreen', () => {
    const src = read('src/screens/StoreScreen.tsx');
    it('imports the shared Button component', () => {
      expect(src).toMatch(/from '\.\.\/components\/Button'/);
    });
    it('renders the purchase Button as a gradient with dynamic price/deficit label', () => {
      expect(src).toMatch(/variant="gradient"[\s\S]*?label=\{canAfford \?[\s\S]*?\}/);
      expect(src).toMatch(/disabled=\{!canAfford\}/);
    });
    it('renders COMING SOON as a disabled secondary Button', () => {
      expect(src).toMatch(/variant="secondary"[\s\S]*?label="COMING SOON"[\s\S]*?disabled/);
    });
    it('drops the deprecated puBtn / ccBtn text + gradient styles', () => {
      expect(src).not.toMatch(/^\s+puBtnGradient:/m);
      expect(src).not.toMatch(/^\s+puBtnText:/m);
      expect(src).not.toMatch(/^\s+puBtnTextDim:/m);
      expect(src).not.toMatch(/^\s+puBtnDisabled:/m);
      expect(src).not.toMatch(/^\s+ccBtnInner:/m);
      expect(src).not.toMatch(/^\s+ccBtnText:/m);
    });
  });

  describe('PieceSandboxScreen (dev)', () => {
    const src = read('src/screens/dev/PieceSandboxScreen.tsx');
    it('imports the shared Button component', () => {
      expect(src).toMatch(/from '\.\.\/\.\.\/components\/Button'/);
    });
    it('renders RESET as a secondary Button', () => {
      expect(src).toMatch(/variant="secondary"[\s\S]*?label="RESET"/);
    });
    it('renders ENGAGE MACHINE as a primary Button (label preserved)', () => {
      expect(src).toMatch(/variant="primary"[\s\S]*?label="ENGAGE MACHINE"/);
    });
    it('drops the deprecated resetBtn / engageBtn StyleSheet entries', () => {
      expect(src).not.toMatch(/^\s+resetBtn:/m);
      expect(src).not.toMatch(/^\s+resetText:/m);
      expect(src).not.toMatch(/^\s+engageBtn:/m);
      expect(src).not.toMatch(/^\s+engageText:/m);
    });
  });
});
