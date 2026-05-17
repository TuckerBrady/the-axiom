/**
 * Verification: patch-package successfully patched RCTTurboModule.mm.
 *
 * Background:
 *   Build 34 crashed on Thread 5 with EXC_BAD_ACCESS (SIGSEGV) /
 *   KERN_INVALID_ADDRESS inside
 *     ObjCTurboModule::performVoidMethodInvocation
 *       -> convertNSExceptionToJSError
 *   …because the void method block runs on a GCD background queue.
 *   Nothing above the dispatch queue can catch a C++ exception
 *   thrown from the wrong thread, so Hermes crashes.
 *
 *   The original fix (commit e2f2c9e) used an Expo config plugin
 *   (`./plugins/withTurboModulePatch` via `withDangerousMod`) to
 *   replace the throw with `RCTLogError + return`. That plugin only
 *   runs during `expo prebuild`; EAS bare-workflow builds skip
 *   prebuild, so the patch never applied and the unpatched code
 *   shipped in every build through Build 34.
 *
 *   The replacement strategy uses patch-package via a `postinstall`
 *   hook — patch-package runs in every `npm install`, including
 *   EAS Build's install step.
 *
 * This test verifies the patch is applied to the local
 * node_modules copy of RCTTurboModule.mm. It runs after every
 * `npm install` (postinstall -> patch-package -> patch applies),
 * so the lint suite catches any regression where the patch fails
 * to apply (rejected hunk, file moved, react-native version bump).
 *
 * Pass conditions inside the `performVoidMethodInvocation`
 * function block (search the next 40 lines after the function
 * declaration — this scopes detection to the void path only, NOT
 * the non-void `performMethodInvocation` path, which also calls
 * convertNSExceptionToJSError but is handled differently):
 *
 *   1. NO occurrence of `throw convertNSExceptionToJSError`
 *   2. AT LEAST ONE occurrence of `RCTLogError(@"[TurboModule]`
 *
 * Canonical reference: project-docs/REPORTS/build34-crashlog.crash
 */

import * as fs from 'fs';
import * as path from 'path';

const RCT_TURBO_MODULE_PATH = path.resolve(
  __dirname,
  '../../node_modules/react-native/ReactCommon/react/nativemodule/core/platform/ios/ReactCommon/RCTTurboModule.mm',
);

const VOID_FN_DECL = 'void ObjCTurboModule::performVoidMethodInvocation';
const THROW_SIGNATURE = 'throw convertNSExceptionToJSError';
const PATCH_MARKER = 'RCTLogError(@"[TurboModule]';
const SCOPE_LINES = 40;

describe('[REQ-PATCH-VOID] TurboModule void patch applied via patch-package', () => {
  it('RCTTurboModule.mm exists in node_modules (npm install ran)', () => {
    expect(fs.existsSync(RCT_TURBO_MODULE_PATH)).toBe(true);
  });

  it('performVoidMethodInvocation no longer throws convertNSExceptionToJSError', () => {
    const source = fs.readFileSync(RCT_TURBO_MODULE_PATH, 'utf-8');
    const lines = source.split('\n');

    const fnLineIdx = lines.findIndex(l => l.includes(VOID_FN_DECL));
    expect(fnLineIdx).toBeGreaterThanOrEqual(0);

    const scopeEnd = Math.min(lines.length, fnLineIdx + SCOPE_LINES);
    const scope = lines.slice(fnLineIdx, scopeEnd).join('\n');

    if (scope.includes(THROW_SIGNATURE)) {
      throw new Error(
        'TurboModule void patch NOT applied.\n' +
        '  Found "' + THROW_SIGNATURE + '" within ' + SCOPE_LINES + ' lines of\n' +
        '  "' + VOID_FN_DECL + '"\n' +
        '  in ' + RCT_TURBO_MODULE_PATH + '.\n' +
        '\n' +
        '  The throw must be replaced with RCTLogError + return so that\n' +
        '  C++ exceptions are not raised from the GCD background queue\n' +
        '  used by void method invocations. Confirm patch-package ran\n' +
        '  successfully during postinstall and the patch in\n' +
        '  patches/react-native+0.81.5.patch matches the current\n' +
        '  RCTTurboModule.mm layout.',
      );
    }
  });

  it('performVoidMethodInvocation contains RCTLogError patch marker', () => {
    const source = fs.readFileSync(RCT_TURBO_MODULE_PATH, 'utf-8');
    const lines = source.split('\n');

    const fnLineIdx = lines.findIndex(l => l.includes(VOID_FN_DECL));
    expect(fnLineIdx).toBeGreaterThanOrEqual(0);

    const scopeEnd = Math.min(lines.length, fnLineIdx + SCOPE_LINES);
    const scope = lines.slice(fnLineIdx, scopeEnd).join('\n');

    if (!scope.includes(PATCH_MARKER)) {
      throw new Error(
        'TurboModule void patch marker missing.\n' +
        '  Did not find "' + PATCH_MARKER + '" within ' + SCOPE_LINES + ' lines of\n' +
        '  "' + VOID_FN_DECL + '"\n' +
        '  in ' + RCT_TURBO_MODULE_PATH + '.\n' +
        '\n' +
        '  Either the patch did not apply or it modified a different\n' +
        '  function. Verify patches/react-native+0.81.5.patch and\n' +
        '  re-run `npm install` to retrigger patch-package.',
      );
    }
  });
});
