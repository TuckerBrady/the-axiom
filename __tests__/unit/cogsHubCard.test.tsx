// Lightweight prop-contract tests for CogsHubCard. This project does not
// perform React Native render tests in the unit/integration tiers (Maestro
// covers full render), so we verify the component's default prop values and
// the strings the Hub passes by inspecting the source.

import * as fs from 'fs';
import * as path from 'path';

describe('CogsHubCard role prop contract', () => {
  const cardSource = fs.readFileSync(
    path.resolve(__dirname, '../../src/components/cogs/CogsHubCard.tsx'),
    'utf8',
  );
  const hubSource = fs.readFileSync(
    path.resolve(__dirname, '../../src/screens/HubScreen.tsx'),
    'utf8',
  );

  it('default role falls back to TRANSMISSION (generic, non-duplicate of name)', () => {
    expect(cardSource).toMatch(/role\s*=\s*['"]TRANSMISSION['"]/);
    // Explicitly guard against the Prompt 16 regression (role defaulting to
    // the same string as name).
    expect(cardSource).not.toMatch(/role\s*=\s*['"]C\.O\.G\.S UNIT 7['"]/);
  });

  it('role prop remains optional on the Props interface', () => {
    expect(cardSource).toMatch(/role\?:\s*string/);
  });

  it('amber mission card passes role="MISSION BRIEFING"', () => {
    expect(hubSource).toMatch(/role="MISSION BRIEFING"/);
  });

  it('blue bounty card passes role="BOUNTY TRANSMISSION"', () => {
    expect(hubSource).toMatch(/role="BOUNTY TRANSMISSION"/);
  });

  it('name prop default remains "C.O.G.S Unit 7" (top line)', () => {
    expect(cardSource).toMatch(/name\s*=\s*['"]C\.O\.G\.S Unit 7['"]/);
  });
});
