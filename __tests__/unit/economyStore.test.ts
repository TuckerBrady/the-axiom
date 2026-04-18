import { useEconomyStore } from '../../src/store/economyStore';

beforeEach(() => {
  useEconomyStore.setState({ credits: 100, levelBudget: 0, levelSpent: 0 });
});

describe('spendDirect', () => {
  it('deducts credits when sufficient', () => {
    const ok = useEconomyStore.getState().spendDirect(50);
    expect(ok).toBe(true);
    expect(useEconomyStore.getState().credits).toBe(50);
  });

  it('returns false when insufficient credits', () => {
    useEconomyStore.setState({ credits: 30 });
    const ok = useEconomyStore.getState().spendDirect(50);
    expect(ok).toBe(false);
    expect(useEconomyStore.getState().credits).toBe(30);
  });

  it('deducts exact amount', () => {
    const ok = useEconomyStore.getState().spendDirect(100);
    expect(ok).toBe(true);
    expect(useEconomyStore.getState().credits).toBe(0);
  });

  it('handles zero amount', () => {
    const ok = useEconomyStore.getState().spendDirect(0);
    expect(ok).toBe(true);
    expect(useEconomyStore.getState().credits).toBe(100);
  });
});
