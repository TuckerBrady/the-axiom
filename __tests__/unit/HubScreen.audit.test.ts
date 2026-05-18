/**
 * Static analysis: HubScreen credits color audit fix (PROMPT_120 Fix 4).
 *
 * The CREDITS value in the 2x2 instrument grid was rendered using the
 * local GREEN constant (#4ADE80). Credits across the rest of the app
 * use Colors.copper (#C87941). This pins the credits cell to copper
 * while leaving the GREEN constant intact for the sector-pip "done"
 * state that legitimately uses it.
 */

import * as fs from 'fs';
import * as path from 'path';

const HUB_PATH = path.resolve(__dirname, '../../src/screens/HubScreen.tsx');

describe('HubScreen — credits color audit (Fix 4)', () => {
  let source: string;

  beforeAll(() => {
    source = fs.readFileSync(HUB_PATH, 'utf-8');
  });

  it('does not render the credits value with the GREEN constant', () => {
    // The JSX shape is `<Text style={[st.gridValue, { color: X }]}>{credits}</Text>`
    // which has two closing braces between the array close and the JSX `>`:
    // one for the inline color object and one for the style-prop expression.
    expect(source).not.toMatch(/st\.gridValue,\s*\{\s*color:\s*GREEN\s*\}\s*\]\}>\{credits\}/);
  });

  it('renders the credits value with Colors.copper', () => {
    expect(source).toMatch(/st\.gridValue,\s*\{\s*color:\s*Colors\.copper\s*\}\s*\]\}>\{credits\}/);
  });

  it('still imports the Colors palette from theme/tokens', () => {
    expect(source).toMatch(/import\s*\{[^}]*\bColors\b[^}]*\}\s*from\s*['"]\.\.\/theme\/tokens['"]/);
  });
});
