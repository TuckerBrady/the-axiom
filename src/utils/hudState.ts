import { useConsequenceStore } from '../store/consequenceStore';

export type HudState = 'critical' | 'degraded' | 'nominal';

export function getHudState(): HudState {
  const { cogsIntegrity, damagedSystems } = useConsequenceStore.getState();
  if (cogsIntegrity < 40) return 'critical';
  if (damagedSystems.length > 0 || cogsIntegrity < 80) return 'degraded';
  return 'nominal';
}

export function getHudCornerColor(state: HudState): string {
  switch (state) {
    case 'critical': return 'rgba(224,85,85,0.45)';
    case 'degraded': return 'rgba(240,180,41,0.45)';
    case 'nominal':  return 'rgba(74,158,255,0.45)';
  }
}

export function getHudScanLineColor(state: HudState): string {
  switch (state) {
    case 'critical': return 'rgba(224,85,85,0.18)';
    case 'degraded': return 'rgba(240,180,41,0.18)';
    case 'nominal':  return 'rgba(74,158,255,0.18)';
  }
}

export function getHudHeaderBorderColor(state: HudState): string {
  switch (state) {
    case 'critical': return 'rgba(224,85,85,0.15)';
    case 'degraded': return 'rgba(240,180,41,0.15)';
    case 'nominal':  return 'rgba(74,158,255,0.15)';
  }
}
