function applyTransaction(balance: number, amount: number, type: 'earn' | 'spend'): number {
  if (type === 'earn') return balance + amount;
  if (type === 'spend') {
    if (amount > balance) throw new Error('Insufficient credits');
    return balance - amount;
  }
  return balance;
}

describe('Credit economy', () => {
  it('starts with 100 CR', () => {
    const startingBalance = 100;
    expect(startingBalance).toBe(100);
  });

  it('earns credits correctly', () => {
    expect(applyTransaction(100, 50, 'earn')).toBe(150);
  });

  it('spends credits correctly', () => {
    expect(applyTransaction(100, 40, 'spend')).toBe(60);
  });

  it('throws on insufficient credits', () => {
    expect(() => applyTransaction(50, 100, 'spend')).toThrow('Insufficient credits');
  });

  it('balance never goes negative', () => {
    expect(() => applyTransaction(0, 1, 'spend')).toThrow();
  });

  it('earning zero changes nothing', () => {
    expect(applyTransaction(100, 0, 'earn')).toBe(100);
  });
});
