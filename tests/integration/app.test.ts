import { jest } from '@jest/globals';
import {
  byId,
  cleanupApp,
  hashFor,
  loadApp,
  makeNote,
  noteEl,
  typeKey,
} from '../support/appHarness';
import { MAX_ENCODED_LENGTH } from '../../src/url/codec';

afterEach(cleanupApp);

describe('app startup', () => {
  it('renders notes decoded from the URL hash and shows the count', () => {
    loadApp(hashFor([
      makeNote({ id: 'a', title: 'Groceries', body: 'Milk' }),
      makeNote({ id: 'b', title: 'Homework', body: 'Math' }),
    ]));

    expect(document.querySelectorAll('#notes .note')).toHaveLength(2);
    expect(noteEl('a')?.querySelector('.note-title')?.textContent).toBe('Groceries');
    expect(byId('notesDisplayCount').textContent).toBe('2 notes');
  });

  it('shows the no-notes empty state on a blank hash', () => {
    const { store } = loadApp('');

    expect(store.getNotes()).toEqual([]);
    expect(document.querySelector('.notes-empty')?.textContent).toContain('No notes yet');
    expect(byId('notesDisplayCount').textContent).toBe('0 notes');
  });

  it('preserves an undecodable hash and offers a start-empty recovery', () => {
    const broken = '!!!not-base64!!!';
    const { store } = loadApp(broken);

    expect(store.getNotes()).toEqual([]);
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

  it('explains an unsupported link version without erasing it', () => {
    const encoded = btoa(JSON.stringify({ v: 2, n: [] }))
      .replace(/\+/g, '-')
      .replace(/\//g, '_')
      .replace(/=+$/, '');
    loadApp(encoded);

    expect(window.location.hash).toBe(`#/${encoded}`);
    expect(document.getElementById('decodeWarning')?.textContent)
      .toMatch(/unsupported schema version/i);
  });

  it('explains an oversized link without erasing it', () => {
    const oversized = 'a'.repeat(MAX_ENCODED_LENGTH + 1);
    loadApp(oversized);

    expect(window.location.hash).toBe(`#/${oversized}`);
    expect(document.getElementById('decodeWarning')?.textContent).toMatch(/too long/i);
  });

  it('reloads state on hashchange', () => {
    const { store } = loadApp(hashFor([makeNote({ id: 'a', title: 'Note A' })]));

    window.history.replaceState(
      null,
      '',
      `/#/${hashFor([makeNote({ id: 'z', title: 'Note Z' })])}`,
    );
    window.dispatchEvent(new Event('hashchange'));

    expect(store.getNotes().map((n) => n.id)).toEqual(['z']);
    expect(noteEl('z')?.querySelector('.note-title')?.textContent).toBe('Note Z');
  });

  it('resets state when the hash is cleared', () => {
    const { store } = loadApp(hashFor([makeNote({ id: 'a', title: 'Shared' })]));
    expect(store.getNotes()).toHaveLength(1);

    window.history.replaceState(null, '', '/#');
    window.dispatchEvent(new Event('hashchange'));

    expect(store.getNotes()).toEqual([]);
    expect(document.querySelector('.notes-empty')?.textContent).toContain('No notes yet');
  });

  it('ignores a hash without the #/ prefix', () => {
    const { store } = loadApp('');
    const encoded = hashFor([makeNote({ id: 'z', title: 'Changed' })]);

    window.history.replaceState(null, '', `/#${encoded}`);
    window.dispatchEvent(new Event('hashchange'));

    expect(store.getNotes()).toEqual([]);
    expect(document.querySelector('#notes .note')).toBeNull();
  });

  it('hides completed notes by default', () => {
    loadApp(hashFor([
      makeNote({ id: 'a', title: 'Active' }),
      makeNote({ id: 'b', title: 'Done', completed: true }),
    ]));

    expect(noteEl('a')).not.toBeNull();
    expect(noteEl('b')).toBeNull();
  });

  it('reveals completed notes when Show completed is toggled', () => {
    loadApp(hashFor([
      makeNote({ id: 'a', title: 'Active' }),
      makeNote({ id: 'b', title: 'Done', completed: true }),
    ]));

    const checkbox = byId<HTMLInputElement>('showCompletedCheckbox');
    checkbox.checked = true;
    checkbox.dispatchEvent(new Event('change'));

    expect(noteEl('b')).not.toBeNull();
    expect(document.querySelectorAll('#notes .note')).toHaveLength(2);
  });

  it('marks a note complete and hides it, then shows the all-completed empty state', () => {
    const { store } = loadApp(hashFor([makeNote({ id: 'a', title: 'Only note' })]));

    const checkbox = document.querySelector('.note-complete-checkbox') as HTMLInputElement;
    checkbox.checked = true;
    checkbox.dispatchEvent(new Event('change'));

    expect(store.getNotes()[0].completed).toBe(true);
    expect(document.querySelectorAll('#notes .note')).toHaveLength(0);
    expect(document.querySelector('.notes-empty')?.textContent).toContain('All notes are completed');
  });

  it('sorts a pinned note to the top', () => {
    const { store } = loadApp(hashFor([
      makeNote({ id: 'a', title: 'First' }),
      makeNote({ id: 'b', title: 'Second' }),
    ]));

    (noteEl('b')?.querySelector('.note-pin') as HTMLButtonElement).click();

    expect(store.getNotes().find((n) => n.id === 'b')?.pinned).toBe(true);
    expect(document.querySelector('#notes .note')?.getAttribute('data-id')).toBe('b');
  });

  it('cycles note colors through the palette', () => {
    const { store } = loadApp(hashFor([makeNote({ id: 'a' })]));

    (noteEl('a')?.querySelector('.note-color') as HTMLButtonElement).click();
    expect(store.getNotes()[0].color).toBe('yellow');
    expect(noteEl('a')?.classList.contains('note-color-yellow')).toBe(true);

    (noteEl('a')?.querySelector('.note-color') as HTMLButtonElement).click();
    expect(store.getNotes()[0].color).toBe('green');
  });
});

describe('search', () => {
  it('debounces search and then filters notes', () => {
    loadApp(hashFor([
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

  it('announces the visible count against the total while filtering', () => {
    loadApp(hashFor([
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

  it('clears an active search so a new note is visible and editable', () => {
    const { store } = loadApp(hashFor([
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

    expect(store.getNotes()).toHaveLength(3);
    expect(byId<HTMLInputElement>('notesInputSearch').value).toBe('');
    expect(document.querySelectorAll('#notes .note')).toHaveLength(3);
    expect(document.querySelector('.note-title-input')).not.toBeNull();
  });
});

describe('keyboard shortcuts', () => {
  it('creates a note on N when not typing', () => {
    const { store } = loadApp('');

    typeKey(document, 'n');

    expect(store.getNotes()).toHaveLength(1);
    expect(document.querySelector('.note-title-input')).not.toBeNull();
  });

  it('focuses the search box on /', () => {
    loadApp('');

    typeKey(document, '/');

    expect(document.activeElement).toBe(byId('notesInputSearch'));
  });

  it('ignores shortcuts while typing in an input', () => {
    const { store } = loadApp('');
    const search = byId<HTMLInputElement>('notesInputSearch');
    search.focus();

    typeKey(search, 'n');

    expect(store.getNotes()).toHaveLength(0);
  });

  it('ignores modified key combos', () => {
    const { store } = loadApp('');

    typeKey(document, 'n', { ctrlKey: true });

    expect(store.getNotes()).toHaveLength(0);
  });
});
