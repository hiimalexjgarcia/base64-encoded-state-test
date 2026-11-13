/**
 * Jest setup file. jsdom does not expose these globally in every runtime, so
 * the app's UTF-8 codec gets Node's implementations. The page markup comes
 * from the real index.html via tests/support/appHarness.ts.
 */

const { TextEncoder, TextDecoder } = require('util');

if (typeof global.TextEncoder === 'undefined') {
  global.TextEncoder = TextEncoder;
}
if (typeof global.TextDecoder === 'undefined') {
  global.TextDecoder = TextDecoder;
}

// jsdom does not expose structuredClone. Note state is plain JSON data, so a
// JSON clone is sufficient for tests.
if (typeof globalThis.structuredClone !== 'function') {
  globalThis.structuredClone = (value) => JSON.parse(JSON.stringify(value));
}
