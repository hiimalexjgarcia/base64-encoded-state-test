/**
 * Jest setup file - minimal setup
 */

const { TextEncoder, TextDecoder } = require('util');
if (typeof global.TextEncoder === 'undefined') {
  global.TextEncoder = TextEncoder;
}
if (typeof global.TextDecoder === 'undefined') {
  global.TextDecoder = TextDecoder;
}

// Mock DOM elements for tests that need them
if (typeof document !== 'undefined') {
  document.body.innerHTML = `
    <div id="notes"></div>
    <span id="notesDisplayCount"></span>
    <input type="search" id="notesInputSearch" />
    <form id="addNoteForm">
      <input name="note" />
      <textarea name="detail"></textarea>
    </form>
  `;
}

// Suppress console errors during tests
const originalError = console.error;
console.error = (...args) => {
  if (typeof args[0] === 'string' && /Failed to parse selector/.test(args[0])) {
    return;
  }
  originalError(...args);
};
