# Build 25 — TurboModule Crash Patch Research

**Date:** 2026-05-05
**Branch:** fix/turbomodule-crash-patch
**Build target:** 25

---

## Summary

Build 23 crashes on iOS 26 with SIGSEGV in `RCTTurboModule.mm::performVoidMethodInvocation`.
This report documents Phase 0 research findings and the chosen patch strategy.

---

## Issue #54859 — React Native (facebook/react-native)

**Status:** Open, no upstream fix merged as of 2026-05-05.

**Root cause confirmed:** When an async TurboModule void method dispatched on a GCD background
queue throws an NSException, `performVoidMethodInvocation` calls
`convertNSExceptionToJSError` and rethrows into the Hermes JS heap from the wrong thread.
Nothing above the GCD dispatch can catch the rethrown C++ exception, so the OS terminates
the process with SIGSEGV (or SIGABRT on some devices).

**Relationship to #50193 / prior partial fix:** A previous PR (#50193) patched
`performMethodInvocation` (the non-void path). In RN 0.81.5, that fix is present:
`performMethodInvocation` now contains an `if (isSync)` guard and uses `@throw exception`
for the async path. However, `performVoidMethodInvocation` was not included in that fix
and still throws unconditionally on line 438 of `RCTTurboModule.mm`.

**Conclusion:** Our RN 0.81.5 does NOT contain the fix for the void path. This patch
is NOT a no-op.

---

## Discussion #276 — React Native Working Group

**URL:** https://github.com/reactwg/react-native-new-architecture/discussions/276

**Key finding:** Authoritative patch for `performVoidMethodInvocation`. The void method
block executes on a dispatch queue — there is no JS stack to receive a thrown `jsi::JSError`.
The fix is to catch the NSException, log it via `RCTLogError`, and return from the block
instead of throwing.

**Real-world validation cited in the discussion:** One company rolled this fix to 5% of
users and all `pthread_kill` and Hermes segfault crashes in that cohort disappeared.

**Exact patch (authoritative):**

```diff
-    } @catch (NSException *exception) {
-      throw convertNSExceptionToJSError(runtime, exception, std::string{moduleName}, methodNameStr);
+    } @catch (NSException *exception) {
+      RCTLogError(@"[TurboModule] %s::%s: %@", moduleName, methodName, exception);
+      return;
     } @finally {
```

File: `node_modules/react-native/ReactCommon/react/nativemodule/core/platform/ios/ReactCommon/RCTTurboModule.mm`
Function: `ObjCTurboModule::performVoidMethodInvocation` (~line 437)

---

## PAC / Hermes Issue — Expo #44680 / expo/expo#44356

**Status:** Open, unresolved, NOT addressed by this patch.

**What it is:** On iOS 26 physical devices (A-series chips with PAC enforcement enabled in
hardware), Hermes crashes at launch with `KERN_PROTECTION_FAILURE`. The CPU detects that
Hermes is using unsigned or incorrectly signed pointers — a violation of ARM64 Pointer
Authentication Codes. Simulators are unaffected (PAC is not hardware-enforced there).

**Impact:** 100% reproduction rate on physical iOS 26 devices. This is a complete blocker
independent of the TurboModule void method crash.

**Why we do not fix it here:** Requires a Hermes rebuild with PAC-aware pointer handling.
This is an upstream Hermes/React Native responsibility. No workaround exists at the app level.

**Monitoring:** Track expo/expo#44680 and facebook/hermes for upstream resolution.

---

## Our RN Version

`react-native@0.81.5` — confirmed `performVoidMethodInvocation` still has the unpatched throw.
`performMethodInvocation` has been partially patched (sync/async guard present).

---

## Patch Strategy

**Chosen: Option B — Expo Config Plugin (`withDangerousMod`)**

Rationale:
- Works transparently in EAS builds: `npm install` → `expo prebuild` (plugin patches
  node_modules) → `pod install` (uses patched file) → build.
- No dependency on `patch-package` or changes to postinstall chain.
- Patch is version-pinned via the idempotency check (skips if already applied, warns if
  target pattern is missing after an RN upgrade).

Plugin location: `plugins/withTurboModulePatch.js`
Registered in: `app.json` under `expo.plugins`

---

## Files Modified

- `plugins/withTurboModulePatch.js` — new Expo config plugin
- `app.json` — registered new plugin

---

## Build Status

Build 25 triggered: https://expo.dev/accounts/tuckerbrady/projects/the-axiom/builds/673054cb-6b28-4b3a-af9d-08b74aa14a02
buildNumber incremented 24 → 25 automatically by EAS.
