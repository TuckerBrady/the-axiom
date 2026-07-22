/**
 * Smoke Runner Integration Tests
 *
 * These tests validate the smoke runner script (scripts/run-smoke.sh)
 * once it is implemented. They are wrapped in describe.skip until Dev
 * builds the runner per SPEC-SMOKE-001 (project-docs/SPECS/maestro-smoke-suite.md).
 *
 * Each test cites the clause it validates.
 *
 * To activate: remove .skip from the outer describe block after the
 * runner script and all 16 Maestro flows are implemented.
 */

import { execSync, ExecSyncOptionsWithStringEncoding } from 'child_process';
import * as fs from 'fs';
import * as path from 'path';

const ROOT = path.resolve(__dirname, '..', '..');
const RUNNER_PATH = path.join(ROOT, 'scripts', 'run-smoke.sh');
const RESULTS_PATH = path.join(ROOT, 'smoke-results.json');
const FLOWS_DIR = path.join(ROOT, '.maestro', 'flows');
const SUBFLOWS_DIR = path.join(ROOT, '.maestro', 'subflows');
const PACKAGE_JSON_PATH = path.join(ROOT, 'package.json');
const GITIGNORE_PATH = path.join(ROOT, '.gitignore');

const execOpts: ExecSyncOptionsWithStringEncoding = {
  cwd: ROOT,
  encoding: 'utf-8',
  timeout: 30_000,
};

// ---------------------------------------------------------------------------
// SCAFFOLDING (Section 1)
// ---------------------------------------------------------------------------

describe.skip('Smoke Runner — Scaffolding', () => {
  // Clause 1.1.5
  test('runner script exists at scripts/run-smoke.sh', () => {
    expect(fs.existsSync(RUNNER_PATH)).toBe(true);
  });

  // Clause 1.3.1
  test('every smoke flow declares appId: com.tuckbrady.theaxiom', () => {
    const flows = fs.readdirSync(FLOWS_DIR).filter((f) => f.startsWith('smoke_'));
    expect(flows.length).toBeGreaterThanOrEqual(16);

    for (const flowFile of flows) {
      const content = fs.readFileSync(path.join(FLOWS_DIR, flowFile), 'utf-8');
      expect(content).toContain('appId: com.tuckbrady.theaxiom');
    }
  });

  // Clause 1.2.1
  test('smoke flow files follow naming convention smoke_NN_<name>.yaml', () => {
    const flows = fs.readdirSync(FLOWS_DIR).filter((f) => f.startsWith('smoke_'));
    const pattern = /^smoke_\d{2}_[a-z0-9_]+\.yaml$/;

    for (const flowFile of flows) {
      expect(flowFile).toMatch(pattern);
    }
  });

  // Clause 1.2.2
  test('no flow files exist for manual-only items 04 and 17', () => {
    const flows = fs.readdirSync(FLOWS_DIR);
    const manualFlows = flows.filter(
      (f) => f.startsWith('smoke_04') || f.startsWith('smoke_17')
    );
    expect(manualFlows).toHaveLength(0);
  });

  // Clause 1.2.3
  test('existing flows are preserved unchanged', () => {
    const existingFlows = ['complete-level.yaml', 'hub-navigation.yaml', 'daily-challenge.yaml'];
    for (const flow of existingFlows) {
      expect(fs.existsSync(path.join(FLOWS_DIR, flow))).toBe(true);
    }
  });

  // Clause 1.4.1
  test('shared subflows directory exists', () => {
    expect(fs.existsSync(SUBFLOWS_DIR)).toBe(true);
  });

  // Clause 1.4.2
  test('subflows do not declare appId', () => {
    if (!fs.existsSync(SUBFLOWS_DIR)) return;
    const subflows = fs.readdirSync(SUBFLOWS_DIR).filter((f) => f.endsWith('.yaml'));

    for (const subflow of subflows) {
      const content = fs.readFileSync(path.join(SUBFLOWS_DIR, subflow), 'utf-8');
      // appId should not appear before the --- separator or at all
      const frontMatter = content.split('---')[0] || '';
      expect(frontMatter).not.toContain('appId');
    }
  });
});

