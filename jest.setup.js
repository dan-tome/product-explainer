// Jest 30 rejects require() calls that happen inside lazy property getters
// (like expo's winter runtime installs on global). The fix is two-pronged:
//
// 1. Pre-stub __ExpoImportMetaRegistry so expo's ImportMetaRegistry getter
//    fires during module loading (still in scope) rather than truly lazily.
//
// 2. Lock the native Node.js globals as non-configurable BEFORE expo loads.
//    expo/src/winter/installGlobal.ts explicitly checks configurable and
//    returns early without installing any lazy getter when it's false.
//    This prevents the deferred require() that jest 30 rejects.
global.__ExpoImportMetaRegistry = {};

function lockNativeGlobal(name) {
  const val = global[name];
  if (val !== undefined) {
    Object.defineProperty(global, name, {
      value: val,
      configurable: false,
      writable: true,
      enumerable: false,
    });
  }
}

// All of these are natively available in Node.js 22.
// expo/src/winter/runtime.native.ts tries to polyfill each with a lazy getter.
lockNativeGlobal('structuredClone');
lockNativeGlobal('TextDecoder');
lockNativeGlobal('TextEncoder');
lockNativeGlobal('URL');
lockNativeGlobal('URLSearchParams');
