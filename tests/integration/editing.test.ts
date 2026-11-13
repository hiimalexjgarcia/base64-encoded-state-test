import { jest } from '@jest/globals';
import {
  byId,
  cleanupApp,
  fireBeforeUnload,
  hashFor,
  loadApp,
  makeNote,
  noteEl,
  typeKey,
} from '../support/appHarness';
import { NOTE_VALIDATION } from '../../src/notes/model';

afterEach(cleanupApp);

describe('inline editing', () => {
  it('creates a note and enters inline edit when Add Note is clicked', () => {
    const { store } = loadApp('');
    byId<HTMLButtonElement>('addNoteBtn').click();

    const notes = store.getNotes();
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

  it('saves inline edits and syncs the URL hash', () => {
    const { store } = loadApp('');
    byId<HTMLButtonElement>('addNoteBtn').click();

    (document.querySelector('.note-title-input') as HTMLInputElement).value = 'Buy milk';
    (document.querySelector('.note-body-input') as HTMLTextAreaElement).value = '2%';
    (document.querySelector('button[aria-label="Save note"]') as HTMLButtonElement).click();

    const notes = store.getNotes();
    expect(notes[0].title).toBe('Buy milk');
    expect(notes[0].body).toBe('2%');
    expect(document.querySelector('.note-title-input')).toBeNull();
    expect(document.querySelector('.note-title')?.textContent).toBe('Buy milk');
    expect(window.location.hash.length).toBeGreaterThan(2);
  });

  it('preserves completed, pinned, and color when saving an inline edit', () => {
    const { store } = loadApp(hashFor([
      makeNote({ id: 'a', title: 'Keep', completed: true, pinned: true, color: 'blue' }),
    ]));
    byId<HTMLInputElement>('showCompletedCheckbox').checked = true;
    byId<HTMLInputElement>('showCompletedCheckbox').dispatchEvent(new Event('change'));

    (noteEl('a')?.querySelector('.note-edit') as HTMLButtonElement).click();
    (document.querySelector('.note-title-input') as HTMLInputElement).value = 'Kept';
    (document.querySelector('button[aria-label="Save note"]') as HTMLButtonElement).click();

    const note = store.getNotes()[0];
    expect(note.title).toBe('Kept');
    expect(note.completed).toBe(true);
    expect(note.pinned).toBe(true);
    expect(note.color).toBe('blue');
  });

  it('shows an error and keeps editing when the title is empty', () => {
    const { store } = loadApp('');
    byId<HTMLButtonElement>('addNoteBtn').click();
    (document.querySelector('.note-title-input') as HTMLInputElement).value = '   ';
    (document.querySelector('button[aria-label="Save note"]') as HTMLButtonElement).click();

    expect(store.getNotes()[0].title).toBe('New Note');
    expect(document.querySelector('.note-title-input')).not.toBeNull();
    expect(document.querySelector('.note-edit-error')?.textContent).toContain('title');
    expect(
      (document.querySelector('.note-title-input') as HTMLInputElement).getAttribute('aria-invalid'),
    ).toBe('true');
  });

  it('limits inline inputs to the note validation caps', () => {
    loadApp('');
    byId<HTMLButtonElement>('addNoteBtn').click();

    const titleInput = document.querySelector('.note-title-input') as HTMLInputElement;
    const bodyInput = document.querySelector('.note-body-input') as HTMLTextAreaElement;

    expect(titleInput.maxLength).toBe(NOTE_VALIDATION.TITLE_MAX_LENGTH);
    expect(bodyInput.maxLength).toBe(NOTE_VALIDATION.BODY_MAX_LENGTH);
  });

  it('reports an over-limit edit instead of silently dropping it', () => {
    const { store } = loadApp('');
    byId<HTMLButtonElement>('addNoteBtn').click();
    const input = document.querySelector('.note-title-input') as HTMLInputElement;
    input.value = 'x'.repeat(NOTE_VALIDATION.TITLE_MAX_LENGTH + 1);
    (document.querySelector('button[aria-label="Save note"]') as HTMLButtonElement).click();

    expect(store.getNotes()[0].title).toBe('New Note');
    expect(document.querySelector('.note-title-input')).not.toBeNull();
    expect(document.querySelector('.note-edit-error')?.textContent).toContain(
      String(NOTE_VALIDATION.TITLE_MAX_LENGTH),
    );
  });

  it('clears the save error when the user resumes typing', () => {
    loadApp('');
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

  it('edits a note whose id contains selector characters', () => {
    const weirdId = 'a"]';
    const { store } = loadApp(hashFor([makeNote({ id: weirdId, title: 'Crafted' })]));
    const rendered = document.querySelector('#notes .note') as HTMLElement;

    expect(rendered.dataset.id).toBe(weirdId);
    (rendered.querySelector('.note-edit') as HTMLButtonElement).click();

    const input = document.querySelector('.note-title-input') as HTMLInputElement;
    expect(input.value).toBe('Crafted');

    input.value = 'Fixed';
    (document.querySelector('button[aria-label="Save note"]') as HTMLButtonElement).click();

    expect(store.getNotes()[0].title).toBe('Fixed');
  });

  it('cancels an edit on Escape', () => {
    const { store } = loadApp('');
    byId<HTMLButtonElement>('addNoteBtn').click();
    const input = document.querySelector('.note-title-input') as HTMLInputElement;
    input.value = 'Discard me';
    typeKey(input, 'Escape');

    expect(store.getNotes()[0].title).toBe('New Note');
    expect(document.querySelector('.note-title-input')).toBeNull();
  });

  it('saves an edit on Ctrl+Enter', () => {
    const { store } = loadApp('');
    byId<HTMLButtonElement>('addNoteBtn').click();
    const input = document.querySelector('.note-title-input') as HTMLInputElement;
    input.value = 'Keyboard saved';
    typeKey(input, 'Enter', { ctrlKey: true });

    expect(store.getNotes()[0].title).toBe('Keyboard saved');
    expect(document.querySelector('.note-title-input')).toBeNull();
  });

  it('cancels an edit with the cancel button', () => {
    const { store } = loadApp('');
    byId<HTMLButtonElement>('addNoteBtn').click();
    (document.querySelector('button[aria-label="Cancel edit"]') as HTMLButtonElement).click();

    expect(store.getNotes()[0].title).toBe('New Note');
    expect(document.querySelector('.note-title-input')).toBeNull();
  });

  it('returns focus to the note Edit button after saving', () => {
    loadApp(hashFor([
      makeNote({ id: 'a', title: 'First' }),
      makeNote({ id: 'b', title: 'Second' }),
    ]));

    (noteEl('a')?.querySelector('.note-edit') as HTMLButtonElement).click();
    (document.querySelector('.note-title-input') as HTMLInputElement).value = 'Updated';
    (document.querySelector('button[aria-label="Save note"]') as HTMLButtonElement).click();

    expect(document.activeElement).toBe(noteEl('a')?.querySelector('.note-edit'));
  });

  it('returns focus to the note Edit button after cancelling', () => {
    loadApp(hashFor([
      makeNote({ id: 'a', title: 'First' }),
      makeNote({ id: 'b', title: 'Second' }),
    ]));

    (noteEl('a')?.querySelector('.note-edit') as HTMLButtonElement).click();
    (document.querySelector('button[aria-label="Cancel edit"]') as HTMLButtonElement).click();

    expect(document.activeElement).toBe(noteEl('a')?.querySelector('.note-edit'));
  });

  it('cancels with Escape when focus is on the Save button', () => {
    loadApp(hashFor([makeNote({ id: 'a', title: 'First' })]));

    (noteEl('a')?.querySelector('.note-edit') as HTMLButtonElement).click();
    const saveBtn = document.querySelector('button[aria-label="Save note"]') as HTMLButtonElement;
    saveBtn.focus();
    typeKey(saveBtn, 'Escape');

    expect(document.querySelector('.note-title-input')).toBeNull();
    expect(document.activeElement).toBe(noteEl('a')?.querySelector('.note-edit'));
  });

  it('switches inline edit when another note is edited', () => {
    loadApp(hashFor([
      makeNote({ id: 'a', title: 'First' }),
      makeNote({ id: 'b', title: 'Second' }),
    ]));

    (noteEl('a')?.querySelector('.note-edit') as HTMLButtonElement).click();
    expect(noteEl('a')?.querySelector('.note-title-input')).not.toBeNull();

    (noteEl('b')?.querySelector('.note-edit') as HTMLButtonElement).click();

    expect(noteEl('a')?.querySelector('.note-title-input')).toBeNull();
    expect(noteEl('b')?.querySelector('.note-title-input')).not.toBeNull();
  });

  it('saves an in-progress edit before applying a search filter', () => {
    const { store } = loadApp(hashFor([
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

      expect(store.getNotes().find((n) => n.id === 'a')?.title).toBe('Groceries list');
      expect(document.querySelector('.note-title-input')).toBeNull();
      expect(document.querySelectorAll('#notes .note')).toHaveLength(1);
      expect(noteEl('b')).not.toBeNull();
    } finally {
      jest.useRealTimers();
    }
  });

  it('keeps an invalid edit open and does not apply the search', () => {
    loadApp(hashFor([makeNote({ id: 'a', title: 'Groceries' })]));

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

  it('saves an in-progress edit before toggling completed visibility', () => {
    const { store } = loadApp(hashFor([makeNote({ id: 'a', title: 'First' })]));

    (noteEl('a')?.querySelector('.note-edit') as HTMLButtonElement).click();
    const titleInput = document.querySelector('.note-title-input') as HTMLInputElement;
    titleInput.value = 'Updated';
    titleInput.dispatchEvent(new Event('input'));

    const checkbox = byId<HTMLInputElement>('showCompletedCheckbox');
    checkbox.checked = true;
    checkbox.dispatchEvent(new Event('change'));

    expect(store.getNotes()[0].title).toBe('Updated');
    expect(document.querySelector('.note-title-input')).toBeNull();
  });

  it('reverts the completed toggle when the draft is invalid', () => {
    loadApp(hashFor([makeNote({ id: 'a', title: 'First' })]));

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

  it('preserves an in-progress edit when another note changes', () => {
    const { store } = loadApp(hashFor([
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
    expect(store.getNotes().find((n) => n.id === 'a')?.title).toBe('First');
  });
});

describe('draft unload guard', () => {
  it('does not block unload when no draft is dirty', () => {
    loadApp(hashFor([makeNote({ id: 'a', title: 'Saved' })]));

    expect(fireBeforeUnload().defaultPrevented).toBe(false);
  });

  it('blocks unload while an edit has unsaved text', () => {
    loadApp(hashFor([makeNote({ id: 'a', title: 'Saved' })]));
    (noteEl('a')?.querySelector('.note-edit') as HTMLButtonElement).click();
    const input = document.querySelector('.note-title-input') as HTMLInputElement;
    input.value = 'Unsaved';
    input.dispatchEvent(new Event('input'));

    expect(fireBeforeUnload().defaultPrevented).toBe(true);
  });

  it('stops blocking once the draft is saved', () => {
    loadApp(hashFor([makeNote({ id: 'a', title: 'Saved' })]));
    (noteEl('a')?.querySelector('.note-edit') as HTMLButtonElement).click();
    const input = document.querySelector('.note-title-input') as HTMLInputElement;
    input.value = 'Saved edit';
    input.dispatchEvent(new Event('input'));
    (document.querySelector('.note-actions button[aria-label="Save note"]') as HTMLButtonElement)
      .click();

    expect(fireBeforeUnload().defaultPrevented).toBe(false);
  });
});
