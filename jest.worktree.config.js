// Worktree-local jest config. Uses testRegex instead of testMatch to avoid
// micromatch glob-escape issues with the \.claude\ segment in the worktree path.
const base = require('./jest.config.js');

const unitProject = base.projects[0];
const integProject = base.projects[1];

module.exports = {
  ...base,
  projects: [
    {
      ...unitProject,
      testMatch: undefined,
      testRegex: '__tests__/unit/.*\\.test\\.(ts|tsx)$',
    },
    {
      ...integProject,
      testMatch: undefined,
      testRegex: '__tests__/integration/.*\\.test\\.(ts|tsx)$',
    },
  ],
};