// ---------------------------------------------------------------------------
// FLOW COMPLETENESS (Section 2)
// ---------------------------------------------------------------------------

describe.skip('Smoke Runner — Flow Completeness', () => {
  const expectedFlows = [
    'smoke_01_cold_launch.yaml',
    'smoke_02_bottom_nav.yaml',
    'smoke_03_hub_sectors.yaml',
    // smoke_04 is manual-only (clause 2.4.1)
    'smoke_05_codex.yaml',
    'smoke_06_a1_1_tutorial.yaml',
    'smoke_07_a1_2_through_a1_8.yaml',
    'smoke_08_piece_interactions.yaml',
    'smoke_09_signal_beam.yaml',
    'smoke_10_tape_system.yaml',
    'smoke_11_credit_economy.yaml',
    'smoke_12_arc_wheel_tutorial.yaml',
    'smoke_13_hud_cogs_eye.yaml',
    'smoke_14_daily_challenge.yaml',
    'smoke_15_kepler_levels.yaml',
    'smoke_16_back_navigation.yaml',
    // smoke_17 is manual-only (clause 2.17.1)
    'smoke_18_settings_persistence.yaml',
  ];

  // Clause 1.2.1 + Section 2 completeness
  test('all 16 automated flow files exist', () => {
    for (const flow of expectedFlows) {
      expect(fs.existsSync(path.join(FLOWS_DIR, flow))).toBe(true);
    }
  });

  // Clause 2.6.1 — Build 19 regression gate
  test('smoke_06 references awaitPlacement boundary (REQ-A-1)', () => {
    const content = fs.readFileSync(
      path.join(FLOWS_DIR, 'smoke_06_a1_1_tutorial.yaml'),
      'utf-8'
    );
    // The flow should contain a comment or action referencing awaitPlacement
    expect(content.toLowerCase()).toContain('awaitplacement');
  });

  // Clause 2.12.1 — Build 19 regression gate (arc wheel)
  test('smoke_12 references awaitPlacement boundary (REQ-A-1)', () => {
    const content = fs.readFileSync(
      path.join(FLOWS_DIR, 'smoke_12_arc_wheel_tutorial.yaml'),
      'utf-8'
    );
    expect(content.toLowerCase()).toContain('awaitplacement');
  });
});

// ---------------------------------------------------------------------------
// RUNNER SCRIPT (Section 3)
// ---------------------------------------------------------------------------

describe.skip('Smoke Runner — Runner Script', () => {
  // Clause 3.1.2
  test('runner script is executable', () => {
    const stats = fs.statSync(RUNNER_PATH);
    const isExecutable = (stats.mode & 0o111) !== 0;
    expect(isExecutable).toBe(true);
  });

  // Clause 3.6.1
  test('runner does not accept --skip-smoke flag', () => {
    const content = fs.readFileSync(RUNNER_PATH, 'utf-8');
    expect(content).not.toContain('--skip-smoke');
    expect(content).not.toContain('--force');
    expect(content).not.toContain('SKIP_SMOKE');
  });

  // Clause 3.6.2
  test('runner does not check environment variables for bypass', () => {
    const content = fs.readFileSync(RUNNER_PATH, 'utf-8');
    // No env var that could disable smoke
    expect(content).not.toMatch(/DISABLE_SMOKE|SKIP_SMOKE|NO_SMOKE|BYPASS_SMOKE/);
  });

  // Clause 3.5.1
  test('package.json defines smoke and smoke:ci scripts', () => {
    const pkg = JSON.parse(fs.readFileSync(PACKAGE_JSON_PATH, 'utf-8'));
    expect(pkg.scripts).toHaveProperty('smoke');
    expect(pkg.scripts).toHaveProperty('smoke:ci');
    expect(pkg.scripts.smoke).toContain('run-smoke.sh');
    expect(pkg.scripts['smoke:ci']).toContain('run-smoke.sh');
    expect(pkg.scripts['smoke:ci']).toContain('--ci');
  });

  // Clause 3.3.3
  test('smoke-results.json is in .gitignore', () => {
    const gitignore = fs.readFileSync(GITIGNORE_PATH, 'utf-8');
    expect(gitignore).toContain('smoke-results.json');
  });

  // Clause 3.4.1, 3.4.2, 3.4.3 — exit code semantics
  // These cannot be tested without actually running the suite against a simulator.
  // The test below validates the runner script contains the expected exit code logic.
  test('runner script handles exit codes 0, 1, and 2', () => {
    const content = fs.readFileSync(RUNNER_PATH, 'utf-8');
    expect(content).toContain('exit 0');
    expect(content).toContain('exit 1');
    expect(content).toContain('exit 2');
  });

  // Clause 3.7.1 — prerequisite checks
  test('runner checks for maestro CLI availability', () => {
    const content = fs.readFileSync(RUNNER_PATH, 'utf-8');
    expect(content).toContain('maestro');
    // Should check if maestro is available before running flows
    expect(content).toMatch(/command -v maestro|which maestro|maestro --version/);
  });
});

