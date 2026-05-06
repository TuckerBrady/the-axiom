// Patches RCTTurboModule.mm to fix a crash on iOS 26 where performVoidMethodInvocation
// throws a C++ exception (converted from NSException) from a GCD background block.
// Nothing above the dispatch queue can catch it, causing SIGSEGV.
//
// Fix: catch the NSException, log via RCTLogError, and return from the block instead.
// Source: https://github.com/reactwg/react-native-new-architecture/discussions/276
// Upstream issue: https://github.com/facebook/react-native/issues/54859 (open as of 2026-05-05)
//
// This patch is idempotent and version-aware:
//   - Already patched: skips silently.
//   - Target pattern not found: warns (indicates RN upgraded past the bug, patch may be safe to remove).

const { withDangerousMod } = require('@expo/config-plugins');
const fs = require('fs');
const path = require('path');

// The old code throws a C++ exception (converted from NSException) from inside a GCD block.
// We match the narrowest unique slice: the @catch that directly precedes @finally with no
// intervening conditional (unlike performMethodInvocation which has an if (isSync) guard).
const OLD_CATCH =
  '    } @catch (NSException *exception) {\n' +
  '      throw convertNSExceptionToJSError(runtime, exception, std::string{moduleName}, methodNameStr);\n' +
  '    } @finally {';

// Log the exception with module and method context, then return from the block safely.
const NEW_CATCH =
  '    } @catch (NSException *exception) {\n' +
  '      // iOS 26 crash fix: void method block runs on a GCD queue — nothing above can catch a\n' +
  '      // rethrown C++ exception. Log and return instead of throwing into Hermes from wrong thread.\n' +
  '      // See: https://github.com/reactwg/react-native-new-architecture/discussions/276\n' +
  '      RCTLogError(@"[TurboModule] %s::%s: %@", moduleName, methodName, exception);\n' +
  '      return;\n' +
  '    } @finally {';

const ALREADY_PATCHED_SENTINEL = 'RCTLogError(@"[TurboModule] %s::%s: %@", moduleName, methodName, exception);';

const TURBOMODULE_PATH = path.join(
  'node_modules',
  'react-native',
  'ReactCommon',
  'react',
  'nativemodule',
  'core',
  'platform',
  'ios',
  'ReactCommon',
  'RCTTurboModule.mm'
);

const withTurboModulePatch = (config) =>
  withDangerousMod(config, [
    'ios',
    (modConfig) => {
      const filePath = path.join(modConfig.modRequest.projectRoot, TURBOMODULE_PATH);

      if (!fs.existsSync(filePath)) {
        console.warn('[withTurboModulePatch] RCTTurboModule.mm not found at expected path — skipping.');
        return modConfig;
      }

      const content = fs.readFileSync(filePath, 'utf-8');

      if (content.includes(ALREADY_PATCHED_SENTINEL)) {
        console.log('[withTurboModulePatch] Already patched — skipping.');
        return modConfig;
      }

      if (!content.includes(OLD_CATCH)) {
        console.warn(
          '[withTurboModulePatch] Target pattern not found in RCTTurboModule.mm. ' +
            'The RN version may have changed. Verify whether this plugin is still needed.'
        );
        return modConfig;
      }

      const patched = content.replace(OLD_CATCH, NEW_CATCH);
      fs.writeFileSync(filePath, patched, 'utf-8');
      console.log('[withTurboModulePatch] Patched performVoidMethodInvocation in RCTTurboModule.mm.');

      return modConfig;
    },
  ]);

module.exports = withTurboModulePatch;
