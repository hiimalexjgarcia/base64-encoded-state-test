import { jest } from '@jest/globals';
import { createNoteStore } from './store';
import { Note } from './model';

describe('note store', () => {
  let store: ReturnType<typeof createNoteStore>;
  let consoleSpy: jest.SpiedFunction<typeof console.error>;

  beforeEach(() => {
    store = createNoteStore();
    consoleSpy = jest.spyOn(console, 'error').mockImplementation(() => {});
  });

  afterEach(() => {
    consoleSpy.mockRestore();
  });

  describe('initial state', () => {
    it('starts with an empty notes array and revision zero', () => {
      expect(store.getState().notes).toEqual([]);
      expect(store.getNotes()).toEqual([]);
      expect(store.getRevision()).toBe(0);
    });
  });

  describe('addNote', () => {
    it('adds a note to state', () => {
      const note: Note = { id: 'test-id-1', title: 'Test Note', body: 'Test Body' };

      expect(store.addNote(note)).toEqual({ ok: true });
      expect(store.getNotes()).toEqual([note]);
    });

    it('adds multiple notes', () => {
      const note1: Note = { id: 'test-id-1', title: 'Note 1', body: 'Body 1' };
      const note2: Note = { id: 'test-id-2', title: 'Note 2', body: 'Body 2' };

      store.addNote(note1);
      store.addNote(note2);

      expect(store.getNotes()).toEqual([note1, note2]);
    });

    it('rejects an invalid note', () => {
      const result = store.addNote({ id: '', title: 'Test' } as unknown as Note);

      expect(result).toEqual({ ok: false, reason: 'invalid' });
      expect(store.getNotes()).toEqual([]);
      expect(consoleSpy).toHaveBeenCalled();
    });

    it('normalizes a missing body to an empty string', () => {
      store.addNote({ id: 'test-id-1', title: 'Test Note' } as Note);

      expect(store.getNotes()[0].body).toBe('');
    });
  });

  describe('removeNote', () => {
    it('removes a note from state', () => {
      const note: Note = { id: 'test-id-1', title: 'Test Note', body: 'Test Body' };
      store.addNote(note);

      expect(store.removeNote(note)).toEqual({ ok: true });
      expect(store.getNotes()).toEqual([]);
    });

    it('removes a note by id', () => {
      const note1: Note = { id: 'test-id-1', title: 'Note 1', body: 'Body 1' };
      const note2: Note = { id: 'test-id-2', title: 'Note 2', body: 'Body 2' };
      store.addNote(note1);
      store.addNote(note2);

      store.removeNote({ id: 'test-id-1', title: '', body: '' } as Note);

      expect(store.getNotes()).toEqual([note2]);
    });

    it('is a no-op when the note is not found', () => {
      store.addNote({ id: 'test-id-1', title: 'Test Note', body: 'Test Body' });

      expect(store.removeNote({ id: 'non-existent', title: '', body: '' } as Note))
        .toEqual({ ok: true });
      expect(store.getNotes()).toHaveLength(1);
    });

    it('rejects a note without an id', () => {
      store.addNote({ id: 'test-id-1', title: 'Test Note', body: 'Test Body' });

      expect(store.removeNote({ id: '', title: '', body: '' } as unknown as Note))
        .toEqual({ ok: false, reason: 'invalid' });
      expect(store.getNotes()).toHaveLength(1);
    });
  });

  describe('updateNote', () => {
    it('updates an existing note', () => {
      const note: Note = { id: 'test-id-1', title: 'Old Title', body: 'Old Body' };
      store.addNote(note);

      store.updateNote({ ...note, title: 'New Title', body: 'New Body' });

      expect(store.getNotes()[0]).toMatchObject({ title: 'New Title', body: 'New Body' });
    });

    it('replaces fields not included in the update object', () => {
      const note: Note = {
        id: 'test-id-1',
        title: 'Title',
        body: 'Body',
        pinned: true,
        color: 'blue',
      };
      store.addNote(note);

      store.updateNote({ id: 'test-id-1', title: 'Edited', body: 'Body' });

      expect(store.getNotes()[0].pinned).toBeUndefined();
      expect(store.getNotes()[0].color).toBeUndefined();
    });

    it('rejects a note with a missing id', () => {
      store.addNote({ id: 'test-id-1', title: 'Title', body: 'Body' });

      expect(store.updateNote({ id: '', title: 'X', body: '' } as unknown as Note))
        .toEqual({ ok: false, reason: 'invalid' });
      expect(store.getNotes()[0].title).toBe('Title');
    });

    it('rejects an invalid note', () => {
      store.addNote({ id: 'test-id-1', title: 'Title', body: 'Body' });

      expect(store.updateNote({ id: 'test-id-1', title: '', body: 'Body' } as unknown as Note))
        .toEqual({ ok: false, reason: 'invalid' });
      expect(store.getNotes()[0].title).toBe('Title');
    });

    it('notifies subscribers', () => {
      const handler = jest.fn();
      store.subscribe(handler);

      store.updateNote({ id: 'x', title: 'T', body: 'B' });

      expect(handler).toHaveBeenCalledTimes(1);
    });
  });

  describe('clearCompleted', () => {
    it('removes only completed notes', () => {
      store.addNote({ id: '1', title: 'Active', body: '' });
      store.addNote({ id: '2', title: 'Done', body: '', completed: true });
      store.addNote({ id: '3', title: 'Also done', body: '', completed: true });

      store.clearCompleted();

      expect(store.getNotes().map((n) => n.id)).toEqual(['1']);
    });

    it('is a no-op with no completed notes', () => {
      store.addNote({ id: '1', title: 'Active', body: '' });

      store.clearCompleted();

      expect(store.getNotes()).toHaveLength(1);
    });

    it('notifies subscribers', () => {
      const handler = jest.fn();
      store.subscribe(handler);
      store.addNote({ id: '1', title: 'Done', body: '', completed: true });
      handler.mockClear();

      store.clearCompleted();

      expect(handler).toHaveBeenCalledTimes(1);
    });
  });

  describe('setNotes', () => {
    it('replaces the entire notes array', () => {
      store.addNote({ id: '1', title: 'Old', body: '' });

      store.setNotes([
        { id: 'a', title: 'New A', body: '' },
        { id: 'b', title: 'New B', body: '' },
      ]);

      expect(store.getNotes().map((n) => n.id)).toEqual(['a', 'b']);
    });

    it('drops invalid notes', () => {
      store.setNotes([
        { id: 'a', title: 'Valid', body: '' },
        { id: '', title: 'No id', body: '' } as unknown as Note,
      ]);

      expect(store.getNotes()).toHaveLength(1);
    });

    it('falls back to an empty array for non-array input', () => {
      store.addNote({ id: '1', title: 'Old', body: '' });

      store.setNotes(null as unknown as Note[]);

      expect(store.getNotes()).toEqual([]);
    });

    it('refuses a board too large for a shareable link', () => {
      const notes = Array.from({ length: 8 }, (_, index) => ({
        id: `note-${index}`,
        title: 'T',
        body: 'x'.repeat(10_000),
      }));

      expect(store.setNotes(notes)).toEqual({ ok: false, reason: 'budget' });
      expect(store.getNotes()).toEqual([]);
      expect(consoleSpy).toHaveBeenCalled();
    });
  });

  describe('subscribe', () => {
    it('delivers events to multiple subscribers', () => {
      const first = jest.fn();
      const second = jest.fn();
      store.subscribe(first);
      store.subscribe(second);

      store.addNote({ id: '1', title: 'T', body: '' });

      expect(first).toHaveBeenCalledTimes(1);
      expect(second).toHaveBeenCalledTimes(1);
    });

    it('stops delivery after unsubscribe', () => {
      const handler = jest.fn();
      const unsubscribe = store.subscribe(handler);
      unsubscribe();

      store.addNote({ id: '1', title: 'T', body: '' });

      expect(handler).not.toHaveBeenCalled();
    });

    it('does not affect other subscribers when one unsubscribes', () => {
      const staying = jest.fn();
      const leaving = jest.fn();
      const unsubscribe = store.subscribe(leaving);
      store.subscribe(staying);
      unsubscribe();

      store.addNote({ id: '1', title: 'T', body: '' });

      expect(leaving).not.toHaveBeenCalled();
      expect(staying).toHaveBeenCalledTimes(1);
    });
  });

  describe('encoding and loading', () => {
    it('encodes state to base64url', () => {
      store.addNote({ id: 'test-id', title: 'Test', body: 'Body' });

      expect(store.getEncoded()).toMatch(/^[A-Za-z0-9_-]+$/);
    });

    it('decodes encoded state into a fresh store', () => {
      store.addNote({ id: 'test-id', title: 'Test', body: 'Body' });
      const freshStore = createNoteStore();

      expect(freshStore.loadEncoded(store.getEncoded())).toEqual({
        state: { notes: store.getNotes() },
        error: null,
      });
      expect(freshStore.getNotes()[0].title).toBe('Test');
    });

    it('leaves the board unchanged when a link cannot be decoded', () => {
      store.addNote({ id: 'test-id', title: 'Keep me', body: '' });

      expect(store.loadEncoded('invalid-base64!!')).toEqual({
        state: { notes: [] },
        error: 'invalid-encoding',
      });
      expect(store.getNotes().map((n) => n.id)).toEqual(['test-id']);
    });

    it('resets to an empty board for an empty encoded string', () => {
      store.addNote({ id: 'test-id', title: 'Test', body: '' });

      store.loadEncoded('');

      expect(store.getNotes()).toEqual([]);
    });

    it('handles a non-string encoded value', () => {
      store.addNote({ id: 'test-id', title: 'Test', body: '' });

      store.loadEncoded(null as unknown as string);

      expect(store.getNotes()).toEqual([]);
    });
  });

  describe('revision', () => {
    it('starts at zero and advances on every committed change', () => {
      expect(store.getRevision()).toBe(0);

      store.addNote({ id: '1', title: 'One', body: '' });
      expect(store.getRevision()).toBe(1);

      store.updateNote({ id: '1', title: 'One edited', body: '' });
      expect(store.getRevision()).toBe(2);

      store.loadEncoded('');
      expect(store.getRevision()).toBe(3);
    });

    it('advances when a note is removed or cleared', () => {
      store.addNote({ id: '1', title: 'Done', body: '', completed: true });
      const afterAdd = store.getRevision();

      store.clearCompleted();

      expect(store.getRevision()).toBe(afterAdd + 1);
    });

    it('does not advance when a mutation is rejected', () => {
      store.addNote({ id: '', title: 'Invalid' } as unknown as Note);

      expect(store.getRevision()).toBe(0);
    });
  });

  describe('immutability', () => {
    it('does not expose the internal state for mutation', () => {
      const initialState = store.getState();
      store.addNote({ id: 'test-id', title: 'Test', body: 'Body' });

      expect(initialState.notes).toHaveLength(0);

      const state = store.getState();
      state.notes.push({ id: 'injected', title: 'Injected', body: '' });
      expect(store.getNotes().map((n) => n.id)).toEqual(['test-id']);
    });

    it('returns cloned state and notes arrays', () => {
      store.addNote({ id: 'test-id', title: 'Test', body: 'Body' });

      expect(store.getState()).not.toBe(store.getState());
      expect(store.getNotes()).not.toBe(store.getNotes());
      expect(store.getNotes()).toEqual(store.getNotes());
    });
  });
});
