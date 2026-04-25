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
});
