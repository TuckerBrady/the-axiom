import { useConsequenceStore } from '../../src/store/consequenceStore';
import { getHudState, getHudCornerColor, getHudScanLineColor, getHudHeaderBorderColor } from '../../src/utils/hudState';

describe('hudState', () => {
  beforeEach(() => {
    useConsequenceStore.setState({ cogsIntegrity: 100, damagedSystems: [] });
  });

  it('nominal when integrity=100 and no damage', () => {
    expect(getHudState()).toBe('nominal');
  });

  it('degraded when integrity < 80', () => {
    useConsequenceStore.setState({ cogsIntegrity: 60 });
    expect(getHudState()).toBe('degraded');
  });

  it('degraded when systems damaged', () => {
    useConsequenceStore.setState({ damagedSystems: ['propulsionCore'] });
    expect(getHudState()).toBe('degraded');
  });

  it('critical when integrity < 40', () => {
    useConsequenceStore.setState({ cogsIntegrity: 20 });
    expect(getHudState()).toBe('critical');
  });

  it('getHudCornerColor returns correct colors', () => {
    expect(getHudCornerColor('critical')).toContain('224,85,85');
    expect(getHudCornerColor('degraded')).toContain('240,180,41');
    expect(getHudCornerColor('nominal')).toContain('74,158,255');
  });

  it('getHudScanLineColor returns correct colors', () => {
    expect(getHudScanLineColor('critical')).toContain('224,85,85');
    expect(getHudScanLineColor('nominal')).toContain('74,158,255');
  });

  it('getHudHeaderBorderColor returns correct colors', () => {
    expect(getHudHeaderBorderColor('degraded')).toContain('240,180,41');
    expect(getHudHeaderBorderColor('nominal')).toContain('74,158,255');
  });
});
