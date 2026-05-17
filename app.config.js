const { execSync } = require('child_process');

let commitHash = 'unknown';
try {
  commitHash = execSync('git rev-parse --short=8 HEAD').toString().trim();
} catch {
  commitHash = 'unknown';
}

module.exports = ({ config }) => ({
  ...config,
  extra: {
    ...config.extra,
    commitHash,
  },
});
