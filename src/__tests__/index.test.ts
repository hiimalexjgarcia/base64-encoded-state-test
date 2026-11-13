/**
 * Integration tests for src/index.ts — boots the real app against the jsdom
 * toolbar DOM, then drives it through DOM events like a user would.
 *
 * index.ts self-initializes on import, so each test gets a fresh module
 * registry (fresh AppState singleton) via jest.resetModules().
 */

import { jest } from '@jest/globals';
import { decodeState, encodeState, MAX_ENCODED_LENGTH } from '../utils/urlState';
import { Note, NOTE_COLORS, NOTE_VALIDATION } from '../types';

type AppStateInstance = typeof import('../state/appState').default;

const TOOLBAR_HTML = `
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

const makeNote = (overrides: Partial<Note> = {}): Note => ({
  id: 'a',
  title: 'Note A',
  body: '',
  ...overrides,
});

const hashFor = (notes: Note[]): string => encodeState({ notes });

/**
 * Rebuilds the toolbar DOM, points the URL at the given encoded state, and
 * boots a fresh app instance. Returns that instance's AppState singleton.
 */
const loadApp = async (encoded = ''): Promise<AppStateInstance> => {
  jest.resetModules();
  document.body.innerHTML = TOOLBAR_HTML;
  Object.defineProperty(document, 'readyState', {
    value: 'complete',
    configurable: true,
  });
  window.history.replaceState(null, '', `/#/${encoded}`);
  await import('../index');
  const { default: AppState } = await import('../state/appState');

  return AppState;
};

const byId = <T extends HTMLElement>(id: string): T =>
  document.getElementById(id) as T;

const noteEl = (id: string): HTMLElement | null =>
  document.querySelector<HTMLElement>(`.note[data-id="${id}"]`);

const typeKey = (target: EventTarget, key: string, init: KeyboardEventInit = {}): void => {
  target.dispatchEvent(new KeyboardEvent('keydown', { key, bubbles: true, ...init }));
};