// ---------------------------------------------------------------------------
// BUILD GATE (Section 4)
// ---------------------------------------------------------------------------

describe.skip('Smoke Runner — Build Gate', () => {
  const BUILD_CMD_PATH = path.join(ROOT, '.claude', 'commands', 'build.md');

  // Clause 4.2.1
  test('/build command includes Phase 0: Smoke', () => {
    const content = fs.readFileSync(BUILD_CMD_PATH, 'utf-8');
    expect(content.toLowerCase()).toContain('phase 0');
    expect(content).toContain('smoke');
  });

  // Clause 4.2.2
  test('Phase 0 is defined before Phase 1', () => {
    const content = fs.readFileSync(BUILD_CMD_PATH, 'utf-8');
    const phase0Idx = content.indexOf('Phase 0');
    const phase1Idx = content.indexOf('Phase 1');
    expect(phase0Idx).toBeGreaterThan(-1);
    expect(phase1Idx).toBeGreaterThan(-1);
    expect(phase0Idx).toBeLessThan(phase1Idx);
  });

  // Clause 4.2.3
  test('Phase 0 runs npm run smoke:ci', () => {
    const content = fs.readFileSync(BUILD_CMD_PATH, 'utf-8');
    expect(content).toContain('smoke:ci');
  });

  // Clause 4.3.2
  test('/build LAST_REPORT template includes Smoke section', () => {
    const content = fs.readFileSync(BUILD_CMD_PATH, 'utf-8');
    expect(content).toContain('## Smoke');
  });
});

// ---------------------------------------------------------------------------
// JSON REPORT SCHEMA (Section 3.3.2)
// ---------------------------------------------------------------------------

describe.skip('Smoke Runner — JSON Report Schema', () => {
  // This test validates the schema of smoke-results.json after a run.
  // It only runs if the file exists (post-smoke-run).
  test('smoke-results.json matches expected schema', () => {
    if (!fs.existsSync(RESULTS_PATH)) {
      // File only exists after a smoke run — skip gracefully
      return;
    }

    const report = JSON.parse(fs.readFileSync(RESULTS_PATH, 'utf-8'));

    // Top-level fields (clause 3.3.2)
    expect(report).toHaveProperty('suite', 'smoke');
    expect(report).toHaveProperty('timestamp');
    expect(report).toHaveProperty('build');
    expect(report).toHaveProperty('device');
    expect(report).toHaveProperty('results');
    expect(report).toHaveProperty('summary');

    // Results array
    expect(Array.isArray(report.results)).toBe(true);
    expect(report.results.length).toBe(18);

    for (const result of report.results) {
      expect(result).toHaveProperty('id');
      expect(result).toHaveProperty('name');
      expect(result).toHaveProperty('status');
      expect(['PASS', 'FAIL', 'SKIP']).toContain(result.status);
    }

    // Summary
    expect(report.summary).toHaveProperty('pass');
    expect(report.summary).toHaveProperty('fail');
    expect(report.summary).toHaveProperty('skip');
    expect(report.summary).toHaveProperty('total', 18);
    expect(report.summary.skip).toBe(2); // Items 4 and 17
  });
});
