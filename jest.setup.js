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

// Mock the DOM structure the app expects in index.html
if (typeof document !== 'undefined') {
  document.body.innerHTML = `
    <div class="container">
      <h1>Notes</h1>
      <div class="d-flex mb-3" role="group" aria-label="Note controls">
        <button type="button" id="addNoteBtn" class="btn btn-primary">Add Note</button>
        <button type="button" id="copyLinkBtn" class="btn">Copy link</button>
        <button type="button" id="clearCompletedBtn" class="btn">Clear completed</button>
        <label>
          <input type="checkbox" id="showCompletedCheckbox" />
          Show completed
        </label>
        <span id="notesDisplayCount" class="flex-fill text-right" aria-live="polite" aria-atomic="true"></span>
        <input type="search" id="notesInputSearch" name="q" aria-label="Search notes" />
      </div>
      <div id="notes"></div>
    </div>
  `;
}
