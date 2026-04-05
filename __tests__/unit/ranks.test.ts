const RANKS = [
  { id: 'R01', name: 'Salvager', minXP: 0 },
  { id: 'R02', name: 'Apprentice', minXP: 100 },
  { id: 'R03', name: 'Technician', minXP: 300 },
  { id: 'R04', name: 'Mechanic', minXP: 600 },
  { id: 'R05', name: 'Engineer', minXP: 1000 },
  { id: 'R06', name: 'Lead Engineer', minXP: 1500 },
  { id: 'R07', name: 'Systems Architect', minXP: 2200 },
  { id: 'R08', name: 'Chief Engineer', minXP: 3000 },
  { id: 'R09', name: 'Captain', minXP: 4000 },
  { id: 'R10', name: 'Commander', minXP: 5500 },
];

function getRankForXP(xp: number) {
  return [...RANKS].reverse().find(r => xp >= r.minXP) || RANKS[0];
}

describe('Rank system', () => {
  it('returns Salvager at 0 XP', () => {
    expect(getRankForXP(0).id).toBe('R01');
  });

  it('returns Mechanic at 600 XP', () => {
    expect(getRankForXP(600).id).toBe('R04');
  });

  it('returns Commander at max XP', () => {
    expect(getRankForXP(9999).id).toBe('R10');
  });

  it('returns correct rank at exact threshold', () => {
    expect(getRankForXP(1000).id).toBe('R05');
  });

  it('returns rank below threshold when 1 XP short', () => {
    expect(getRankForXP(999).id).toBe('R04');
  });

  it('all 10 ranks exist', () => {
    expect(RANKS).toHaveLength(10);
  });
});
