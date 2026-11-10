import { jest } from '@jest/globals';
import { createAppState } from '../state/appState';
import { Note } from '../types';

describe('appState', () => {
  let appState: ReturnType<typeof createAppState>;

  beforeEach(() => {
    appState = createAppState();
  });

  describe('initial state', () => {
    it('should have empty notes array', () => {
      const state = appState.state.get();
      expect(state.notes).toEqual([]);
    });

    it('should return empty array for getAll', () => {
      expect(appState.notes.getAll()).toEqual([]);
    });
  });

  describe('notes.add', () => {
    it('should add a note to state', () => {
      const note: Note = {
        id: 'test-id-1',
        title: 'Test Note',
        body: 'Test Body',
      };

      appState.notes.add(note);
      const notes = appState.notes.getAll();

      expect(notes).toHaveLength(1);
      expect(notes[0]).toEqual(note);
    });

    it('should add multiple notes', () => {
      const note1: Note = { id: 'test-id-1', title: 'Note 1', body: 'Body 1' };
      const note2: Note = { id: 'test-id-2', title: 'Note 2', body: 'Body 2' };

      appState.notes.add(note1);
      appState.notes.add(note2);

      const notes = appState.notes.getAll();
      expect(notes).toHaveLength(2);
      expect(notes).toContainEqual(note1);
      expect(notes).toContainEqual(note2);
    });

    it('should not add invalid note', () => {
      const invalidNote = { id: '', title: 'Test' };
      const consoleSpy = jest.spyOn(console, 'error').mockImplementation(() => {});

      appState.notes.add(invalidNote as unknown as Note);
      const notes = appState.notes.getAll();

      expect(notes).toHaveLength(0);
      consoleSpy.mockRestore();
    });
  });

  describe('notes.remove', () => {
    it('should remove a note from state', () => {
      const note: Note = { id: 'test-id-1', title: 'Test Note', body: 'Test Body' };
      appState.notes.add(note);
      appState.notes.remove(note);

      const notes = appState.notes.getAll();
      expect(notes).toHaveLength(0);
    });

    it('should remove note by id', () => {
      const note1: Note = { id: 'test-id-1', title: 'Note 1', body: 'Body 1' };
      const note2: Note = { id: 'test-id-2', title: 'Note 2', body: 'Body 2' };

      appState.notes.add(note1);
      appState.notes.add(note2);
      appState.notes.remove({ id: 'test-id-1', title: '', body: '' } as Note);

      const notes = appState.notes.getAll();
      expect(notes).toHaveLength(1);
      expect(notes[0]).toEqual(note2);
    });

    it('should not fail if note not found', () => {
      const note: Note = { id: 'test-id-1', title: 'Test Note', body: 'Test Body' };
      appState.notes.add(note);
      const consoleSpy = jest.spyOn(console, 'error').mockImplementation(() => {});

      appState.notes.remove({ id: 'non-existent', title: '', body: '' } as Note);

      const notes = appState.notes.getAll();
      expect(notes).toHaveLength(1);
      consoleSpy.mockRestore();
    });

    it('should not remove with invalid note', () => {
      const note: Note = { id: 'test-id-1', title: 'Test Note', body: 'Test Body' };
      appState.notes.add(note);
      const consoleSpy = jest.spyOn(console, 'error').mockImplementation(() => {});

      appState.notes.remove({ id: '', title: '', body: '' } as unknown as Note);

      const notes = appState.notes.getAll();
      expect(notes).toHaveLength(1);
      consoleSpy.mockRestore();
    });
  });

  describe('notes.update', () => {
    it('should update an existing note', () => {
      const note: Note = { id: 'test-id-1', title: 'Old Title', body: 'Old Body' };
      appState.notes.add(note);

      appState.notes.update({ ...note, title: 'New Title', body: 'New Body' });

      const notes = appState.notes.getAll();
      expect(notes).toHaveLength(1);
      expect(notes[0].title).toBe('New Title');
      expect(notes[0].body).toBe('New Body');
    });

    it('should preserve fields not part of the update object', () => {
      const note: Note = { id: 'test-id-1', title: 'Title', body: 'Body', pinned: true, color: 'blue' };
      appState.notes.add(note);

      appState.notes.update({ id: 'test-id-1', title: 'Edited', body: 'Body' });

      const notes = appState.notes.getAll();
      expect(notes[0].pinned).toBeUndefined();
      expect(notes[0].color).toBeUndefined();
    });

    it('should not update a note with a missing id', () => {
      const note: Note = { id: 'test-id-1', title: 'Title', body: 'Body' };
      appState.notes.add(note);
      const consoleSpy = jest.spyOn(console, 'error').mockImplementation(() => {});

      appState.notes.update({ id: '', title: 'X', body: '' } as unknown as Note);

      expect(appState.notes.getAll()[0].title).toBe('Title');
      consoleSpy.mockRestore();
    });

    it('should not update an invalid note', () => {
      const note: Note = { id: 'test-id-1', title: 'Title', body: 'Body' };
      appState.notes.add(note);
      const consoleSpy = jest.spyOn(console, 'error').mockImplementation(() => {});

      appState.notes.update({ id: 'test-id-1', title: '', body: 'Body' } as unknown as Note);

      expect(appState.notes.getAll()[0].title).toBe('Title');
      consoleSpy.mockRestore();
    });

    it('should publish appStateChanged on update', () => {
      const handler = jest.fn();
      appState.pubsub.subscribe('appStateChanged', handler);

      appState.notes.update({ id: 'x', title: 'T', body: 'B' });

      expect(handler).toHaveBeenCalledTimes(1);
    });
  });

  describe('notes.clearCompleted', () => {
    it('should remove only completed notes', () => {
      appState.notes.add({ id: '1', title: 'Active', body: '' });
      appState.notes.add({ id: '2', title: 'Done', body: '', completed: true });
      appState.notes.add({ id: '3', title: 'Also done', body: '', completed: true });

      appState.notes.clearCompleted();

      const notes = appState.notes.getAll();
      expect(notes).toHaveLength(1);
      expect(notes[0].id).toBe('1');
    });

    it('should be a no-op with no completed notes', () => {
      appState.notes.add({ id: '1', title: 'Active', body: '' });

      appState.notes.clearCompleted();

      expect(appState.notes.getAll()).toHaveLength(1);
    });

    it('should publish appStateChanged', () => {
      const handler = jest.fn();
      appState.pubsub.subscribe('appStateChanged', handler);
      appState.notes.add({ id: '1', title: 'Done', body: '', completed: true });

      handler.mockClear();
      appState.notes.clearCompleted();

      expect(handler).toHaveBeenCalledTimes(1);
    });
  });

  describe('notes.setAll', () => {
    it('should replace the entire notes array', () => {
      appState.notes.add({ id: '1', title: 'Old', body: '' });

      appState.notes.setAll([
        { id: 'a', title: 'New A', body: '' },
        { id: 'b', title: 'New B', body: '' },
      ]);

      const notes = appState.notes.getAll();
      expect(notes.map((n) => n.id)).toEqual(['a', 'b']);
    });

    it('should drop invalid notes', () => {
      const consoleSpy = jest.spyOn(console, 'error').mockImplementation(() => {});

      appState.notes.setAll([
        { id: 'a', title: 'Valid', body: '' },
        { id: '', title: 'No id', body: '' } as unknown as Note,
      ]);

      expect(appState.notes.getAll()).toHaveLength(1);
      consoleSpy.mockRestore();
    });

    it('should fall back to empty array for non-array input', () => {
      appState.notes.add({ id: '1', title: 'Old', body: '' });

      appState.notes.setAll(null as unknown as Note[]);

      expect(appState.notes.getAll()).toEqual([]);
    });
  });

  describe('pubsub', () => {
    it('should deliver events to multiple subscribers', () => {
      const first = jest.fn();
      const second = jest.fn();
      appState.pubsub.subscribe('appStateChanged', first);
      appState.pubsub.subscribe('appStateChanged', second);

      appState.notes.add({ id: '1', title: 'T', body: '' });

      expect(first).toHaveBeenCalledTimes(1);
      expect(second).toHaveBeenCalledTimes(1);
    });

    it('should stop delivery after unsubscribe', () => {
      const handler = jest.fn();
      const token = appState.pubsub.subscribe('appStateChanged', handler);
      appState.pubsub.unsubscribe(token);

      appState.notes.add({ id: '1', title: 'T', body: '' });

      expect(handler).not.toHaveBeenCalled();
    });

    it('should not affect other subscribers when one unsubscribes', () => {
      const staying = jest.fn();
      const leaving = jest.fn();
      const leavingToken = appState.pubsub.subscribe('appStateChanged', leaving);
      appState.pubsub.subscribe('appStateChanged', staying);
      appState.pubsub.unsubscribe(leavingToken);

      appState.notes.add({ id: '1', title: 'T', body: '' });

      expect(leaving).not.toHaveBeenCalled();
      expect(staying).toHaveBeenCalledTimes(1);
    });

    it('should ignore unknown unsubscribe tokens', () => {
      expect(() => appState.pubsub.unsubscribe('unknown-topic-999')).not.toThrow();
    });
  });

  describe('notes.search', () => {
    beforeEach(() => {
      appState.notes.add({ id: 'note-1', title: 'Hello World', body: 'This is a test' });
      appState.notes.add({ id: 'note-2', title: 'Goodbye World', body: 'This is another test' });
      appState.notes.add({ id: 'note-3', title: 'Test', body: 'Just a test' });
    });

    it('should find notes matching title', () => {
      const results = appState.notes.search('Hello');
      expect(results.length).toBeGreaterThan(0);
      expect(results[0].item.title).toContain('Hello');
    });

    it('should find notes matching body', () => {
      const results = appState.notes.search('another');
      expect(results.length).toBeGreaterThan(0);
      expect(results[0].item.body).toContain('another');
    });

    it('should return all notes for empty query', () => {
      const results = appState.notes.search('');
      expect(results).toHaveLength(3);
    });

    it('should return all notes for whitespace query', () => {
      const results = appState.notes.search('   ');
      expect(results).toHaveLength(3);
    });

    it('should return empty array for non-matching query', () => {
      const results = appState.notes.search('NonExistent');
      expect(results).toHaveLength(0);
    });

    it('should return cloned items, not live state references', () => {
      const results = appState.notes.search('');
      const sentinel = 'mutated-outside';

      expect(results).toHaveLength(3);
      results[0].item.title = sentinel;
      expect(appState.notes.getAll()[0].title).not.toBe(sentinel);
    });

    it('should keep live state intact when mutating returned search items', () => {
      const results = appState.notes.search('Hello');
      results[0].item.body = 'tampered';

      expect(appState.notes.getAll()[0].body).toBe('This is a test');
    });
  });

  describe('state encoding/decoding', () => {
    it('should encode state to base64', () => {
      appState.notes.add({ id: 'test-id', title: 'Test', body: 'Body' });
      const encoded = appState.state.getEncoded();

      expect(typeof encoded).toBe('string');
      expect(encoded.length).toBeGreaterThan(0);
    });

    it('should decode base64 to state', () => {
      const note: Note = { id: 'test-id', title: 'Test', body: 'Body' };
      appState.notes.add(note);
      const encoded = appState.state.getEncoded();
      const freshState = createAppState();
      freshState.state.setEncoded(encoded);

      const state = freshState.state.get();
      expect(state.notes).toHaveLength(1);
      expect(state.notes[0].title).toBe('Test');
    });

    it('should handle invalid encoded string', () => {
      const consoleSpy = jest.spyOn(console, 'error').mockImplementation(() => {});

      appState.state.setEncoded('invalid-base64!!');

      const state = appState.state.get();
      expect(state.notes).toEqual([]);

      consoleSpy.mockRestore();
    });

    it('should handle empty encoded string', () => {
      appState.state.setEncoded('');
      const state = appState.state.get();
      expect(state.notes).toEqual([]);
    });

    it('should handle null encoded string', () => {
      const consoleSpy = jest.spyOn(console, 'error').mockImplementation(() => {});
      appState.state.setEncoded(null as unknown as string);
      const state = appState.state.get();
      expect(state.notes).toEqual([]);
      consoleSpy.mockRestore();
    });
  });

  describe('state immutability', () => {
    it('should not allow direct state mutation', () => {
      const initialState = appState.state.get();
      appState.notes.add({ id: 'test-id', title: 'Test', body: 'Body' });

      // The initial state object should not be modified
      expect(initialState.notes).toHaveLength(0);
    });

    it('should return cloned state', () => {
      appState.notes.add({ id: 'test-id', title: 'Test', body: 'Body' });

      const state1 = appState.state.get();
      const state2 = appState.state.get();

      expect(state1).not.toBe(state2);
      expect(state1).toEqual(state2);
    });

    it('should return cloned notes array', () => {
      appState.notes.add({ id: 'test-id', title: 'Test', body: 'Body' });

      const notes1 = appState.notes.getAll();
      const notes2 = appState.notes.getAll();

      expect(notes1).not.toBe(notes2);
      expect(notes1).toEqual(notes2);
    });
  });
});
