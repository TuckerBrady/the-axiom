import React from 'react';
import {
  StyleSheet,
  Text,
  TouchableOpacity,
  type TextStyle,
  type ViewStyle,
} from 'react-native';
import { Colors, Fonts, Spacing } from '../theme/tokens';

export type ButtonVariant = 'primary' | 'secondary' | 'danger' | 'gradient';

export interface ButtonProps {
  label: string;
  onPress: () => void;
  variant?: ButtonVariant;
  disabled?: boolean;
  style?: ViewStyle | ViewStyle[];
}

const ACTIVE_OPACITY: Record<ButtonVariant, number> = {
  primary: 0.75,
  secondary: 0.7,
  danger: 0.75,
  gradient: 0.85,
};

export const Button = React.forwardRef<React.ElementRef<typeof TouchableOpacity>, ButtonProps>(
  ({ label, onPress, variant = 'primary', disabled = false, style }, ref) => {
    const containerStyle: ViewStyle[] = [
      styles[`${variant}Button`],
      ...(disabled ? [styles.disabled] : []),
      ...(Array.isArray(style) ? style : style ? [style] : []),
    ];

    const textStyle: TextStyle[] = [
      styles[`${variant}Text`],
      ...(disabled ? [styles.disabledText] : []),
    ];

    return (
      <TouchableOpacity
        ref={ref}
        style={containerStyle}
        onPress={onPress}
        disabled={disabled}
        activeOpacity={disabled ? 1 : ACTIVE_OPACITY[variant]}
      >
        <Text style={textStyle}>{label}</Text>
      </TouchableOpacity>
    );
  },
);

Button.displayName = 'Button';

const styles = StyleSheet.create({
  primaryButton: {
    backgroundColor: 'rgba(0,212,255,0.08)',
    borderWidth: 1.5,
    borderColor: 'rgba(0,212,255,0.4)',
    borderRadius: 10,
    paddingVertical: Spacing.md,
    paddingHorizontal: Spacing.lg,
    minHeight: 48,
    alignItems: 'center',
    justifyContent: 'center',
  },
  primaryText: {
    fontFamily: Fonts.orbitron,
    fontSize: 12,
    fontWeight: 'bold',
    color: '#00D4FF',
    letterSpacing: 1.5,
  },
  secondaryButton: {
    backgroundColor: 'transparent',
    borderWidth: 1,
    borderColor: Colors.steel,
    borderRadius: 10,
    paddingVertical: Spacing.sm,
    paddingHorizontal: Spacing.md,
    minHeight: 40,
    alignItems: 'center',
    justifyContent: 'center',
  },
  secondaryText: {
    fontFamily: Fonts.spaceMono,
    fontSize: 11,
    fontWeight: '500',
    color: Colors.muted,
    letterSpacing: 1,
  },
  dangerButton: {
    backgroundColor: 'rgba(224,85,85,0.06)',
    borderWidth: 1.5,
    borderColor: 'rgba(224,85,85,0.3)',
    borderRadius: 10,
    paddingVertical: Spacing.md,
    paddingHorizontal: Spacing.lg,
    minHeight: 48,
    alignItems: 'center',
    justifyContent: 'center',
  },
  dangerText: {
    fontFamily: Fonts.orbitron,
    fontSize: 12,
    fontWeight: 'bold',
    color: Colors.red,
    letterSpacing: 1.5,
  },
  gradientButton: {
    backgroundColor: 'rgba(200,121,65,0.10)',
    borderWidth: 1.5,
    borderColor: 'rgba(200,121,65,0.5)',
    borderRadius: 10,
    paddingVertical: Spacing.lg,
    paddingHorizontal: Spacing.xxl,
    minHeight: 52,
    alignItems: 'center',
    justifyContent: 'center',
  },
  gradientText: {
    fontFamily: Fonts.orbitron,
    fontSize: 14,
    fontWeight: 'bold',
    color: '#f0b429',
    letterSpacing: 2,
  },
  disabled: {
    opacity: 0.5,
  },
  disabledText: {
    color: Colors.dim,
  },
});

export default Button;