describe('app bootstrap', () => {
  it('renders notes decoded from the URL hash and shows the count', async () => {
    await loadApp(hashFor([
      makeNote({ id: 'a', title: 'Groceries', body: 'Milk' }),
      makeNote({ id: 'b', title: 'Homework', body: 'Math' }),
    ]));

    expect(document.querySelectorAll('#notes .note')).toHaveLength(2);
    expect(noteEl('a')?.querySelector('.note-title')?.textContent).toBe('Groceries');
    expect(byId('notesDisplayCount').textContent).toBe('2 notes');
  });

  it('shows the no-notes empty state on a blank hash', async () => {
    const state = await loadApp('');

    expect(state.notes.getAll()).toEqual([]);
    expect(document.querySelector('.notes-empty')?.textContent).toContain('No notes yet');
    expect(byId('notesDisplayCount').textContent).toBe('0 notes');
  });

  it('preserves an undecodable hash and offers a start-empty recovery', async () => {
    const broken = '!!!not-base64!!!';
    const state = await loadApp(broken);

    expect(state.notes.getAll()).toEqual([]);
    expect(document.querySelector('.notes-empty')).not.toBeNull();
    expect(window.location.hash).toBe(`#/${broken}`);

    const warning = document.getElementById('decodeWarning');
    expect(warning?.textContent).toMatch(/base64url/i);
    expect(warning?.textContent).toMatch(/original link is unchanged/i);

    const startEmpty = warning?.querySelector('button');
    expect(startEmpty?.textContent).toBe('Start empty');
    startEmpty?.click();

    expect(window.location.hash).toBe('#/');
    expect(document.getElementById('decodeWarning')).toBeNull();
  });

  it('explains an unsupported link version without erasing it', async () => {
    const encoded = btoa(JSON.stringify({ v: 2, n: [] }))
      .replace(/\+/g, '-')
      .replace(/\//g, '_')
      .replace(/=+$/, '');
    await loadApp(encoded);

    expect(window.location.hash).toBe(`#/${encoded}`);
    expect(document.getElementById('decodeWarning')?.textContent).toMatch(
      /newer version/i,
    );
  });

  it('explains an oversized link without erasing it', async () => {
    const oversized = 'a'.repeat(MAX_ENCODED_LENGTH + 1);
    await loadApp(oversized);

    expect(window.location.hash).toBe(`#/${oversized}`);
    expect(document.getElementById('decodeWarning')?.textContent).toMatch(
      /too long/i,
    );
  });

  it('hides completed notes by default', async () => {
    await loadApp(hashFor([
      makeNote({ id: 'a', title: 'Active' }),
      makeNote({ id: 'b', title: 'Done', completed: true }),
    ]));

    expect(noteEl('a')).not.toBeNull();
    expect(noteEl('b')).toBeNull();
  });

  it('reloads state on hashchange', async () => {
    const state = await loadApp(hashFor([makeNote({ id: 'a', title: 'Note A' })]));

    window.history.replaceState(null, '', `/#/${hashFor([makeNote({ id: 'z', title: 'Note Z' })])}`);
    window.dispatchEvent(new Event('hashchange'));

    expect(state.notes.getAll().map((n) => n.id)).toEqual(['z']);
    expect(noteEl('z')?.querySelector('.note-title')?.textContent).toBe('Note Z');
  });

  it('resets state when the hash is cleared', async () => {
    const state = await loadApp(hashFor([makeNote({ id: 'a', title: 'Shared' })]));
    expect(state.notes.getAll()).toHaveLength(1);

    window.history.replaceState(null, '', '/#');
    window.dispatchEvent(new Event('hashchange'));

    expect(state.notes.getAll()).toEqual([]);
    expect(document.querySelector('.notes-empty')?.textContent).toContain('No notes yet');
  });

  it('loads state from a hash without the #/ prefix', async () => {
    const encoded = hashFor([makeNote({ id: 'z', title: 'No prefix' })]);
    jest.resetModules();
    document.body.innerHTML = TOOLBAR_HTML;
    Object.defineProperty(document, 'readyState', {
      value: 'complete',
      configurable: true,
    });
    window.history.replaceState(null, '', `/#${encoded}`);
    await import('../index');
    const { default: AppState } = await import('../state/appState');

    expect(AppState.notes.getAll().map((n) => n.id)).toEqual(['z']);
    expect(noteEl('z')?.querySelector('.note-title')?.textContent).toBe('No prefix');
  });

  it('reloads state from a hashchange without the #/ prefix', async () => {
    const state = await loadApp('');
    const encoded = hashFor([makeNote({ id: 'z', title: 'Changed' })]);

    window.history.replaceState(null, '', `/#${encoded}`);
    window.dispatchEvent(new Event('hashchange'));

    expect(state.notes.getAll().map((n) => n.id)).toEqual(['z']);
    expect(noteEl('z')?.querySelector('.note-title')?.textContent).toBe('Changed');
  });

  it('boots on DOMContentLoaded when the document is still loading', async () => {
    jest.resetModules();
    document.body.innerHTML = TOOLBAR_HTML;
    Object.defineProperty(document, 'readyState', {
      value: 'loading',
      configurable: true,
    });
    window.history.replaceState(null, '', `/#/${hashFor([makeNote({ id: 'a', title: 'Deferred' })])}`);
    await import('../index');
    const { default: AppState } = await import('../state/appState');

    expect(document.querySelector('#notes .note')).toBeNull();

    document.dispatchEvent(new Event('DOMContentLoaded'));

    expect(AppState.notes.getAll()).toHaveLength(1);
    expect(document.querySelector('.note-title')?.textContent).toBe('Deferred');
  });
});

describe('toolbar interactions', () => {
  it('creates a note and enters inline edit when Add Note is clicked', async () => {
    const state = await loadApp('');
    byId<HTMLButtonElement>('addNoteBtn').click();

    const notes = state.notes.getAll();
    expect(notes).toHaveLength(1);
    expect(notes[0].title).toBe('New Note');
    expect(notes[0].color).toBeDefined();

    const input = document.querySelector('.note-title-input') as HTMLInputElement;
    expect(input).not.toBeNull();
    expect(input.value).toBe('New Note');
    expect(input.getAttribute('aria-label')).toBe('Note title');
    expect(document.activeElement).toBe(input);

    const bodyInput = document.querySelector('.note-body-input') as HTMLTextAreaElement;
    expect(bodyInput.getAttribute('aria-label')).toBe('Note body');
  });

  it('saves inline edits and syncs the URL hash', async () => {
    const state = await loadApp('');
    byId<HTMLButtonElement>('addNoteBtn').click();

    (document.querySelector('.note-title-input') as HTMLInputElement).value = 'Buy milk';
    (document.querySelector('.note-body-input') as HTMLTextAreaElement).value = '2%';
    (document.querySelector('button[aria-label="Save note"]') as HTMLButtonElement).click();

    const notes = state.notes.getAll();
    expect(notes[0].title).toBe('Buy milk');
    expect(notes[0].body).toBe('2%');
    expect(document.querySelector('.note-title-input')).toBeNull();
    expect(document.querySelector('.note-title')?.textContent).toBe('Buy milk');
    expect(window.location.hash.length).toBeGreaterThan(2);
  });

  it('preserves completed, pinned, and color when saving an inline edit', async () => {
    const state = await loadApp(hashFor([
      makeNote({ id: 'a', title: 'Keep', completed: true, pinned: true, color: 'blue' }),
    ]));
    byId<HTMLInputElement>('showCompletedCheckbox').checked = true;
    byId<HTMLInputElement>('showCompletedCheckbox').dispatchEvent(new Event('change'));

    (noteEl('a')?.querySelector('.note-edit') as HTMLButtonElement).click();
    (document.querySelector('.note-title-input') as HTMLInputElement).value = 'Kept';
    (document.querySelector('button[aria-label="Save note"]') as HTMLButtonElement).click();

    const note = state.notes.getAll()[0];
    expect(note.title).toBe('Kept');
    expect(note.completed).toBe(true);
    expect(note.pinned).toBe(true);
    expect(note.color).toBe('blue');
  });

  it('shows an error and keeps editing when the title is empty', async () => {
    const state = await loadApp('');
    byId<HTMLButtonElement>('addNoteBtn').click();
    (document.querySelector('.note-title-input') as HTMLInputElement).value = '   ';
    (document.querySelector('button[aria-label="Save note"]') as HTMLButtonElement).click();

    expect(state.notes.getAll()[0].title).toBe('New Note');
    expect(document.querySelector('.note-title-input')).not.toBeNull();
    expect(document.querySelector('.note-edit-error')?.textContent).toContain('title');
    expect(
      (document.querySelector('.note-title-input') as HTMLInputElement).getAttribute('aria-invalid'),
    ).toBe('true');
  });

  it('limits inline inputs to the note validation caps', async () => {
    await loadApp('');
    byId<HTMLButtonElement>('addNoteBtn').click();

    const titleInput = document.querySelector('.note-title-input') as HTMLInputElement;
    const bodyInput = document.querySelector('.note-body-input') as HTMLTextAreaElement;

    expect(titleInput.maxLength).toBe(NOTE_VALIDATION.TITLE_MAX_LENGTH);
    expect(bodyInput.maxLength).toBe(NOTE_VALIDATION.BODY_MAX_LENGTH);
  });

  it('reports an over-limit edit instead of silently dropping it', async () => {
    const state = await loadApp('');
    byId<HTMLButtonElement>('addNoteBtn').click();
    const input = document.querySelector('.note-title-input') as HTMLInputElement;
    input.value = 'x'.repeat(NOTE_VALIDATION.TITLE_MAX_LENGTH + 1);
    (document.querySelector('button[aria-label="Save note"]') as HTMLButtonElement).click();

    expect(state.notes.getAll()[0].title).toBe('New Note');
    expect(document.querySelector('.note-title-input')).not.toBeNull();
    expect(document.querySelector('.note-edit-error')?.textContent).toContain(
      String(NOTE_VALIDATION.TITLE_MAX_LENGTH),
    );
  });

  it('clears the save error when the user resumes typing', async () => {
    await loadApp('');
    byId<HTMLButtonElement>('addNoteBtn').click();
    const input = document.querySelector('.note-title-input') as HTMLInputElement;
    input.value = '';
    (document.querySelector('button[aria-label="Save note"]') as HTMLButtonElement).click();
    expect(document.querySelector('.note-edit-error')).not.toBeNull();

    input.value = 'Fixed';
    input.dispatchEvent(new Event('input'));

    expect(document.querySelector('.note-edit-error')).toBeNull();
    expect(input.getAttribute('aria-invalid')).toBeNull();
  });

  it('edits a note whose id contains selector characters', async () => {
    const weirdId = 'a"]';
    const state = await loadApp(hashFor([makeNote({ id: weirdId, title: 'Crafted' })]));
    const rendered = document.querySelector('#notes .note') as HTMLElement;

    expect(rendered.dataset.id).toBe(weirdId);
    (rendered.querySelector('.note-edit') as HTMLButtonElement).click();

    const input = document.querySelector('.note-title-input') as HTMLInputElement;
    expect(input.value).toBe('Crafted');

    input.value = 'Fixed';
    (document.querySelector('button[aria-label="Save note"]') as HTMLButtonElement).click();

    expect(state.notes.getAll()[0].title).toBe('Fixed');
  });

  it('cancels an edit on Escape', async () => {
    const state = await loadApp('');
    byId<HTMLButtonElement>('addNoteBtn').click();
    const input = document.querySelector('.note-title-input') as HTMLInputElement;
    input.value = 'Discard me';
    typeKey(input, 'Escape');

    expect(state.notes.getAll()[0].title).toBe('New Note');
    expect(document.querySelector('.note-title-input')).toBeNull();
  });

  it('saves an edit on Ctrl+Enter', async () => {
    const state = await loadApp('');
    byId<HTMLButtonElement>('addNoteBtn').click();
    const input = document.querySelector('.note-title-input') as HTMLInputElement;
    input.value = 'Keyboard saved';
    typeKey(input, 'Enter', { ctrlKey: true });

    expect(state.notes.getAll()[0].title).toBe('Keyboard saved');
    expect(document.querySelector('.note-title-input')).toBeNull();
  });

  it('debounces search and then filters notes', async () => {
    await loadApp(hashFor([
      makeNote({ id: 'a', title: 'Groceries' }),
      makeNote({ id: 'b', title: 'Homework' }),
    ]));
    const search = byId<HTMLInputElement>('notesInputSearch');

    jest.useFakeTimers();
    try {
      search.value = 'Homework';
      search.dispatchEvent(new Event('input'));

      // The previous render is still on screen until typing settles.
      expect(document.querySelectorAll('#notes .note')).toHaveLength(2);
      jest.advanceTimersByTime(99);
      expect(document.querySelectorAll('#notes .note')).toHaveLength(2);

      jest.advanceTimersByTime(1);
      expect(document.querySelectorAll('#notes .note')).toHaveLength(1);
      expect(noteEl('b')).not.toBeNull();

      search.value = 'qqqqqqqq';
      search.dispatchEvent(new Event('input'));
      jest.advanceTimersByTime(100);
      expect(document.querySelectorAll('#notes .note')).toHaveLength(0);
      expect(document.querySelector('.notes-empty')?.textContent).toContain('No notes match');

      search.value = '';
      search.dispatchEvent(new Event('input'));
      jest.advanceTimersByTime(100);
      expect(document.querySelectorAll('#notes .note')).toHaveLength(2);
    } finally {
      jest.useRealTimers();
    }
  });

  it('announces the visible count against the total while filtering', async () => {
    await loadApp(hashFor([
      makeNote({ id: 'a', title: 'Groceries' }),
      makeNote({ id: 'b', title: 'Homework' }),
    ]));

    jest.useFakeTimers();
    try {
      const search = byId<HTMLInputElement>('notesInputSearch');
      search.value = 'Homework';
      search.dispatchEvent(new Event('input'));
      jest.advanceTimersByTime(100);

      expect(byId('notesDisplayCount').textContent).toBe('1 of 2 notes');

      search.value = '';
      search.dispatchEvent(new Event('input'));
      jest.advanceTimersByTime(100);
      expect(byId('notesDisplayCount').textContent).toBe('2 notes');
    } finally {
      jest.useRealTimers();
    }
  });

  it('clears an active search so a new note is visible and editable', async () => {
    const state = await loadApp(hashFor([
      makeNote({ id: 'a', title: 'Alpha' }),
      makeNote({ id: 'b', title: 'Beta' }),
    ]));

    jest.useFakeTimers();
    try {
      const search = byId<HTMLInputElement>('notesInputSearch');
      search.value = 'Alpha';
      search.dispatchEvent(new Event('input'));
      jest.advanceTimersByTime(100);
      expect(document.querySelectorAll('#notes .note')).toHaveLength(1);

      byId<HTMLButtonElement>('addNoteBtn').click();
    } finally {
      jest.useRealTimers();
    }

    expect(state.notes.getAll()).toHaveLength(3);
    expect(byId<HTMLInputElement>('notesInputSearch').value).toBe('');
    expect(document.querySelectorAll('#notes .note')).toHaveLength(3);
    expect(document.querySelector('.note-title-input')).not.toBeNull();
  });

  it('reveals completed notes when Show completed is toggled', async () => {
    await loadApp(hashFor([
      makeNote({ id: 'a', title: 'Active' }),
      makeNote({ id: 'b', title: 'Done', completed: true }),
    ]));

    const checkbox = byId<HTMLInputElement>('showCompletedCheckbox');
    checkbox.checked = true;
    checkbox.dispatchEvent(new Event('change'));

    expect(noteEl('b')).not.toBeNull();
    expect(document.querySelectorAll('#notes .note')).toHaveLength(2);
  });

  it('marks a note complete and hides it, then shows the all-completed empty state', async () => {
    const state = await loadApp(hashFor([makeNote({ id: 'a', title: 'Only note' })]));

    const checkbox = document.querySelector('.note-complete-checkbox') as HTMLInputElement;
    checkbox.checked = true;
    checkbox.dispatchEvent(new Event('change'));

    expect(state.notes.getAll()[0].completed).toBe(true);
    expect(document.querySelectorAll('#notes .note')).toHaveLength(0);
    expect(document.querySelector('.notes-empty')?.textContent).toContain('All notes are completed');
  });

  it('sorts a pinned note to the top', async () => {
    const state = await loadApp(hashFor([
      makeNote({ id: 'a', title: 'First' }),
      makeNote({ id: 'b', title: 'Second' }),
    ]));

    (noteEl('b')?.querySelector('.note-pin') as HTMLButtonElement).click();

    expect(state.notes.getAll().find((n) => n.id === 'b')?.pinned).toBe(true);
    expect(document.querySelector('#notes .note')?.getAttribute('data-id')).toBe('b');
  });

  it('cycles note colors through the palette', async () => {
    const state = await loadApp(hashFor([makeNote({ id: 'a' })]));

    (noteEl('a')?.querySelector('.note-color') as HTMLButtonElement).click();
    expect(state.notes.getAll()[0].color).toBe(NOTE_COLORS[0]);
    expect(noteEl('a')?.classList.contains(`note-color-${NOTE_COLORS[0]}`)).toBe(true);

    (noteEl('a')?.querySelector('.note-color') as HTMLButtonElement).click();
    expect(state.notes.getAll()[0].color).toBe(NOTE_COLORS[1]);
  });

  it('cancels an edit with the cancel button', async () => {
    const state = await loadApp('');
    byId<HTMLButtonElement>('addNoteBtn').click();
    (document.querySelector('button[aria-label="Cancel edit"]') as HTMLButtonElement).click();

    expect(state.notes.getAll()[0].title).toBe('New Note');
    expect(document.querySelector('.note-title-input')).toBeNull();
  });

  it('returns focus to the note Edit button after saving', async () => {
    await loadApp(hashFor([
      makeNote({ id: 'a', title: 'First' }),
      makeNote({ id: 'b', title: 'Second' }),
    ]));

    (noteEl('a')?.querySelector('.note-edit') as HTMLButtonElement).click();
    (document.querySelector('.note-title-input') as HTMLInputElement).value = 'Updated';
    (document.querySelector('button[aria-label="Save note"]') as HTMLButtonElement).click();

    expect(document.activeElement).toBe(noteEl('a')?.querySelector('.note-edit'));
  });

  it('returns focus to the note Edit button after cancelling', async () => {
    await loadApp(hashFor([
      makeNote({ id: 'a', title: 'First' }),
      makeNote({ id: 'b', title: 'Second' }),
    ]));

    (noteEl('a')?.querySelector('.note-edit') as HTMLButtonElement).click();
    (document.querySelector('button[aria-label="Cancel edit"]') as HTMLButtonElement).click();

    expect(document.activeElement).toBe(noteEl('a')?.querySelector('.note-edit'));
  });

  it('cancels with Escape when focus is on the Save button', async () => {
    await loadApp(hashFor([makeNote({ id: 'a', title: 'First' })]));

    (noteEl('a')?.querySelector('.note-edit') as HTMLButtonElement).click();
    const saveBtn = document.querySelector('button[aria-label="Save note"]') as HTMLButtonElement;
    saveBtn.focus();
    typeKey(saveBtn, 'Escape');

    expect(document.querySelector('.note-title-input')).toBeNull();
    expect(document.activeElement).toBe(noteEl('a')?.querySelector('.note-edit'));
  });

  it('switches inline edit when another note is edited', async () => {
    await loadApp(hashFor([
      makeNote({ id: 'a', title: 'First' }),
      makeNote({ id: 'b', title: 'Second' }),
    ]));

    (noteEl('a')?.querySelector('.note-edit') as HTMLButtonElement).click();
    expect(noteEl('a')?.querySelector('.note-title-input')).not.toBeNull();

    (noteEl('b')?.querySelector('.note-edit') as HTMLButtonElement).click();

    expect(noteEl('a')?.querySelector('.note-title-input')).toBeNull();
    expect(noteEl('b')?.querySelector('.note-title-input')).not.toBeNull();
  });

  it('saves an in-progress edit before applying a search filter', async () => {
    const state = await loadApp(hashFor([
      makeNote({ id: 'a', title: 'Groceries' }),
      makeNote({ id: 'b', title: 'Homework' }),
    ]));

    (noteEl('a')?.querySelector('.note-edit') as HTMLButtonElement).click();
    const titleInput = document.querySelector('.note-title-input') as HTMLInputElement;
    titleInput.value = 'Groceries list';
    titleInput.dispatchEvent(new Event('input'));

    jest.useFakeTimers();
    try {
      const search = byId<HTMLInputElement>('notesInputSearch');
      search.value = 'Homework';
      search.dispatchEvent(new Event('input'));
      jest.advanceTimersByTime(100);

      expect(state.notes.getAll().find((n) => n.id === 'a')?.title).toBe('Groceries list');
      expect(document.querySelector('.note-title-input')).toBeNull();
      expect(document.querySelectorAll('#notes .note')).toHaveLength(1);
      expect(noteEl('b')).not.toBeNull();
    } finally {
      jest.useRealTimers();
    }
  });

  it('keeps an invalid edit open and does not apply the search', async () => {
    await loadApp(hashFor([makeNote({ id: 'a', title: 'Groceries' })]));

    (noteEl('a')?.querySelector('.note-edit') as HTMLButtonElement).click();
    const titleInput = document.querySelector('.note-title-input') as HTMLInputElement;
    titleInput.value = '';
    titleInput.dispatchEvent(new Event('input'));

    jest.useFakeTimers();
    try {
      const search = byId<HTMLInputElement>('notesInputSearch');
      search.value = 'zzz';
      search.dispatchEvent(new Event('input'));
      jest.advanceTimersByTime(100);
    } finally {
      jest.useRealTimers();
    }

    expect(document.querySelectorAll('#notes .note')).toHaveLength(1);
    expect(document.querySelector('.note-title-input')).not.toBeNull();
    expect(document.querySelector('.note-edit-error')?.textContent).toContain('title');
  });

  it('saves an in-progress edit before toggling completed visibility', async () => {
    const state = await loadApp(hashFor([makeNote({ id: 'a', title: 'First' })]));

    (noteEl('a')?.querySelector('.note-edit') as HTMLButtonElement).click();
    const titleInput = document.querySelector('.note-title-input') as HTMLInputElement;
    titleInput.value = 'Updated';
    titleInput.dispatchEvent(new Event('input'));

    const checkbox = byId<HTMLInputElement>('showCompletedCheckbox');
    checkbox.checked = true;
    checkbox.dispatchEvent(new Event('change'));

    expect(state.notes.getAll()[0].title).toBe('Updated');
    expect(document.querySelector('.note-title-input')).toBeNull();
  });

  it('reverts the completed toggle when the draft is invalid', async () => {
    await loadApp(hashFor([makeNote({ id: 'a', title: 'First' })]));

    (noteEl('a')?.querySelector('.note-edit') as HTMLButtonElement).click();
    const titleInput = document.querySelector('.note-title-input') as HTMLInputElement;
    titleInput.value = '';
    titleInput.dispatchEvent(new Event('input'));

    const checkbox = byId<HTMLInputElement>('showCompletedCheckbox');
    checkbox.checked = true;
    checkbox.dispatchEvent(new Event('change'));

    expect(checkbox.checked).toBe(false);
    expect(document.querySelector('.note-title-input')).not.toBeNull();
    expect(document.querySelector('.note-edit-error')).not.toBeNull();
  });

  it('preserves an in-progress edit when another note changes', async () => {
    const state = await loadApp(hashFor([
      makeNote({ id: 'a', title: 'First' }),
      makeNote({ id: 'b', title: 'Second' }),
    ]));

    (noteEl('a')?.querySelector('.note-edit') as HTMLButtonElement).click();
    const titleInput = document.querySelector('.note-title-input') as HTMLInputElement;
    titleInput.value = 'Draft title';
    titleInput.dispatchEvent(new Event('input'));

    (noteEl('b')?.querySelector('.note-complete-checkbox') as HTMLInputElement).click();

    const restored = document.querySelector('.note-title-input') as HTMLInputElement;
    expect(restored).not.toBeNull();
    expect(restored.value).toBe('Draft title');
    // The draft has not been committed to state yet.
    expect(state.notes.getAll().find((n) => n.id === 'a')?.title).toBe('First');
  });

  it('replaces an existing undo toast when another note is deleted', async () => {
    const state = await loadApp(hashFor([
      makeNote({ id: 'a', title: 'First' }),
      makeNote({ id: 'b', title: 'Second' }),
    ]));

    (noteEl('a')?.querySelector('.note-delete') as HTMLButtonElement).click();
    (noteEl('b')?.querySelector('.note-delete') as HTMLButtonElement).click();

    expect(state.notes.getAll()).toEqual([]);
    expect(document.querySelectorAll('#undoToast')).toHaveLength(1);

    (document.querySelector('#undoToast button') as HTMLButtonElement).click();
    expect(state.notes.getAll().map((n) => n.id)).toEqual(['b']);
  });

  it('deletes a note and restores it via the undo toast', async () => {
    const state = await loadApp(hashFor([
      makeNote({ id: 'a', title: 'First' }),
      makeNote({ id: 'b', title: 'Second' }),
    ]));

    (noteEl('a')?.querySelector('.note-delete') as HTMLButtonElement).click();
    expect(state.notes.getAll().map((n) => n.id)).toEqual(['b']);

    const toast = document.querySelector('#undoToast') as HTMLElement;
    expect(toast.textContent).toContain('Note deleted.');
    expect(toast.getAttribute('role')).toBe('region');
    expect(toast.querySelector('[role="status"]')?.getAttribute('aria-live')).toBe('polite');
    (toast.querySelector('button') as HTMLButtonElement).click();

    expect(state.notes.getAll().map((n) => n.id)).toEqual(['a', 'b']);
    expect(document.querySelector('#undoToast')).toBeNull();
  });

  it('pauses the undo timeout while the Undo button is focused', async () => {
    await loadApp(hashFor([makeNote({ id: 'a', title: 'First' })]));
    jest.useFakeTimers();
    try {
      (noteEl('a')?.querySelector('.note-delete') as HTMLButtonElement).click();
      const undoBtn = document.querySelector('#undoToast button') as HTMLButtonElement;
      expect(undoBtn).not.toBeNull();

      // Showing the toast focuses Undo, so the countdown stays paused.
      jest.advanceTimersByTime(6000);
      expect(document.querySelector('#undoToast')).not.toBeNull();

      undoBtn.blur();
      jest.advanceTimersByTime(5999);
      expect(document.querySelector('#undoToast')).not.toBeNull();
      jest.advanceTimersByTime(1);
      expect(document.querySelector('#undoToast')).toBeNull();
    } finally {
      jest.useRealTimers();
    }
  });

  it('pauses the undo timeout while the toast is hovered', async () => {
    await loadApp(hashFor([makeNote({ id: 'a', title: 'First' })]));
    jest.useFakeTimers();
    try {
      (noteEl('a')?.querySelector('.note-delete') as HTMLButtonElement).click();
      const toast = document.querySelector('#undoToast') as HTMLElement;
      (toast.querySelector('button') as HTMLButtonElement).blur();

      toast.dispatchEvent(new MouseEvent('mouseenter'));
      jest.advanceTimersByTime(6000);
      expect(document.querySelector('#undoToast')).not.toBeNull();

      toast.dispatchEvent(new MouseEvent('mouseleave'));
      jest.advanceTimersByTime(6000);
      expect(document.querySelector('#undoToast')).toBeNull();
    } finally {
      jest.useRealTimers();
    }
  });

  it('drops the undo history when navigating to another board', async () => {
    const state = await loadApp(hashFor([makeNote({ id: 'a', title: 'Old board' })]));

    (noteEl('a')?.querySelector('.note-delete') as HTMLButtonElement).click();
    expect(document.querySelector('#undoToast')).not.toBeNull();

    window.history.replaceState(
      null,
      '',
      `/#/${hashFor([makeNote({ id: 'b', title: 'New board' })])}`,
    );
    window.dispatchEvent(new Event('hashchange'));

    expect(document.querySelector('#undoToast')).toBeNull();
    expect(state.notes.getAll().map((n) => n.id)).toEqual(['b']);
  });

  it('dismisses the undo toast with its dismiss button', async () => {
    const state = await loadApp(hashFor([
      makeNote({ id: 'a', title: 'First' }),
      makeNote({ id: 'b', title: 'Second' }),
    ]));

    (noteEl('a')?.querySelector('.note-delete') as HTMLButtonElement).click();
    (document.querySelector('.undo-toast-dismiss') as HTMLButtonElement).click();

    expect(document.querySelector('#undoToast')).toBeNull();
    expect(state.notes.getAll().map((n) => n.id)).toEqual(['b']);
  });

  it('dismisses the undo toast on Escape', async () => {
    const state = await loadApp(hashFor([
      makeNote({ id: 'a', title: 'First' }),
      makeNote({ id: 'b', title: 'Second' }),
    ]));

    (noteEl('a')?.querySelector('.note-delete') as HTMLButtonElement).click();
    const undoBtn = document.querySelector('#undoToast button') as HTMLButtonElement;
    undoBtn.focus();
    typeKey(undoBtn, 'Escape');

    expect(document.querySelector('#undoToast')).toBeNull();
    expect(state.notes.getAll().map((n) => n.id)).toEqual(['b']);
  });

  it('clears completed notes and can undo the clear', async () => {
    const state = await loadApp(hashFor([
      makeNote({ id: 'a', title: 'Active' }),
      makeNote({ id: 'b', title: 'Done 1', completed: true }),
      makeNote({ id: 'c', title: 'Done 2', completed: true }),
    ]));

    byId<HTMLButtonElement>('clearCompletedBtn').click();
    expect(state.notes.getAll().map((n) => n.id)).toEqual(['a']);
    expect(document.querySelector('#undoToast')?.textContent).toContain('2 notes cleared.');

    (document.querySelector('#undoToast button') as HTMLButtonElement).click();
    expect(state.notes.getAll().map((n) => n.id)).toEqual(['a', 'b', 'c']);
  });

  it('does nothing when there are no completed notes to clear', async () => {
    const state = await loadApp(hashFor([makeNote({ id: 'a', title: 'Active' })]));

    byId<HTMLButtonElement>('clearCompletedBtn').click();

    expect(state.notes.getAll()).toHaveLength(1);
    expect(document.querySelector('#undoToast')).toBeNull();
  });

  it('copies the share link and restores the button label', async () => {
    const writeText = jest.fn().mockResolvedValue(undefined);
    Object.defineProperty(navigator, 'clipboard', {
      value: { writeText },
      configurable: true,
    });
    await loadApp(hashFor([makeNote({ id: 'a' })]));
    jest.useFakeTimers();

    try {
      const btn = byId<HTMLButtonElement>('copyLinkBtn');
      btn.click();
      await Promise.resolve();
      await Promise.resolve();

      expect(writeText).toHaveBeenCalledWith(window.location.href);
      expect(btn.textContent).toBe('Copied!');

      jest.advanceTimersByTime(1500);
      expect(btn.textContent).toBe('Copy link');
    } finally {
      jest.useRealTimers();
    }
  });

  it('commits an open draft before copying the link', async () => {
    const writeText = jest.fn().mockResolvedValue(undefined);
    Object.defineProperty(navigator, 'clipboard', {
      value: { writeText },
      configurable: true,
    });
    const state = await loadApp(hashFor([makeNote({ id: 'a', title: 'Saved' })]));

    (noteEl('a')?.querySelector('.note-edit') as HTMLButtonElement).click();
    const input = document.querySelector('.note-title-input') as HTMLInputElement;
    input.value = 'Unsaved';
    input.dispatchEvent(new Event('input'));

    byId<HTMLButtonElement>('copyLinkBtn').click();
    await Promise.resolve();
    await Promise.resolve();

    const copied = writeText.mock.calls[0][0] as unknown as string;
    const encoded = copied.replace(/^.*#\/?/, '');

    expect(state.notes.getAll()[0].title).toBe('Unsaved');
    expect(decodeState(encoded).notes[0].title).toBe('Unsaved');
  });

  it('does not copy the link while the open draft is invalid', async () => {
    const writeText = jest.fn().mockResolvedValue(undefined);
    Object.defineProperty(navigator, 'clipboard', {
      value: { writeText },
      configurable: true,
    });
    await loadApp(hashFor([makeNote({ id: 'a', title: 'Saved' })]));

    (noteEl('a')?.querySelector('.note-edit') as HTMLButtonElement).click();
    const input = document.querySelector('.note-title-input') as HTMLInputElement;
    input.value = '';
    input.dispatchEvent(new Event('input'));

    byId<HTMLButtonElement>('copyLinkBtn').click();
    await Promise.resolve();

    expect(writeText).not.toHaveBeenCalled();
    expect(document.querySelector('.note-title-input')).not.toBeNull();
    expect(document.querySelector('.note-edit-error')).not.toBeNull();
  });

  it('falls back to a prompt when clipboard access fails', async () => {
    const writeText = jest.fn().mockRejectedValue(new Error('denied'));
    Object.defineProperty(navigator, 'clipboard', {
      value: { writeText },
      configurable: true,
    });
    const promptSpy = jest.spyOn(window, 'prompt').mockImplementation(() => null);
    await loadApp('');

    byId<HTMLButtonElement>('copyLinkBtn').click();
    await Promise.resolve();
    await Promise.resolve();

    expect(promptSpy).toHaveBeenCalledWith('Copy this link:', window.location.href);
  });
  it('copies the current query string with the canonical link', async () => {
    const writeText = jest.fn().mockResolvedValue(undefined);
    Object.defineProperty(navigator, 'clipboard', {
      value: { writeText },
      configurable: true,
    });
    await loadApp('');
    window.history.replaceState(null, '', '/?utm=share#/');

    byId<HTMLButtonElement>('copyLinkBtn').click();
    await Promise.resolve();
    await Promise.resolve();

    expect(writeText).toHaveBeenCalledWith(
      `${window.location.origin}/?utm=share#/`,
    );
  });

  it('copies the current state when replaceState failed and the bar is stale', async () => {
    const writeText = jest.fn().mockResolvedValue(undefined);
    Object.defineProperty(navigator, 'clipboard', {
      value: { writeText },
      configurable: true,
    });
    const state = await loadApp(hashFor([makeNote({ id: 'a', title: 'Before' })]));
    const staleUrl = window.location.href;
    jest.spyOn(window.history, 'replaceState').mockImplementation(() => {
      throw new DOMException('blocked', 'SecurityError');
    });

    state.notes.update({ ...makeNote({ id: 'a', title: 'After' }) });
    expect(window.location.href).toBe(staleUrl);

    byId<HTMLButtonElement>('copyLinkBtn').click();
    await Promise.resolve();
    await Promise.resolve();

    const copied = writeText.mock.calls[0][0] as unknown as string;
    const encoded = copied.replace(/^.*#\/?/, '');

    expect(copied).toBe(`${window.location.origin}/#/${state.state.getEncoded()}`);
    expect(copied).not.toBe(staleUrl);
    expect(decodeState(encoded).notes[0].title).toBe('After');
  });
});

describe('draft unload guard', () => {
  const fireBeforeUnload = (): Event => {
    const event = new Event('beforeunload', { cancelable: true });
    window.dispatchEvent(event);

    return event;
  };

  it('does not block unload when no draft is dirty', async () => {
    await loadApp(hashFor([makeNote({ id: 'a', title: 'Saved' })]));

    expect(fireBeforeUnload().defaultPrevented).toBe(false);
  });

  it('blocks unload while an edit has unsaved text', async () => {
    await loadApp(hashFor([makeNote({ id: 'a', title: 'Saved' })]));
    (noteEl('a')?.querySelector('.note-edit') as HTMLButtonElement).click();
    const input = document.querySelector('.note-title-input') as HTMLInputElement;
    input.value = 'Unsaved';
    input.dispatchEvent(new Event('input'));

    expect(fireBeforeUnload().defaultPrevented).toBe(true);
  });

  it('stops blocking once the draft is saved', async () => {
    await loadApp(hashFor([makeNote({ id: 'a', title: 'Saved' })]));
    (noteEl('a')?.querySelector('.note-edit') as HTMLButtonElement).click();
    const input = document.querySelector('.note-title-input') as HTMLInputElement;
    input.value = 'Saved edit';
    input.dispatchEvent(new Event('input'));
    (document.querySelector('.note-actions button[aria-label="Save note"]') as HTMLButtonElement)
      .click();

    expect(fireBeforeUnload().defaultPrevented).toBe(false);
  });
});

describe('keyboard shortcuts', () => {
  it('creates a note on N when not typing', async () => {
    const state = await loadApp('');

    typeKey(document, 'n');

    expect(state.notes.getAll()).toHaveLength(1);
    expect(document.querySelector('.note-title-input')).not.toBeNull();
  });

  it('focuses the search box on /', async () => {
    await loadApp('');

    typeKey(document, '/');

    expect(document.activeElement).toBe(byId('notesInputSearch'));
  });

  it('ignores shortcuts while typing in an input', async () => {
    const state = await loadApp('');
    const search = byId<HTMLInputElement>('notesInputSearch');
    search.focus();

    typeKey(search, 'n');

    expect(state.notes.getAll()).toHaveLength(0);
  });

  it('ignores modified key combos', async () => {
    const state = await loadApp('');

    typeKey(document, 'n', { ctrlKey: true });

    expect(state.notes.getAll()).toHaveLength(0);
  });
});

describe('URL length guard', () => {
  const bigBody = 'x'.repeat(8000);

  it('shows one visible warning when the share link exceeds the threshold', async () => {
    const state = await loadApp(hashFor([
      makeNote({ id: 'a', title: 'Big 1', body: bigBody }),
      makeNote({ id: 'b', title: 'Big 2', body: bigBody }),
    ]));

    expect(document.getElementById('urlWarning')?.textContent).toMatch(/may be truncated/i);

    // Further edits reuse the same banner instead of piling up warnings.
    state.notes.add(makeNote({ id: 'c', title: 'Small' }));
    expect(document.querySelectorAll('#urlWarning')).toHaveLength(1);
    expect(document.getElementById('urlWarning')?.textContent).toMatch(/may be truncated/i);
  });

  it('clears the warning once the share link is short enough', async () => {
    const state = await loadApp(hashFor([
      makeNote({ id: 'a', title: 'Big', body: bigBody }),
      makeNote({ id: 'b', title: 'Also big', body: bigBody }),
    ]));
    expect(document.getElementById('urlWarning')).not.toBeNull();

    state.notes.setAll([makeNote({ id: 'a', title: 'Small' })]);

    expect(document.getElementById('urlWarning')).toBeNull();
  });

  it('warns visibly when the address bar cannot be updated', async () => {
    const state = await loadApp('');
    jest.spyOn(window.history, 'replaceState').mockImplementation(() => {
      throw new DOMException('blocked', 'SecurityError');
    });

    state.notes.add(makeNote({ id: 'a', title: 'Still here' }));

    expect(state.notes.getAll()).toHaveLength(1);
    expect(document.getElementById('urlWarning')?.textContent).toMatch(/address bar/i);
  });

  it('keeps the editor open when a save would exceed the URL budget', async () => {
    const notes = Array.from({ length: 8 }, (_, index) => makeNote({
      id: `n${index}`,
      title: 'T',
      body: 'x'.repeat(9_300),
    }));
    const state = await loadApp(hashFor(notes));

    (noteEl('n0')?.querySelector('.note-edit') as HTMLButtonElement).click();
    const body = document.querySelector('.note-body-input') as HTMLTextAreaElement;
    body.value = 'x'.repeat(NOTE_VALIDATION.BODY_MAX_LENGTH);
    body.dispatchEvent(new Event('input'));
    (document.querySelector('.note-actions button[aria-label="Save note"]') as HTMLButtonElement)
      .click();

    expect(document.querySelector('.note-edit-error')?.textContent).toMatch(/too large/i);
    expect(document.querySelector('.note-body-input')).not.toBeNull();
    expect(state.notes.getAll()[0].body).toHaveLength(9_300);
  });

  it('preserves query parameters when syncing the hash', async () => {
    const state = await loadApp('');
    window.history.replaceState(null, '', '/?utm=campaign#');

    state.notes.add(makeNote({ id: 'a', title: 'Kept' }));

    expect(window.location.pathname).toBe('/');
    expect(window.location.search).toBe('?utm=campaign');
    expect(window.location.hash).toMatch(/^#\/.+/);
  });
});
