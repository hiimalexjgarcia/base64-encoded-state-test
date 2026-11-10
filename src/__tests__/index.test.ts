/**
 * Integration tests for src/index.ts — boots the real app against the jsdom
 * toolbar DOM, then drives it through DOM events like a user would.
 *
 * index.ts self-initializes on import, so each test gets a fresh module
 * registry (fresh AppState singleton) via jest.resetModules().
 */

import { jest } from '@jest/globals';
import { encodeState } from '../utils/urlState';
import { Note, NOTE_COLORS, NOTE_VALIDATION } from '../types';

type AppStateInstance = typeof import('../state/appState').default;

const TOOLBAR_HTML = `
  <div class="container">
    <h1>Notes</h1>
    <div class="d-flex mb-3" role="toolbar">
      <button type="button" id="addNoteBtn" class="btn btn-primary">Add Note</button>
      <button type="button" id="copyLinkBtn" class="btn">Copy link</button>
      <button type="button" id="clearCompletedBtn" class="btn">Clear completed</button>
      <label>
        <input type="checkbox" id="showCompletedCheckbox" />
        Show completed
      </label>
      <span id="notesDisplayCount" class="flex-fill text-right"></span>
      <input type="search" id="notesInputSearch" name="q" />
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

  it('treats an undecodable hash as empty state', async () => {
    const state = await loadApp('!!!not-base64!!!');

    expect(state.notes.getAll()).toEqual([]);
    expect(document.querySelector('.notes-empty')).not.toBeNull();
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
    expect(document.activeElement).toBe(input);
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

  it('filters notes by search and shows a no-match empty state', async () => {
    await loadApp(hashFor([
      makeNote({ id: 'a', title: 'Groceries' }),
      makeNote({ id: 'b', title: 'Homework' }),
    ]));
    const search = byId<HTMLInputElement>('notesInputSearch');

    search.value = 'Homework';
    search.dispatchEvent(new Event('input'));
    expect(document.querySelectorAll('#notes .note')).toHaveLength(1);
    expect(noteEl('b')).not.toBeNull();

    search.value = 'qqqqqqqq';
    search.dispatchEvent(new Event('input'));
    expect(document.querySelectorAll('#notes .note')).toHaveLength(0);
    expect(document.querySelector('.notes-empty')?.textContent).toContain('No notes match');

    search.value = '';
    search.dispatchEvent(new Event('input'));
    expect(document.querySelectorAll('#notes .note')).toHaveLength(2);
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
    (toast.querySelector('button') as HTMLButtonElement).click();

    expect(state.notes.getAll().map((n) => n.id)).toEqual(['a', 'b']);
    expect(document.querySelector('#undoToast')).toBeNull();
  });

  it('clears completed notes after confirmation and can undo the clear', async () => {
    const state = await loadApp(hashFor([
      makeNote({ id: 'a', title: 'Active' }),
      makeNote({ id: 'b', title: 'Done 1', completed: true }),
      makeNote({ id: 'c', title: 'Done 2', completed: true }),
    ]));
    jest.spyOn(window, 'confirm').mockReturnValue(true);

    byId<HTMLButtonElement>('clearCompletedBtn').click();
    expect(state.notes.getAll().map((n) => n.id)).toEqual(['a']);
    expect(document.querySelector('#undoToast')?.textContent).toContain('2 notes cleared.');

    (document.querySelector('#undoToast button') as HTMLButtonElement).click();
    expect(state.notes.getAll().map((n) => n.id)).toEqual(['a', 'b', 'c']);
  });

  it('keeps completed notes when the clear confirmation is declined', async () => {
    const state = await loadApp(hashFor([
      makeNote({ id: 'a', title: 'Active' }),
      makeNote({ id: 'b', title: 'Done', completed: true }),
    ]));
    jest.spyOn(window, 'confirm').mockReturnValue(false);

    byId<HTMLButtonElement>('clearCompletedBtn').click();

    expect(state.notes.getAll()).toHaveLength(2);
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
  it('warns once when the share link exceeds the threshold', async () => {
    const bigBody = 'x'.repeat(8000);
    const warn = jest.spyOn(console, 'warn').mockImplementation(() => {});

    const state = await loadApp(hashFor([
      makeNote({ id: 'a', title: 'Big 1', body: bigBody }),
      makeNote({ id: 'b', title: 'Big 2', body: bigBody }),
    ]));

    expect(warn).toHaveBeenCalledTimes(1);
    expect(String(warn.mock.calls[0][0])).toMatch(/may be truncated/i);

    // Further edits must not spam the console.
    state.notes.add(makeNote({ id: 'c', title: 'Small' }));
    expect(warn).toHaveBeenCalledTimes(1);
  });
});
