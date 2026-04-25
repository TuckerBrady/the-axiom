import React from 'react';
import { View, Text, TouchableOpacity, StyleSheet } from 'react-native';
import { Colors, Fonts, FontSizes } from '../theme/tokens';

type Props = { children: React.ReactNode; onReset?: () => void };
type State = { hasError: boolean; error: Error | null };

export default class GameplayErrorBoundary extends React.Component<Props, State> {
  state: State = { hasError: false, error: null };

  static getDerivedStateFromError(error: Error): State {
    return { hasError: true, error };
  }

  componentDidCatch(error: Error, info: React.ErrorInfo): void {
    // Inline the dev-tools check — do NOT import devFlags here, since
    // that module could itself be involved in a crash path.
    if (__DEV__ || process.env.EXPO_PUBLIC_SHOW_DEV_TOOLS === 'true') {
      console.error('[GameplayErrorBoundary]', error, info.componentStack);
    }
  }

  reset = (): void => {
    this.setState({ hasError: false, error: null });
    this.props.onReset?.();
  };

  render(): React.ReactNode {
    if (!this.state.hasError) return this.props.children;
    return (
      <View style={styles.root}>
        <Text style={styles.title}>RUNTIME ERROR</Text>
        <Text style={styles.message}>
          The machine stalled. The engagement has been halted. Tap Reset to
          restore the level and try again. If this continues, note the error
          below and report it.
        </Text>
        <Text style={styles.code} numberOfLines={6}>
          {this.state.error?.message ?? 'unknown'}
        </Text>
        <TouchableOpacity onPress={this.reset} style={styles.btn}>
          <Text style={styles.btnText}>RESET</Text>
        </TouchableOpacity>
      </View>
    );
  }
}

const styles = StyleSheet.create({
  root: { flex: 1, alignItems: 'center', justifyContent: 'center', padding: 24, backgroundColor: Colors.void },
  title: { color: Colors.red, fontFamily: Fonts.exo2, fontSize: FontSizes.xl, marginBottom: 12 },
  message: { color: Colors.muted, fontFamily: Fonts.exo2, fontSize: FontSizes.sm, textAlign: 'center', marginBottom: 20 },
  code: { color: Colors.amber, fontFamily: 'Courier', fontSize: 11, marginBottom: 24, opacity: 0.75 },
  btn: { borderColor: Colors.amber, borderWidth: 1, paddingHorizontal: 24, paddingVertical: 10 },
  btnText: { color: Colors.amber, fontFamily: Fonts.exo2, fontSize: FontSizes.md },
});
