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
      const consoleSpy = jest.spyOn(console, 'error').mockImplementation();

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
      const consoleSpy = jest.spyOn(console, 'error').mockImplementation();

      appState.notes.remove({ id: 'non-existent', title: '', body: '' } as Note);

      const notes = appState.notes.getAll();
      expect(notes).toHaveLength(1);
      consoleSpy.mockRestore();
    });

    it('should not remove with invalid note', () => {
      const note: Note = { id: 'test-id-1', title: 'Test Note', body: 'Test Body' };
      appState.notes.add(note);
      const consoleSpy = jest.spyOn(console, 'error').mockImplementation();

      appState.notes.remove({ id: '', title: '', body: '' } as unknown as Note);

      const notes = appState.notes.getAll();
      expect(notes).toHaveLength(1);
      consoleSpy.mockRestore();
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
      const consoleSpy = jest.spyOn(console, 'error').mockImplementation();

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
      const consoleSpy = jest.spyOn(console, 'error').mockImplementation();
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
