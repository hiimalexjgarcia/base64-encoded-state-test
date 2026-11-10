import { encodeState, decodeState, generateId } from '../utils/urlState';
import { Note } from '../types';

const makeNote = (overrides: Partial<Note> = {}): Note => ({
  id: 'test-id',
  title: 'Test Title',
  body: 'Test Body',
  ...overrides,
});

describe('urlState', () => {
  describe('encodeState', () => {
    it('should return empty string for empty notes', () => {
      expect(encodeState({ notes: [] })).toBe('');
    });

    it('should return empty string for nullish state', () => {
      expect(encodeState({} as { notes: Note[] })).toBe('');
    });

    it('should produce URL-safe base64url output', () => {
      const encoded = encodeState({ notes: [makeNote()] });
      expect(encoded).toMatch(/^[A-Za-z0-9_-]+$/);
    });

    it('should omit falsy optional fields', () => {
      const note = makeNote({ completed: undefined, pinned: undefined, color: undefined, body: '' });
      const decoded = decodeState(encodeState({ notes: [note] }));
      expect(decoded.notes[0]).toEqual({
        id: 'test-id',
        title: 'Test Title',
        body: '',
      });
    });

    it('should include all optional fields when set', () => {
      const note = makeNote({
        completed: true,
        pinned: true,
        color: 'blue',
      });
      const decoded = decodeState(encodeState({ notes: [note] }));
      expect(decoded.notes[0]).toEqual(note);
    });
  });

  describe('decodeState', () => {
    it('should return empty notes for empty string', () => {
      expect(decodeState('')).toEqual({ notes: [] });
    });

    it('should return empty notes for invalid base64url', () => {
      expect(decodeState('invalid-base64!!')).toEqual({ notes: [] });
    });

    it('should return empty notes for non-object JSON', () => {
      const json = btoa('"just a string"');
      expect(decodeState(json.replace(/\+/g, '-').replace(/\//g, '_'))).toEqual({ notes: [] });
    });

    it('should return empty notes for valid JSON without notes array', () => {
      const json = btoa('{"x":1}');
      expect(decodeState(json.replace(/\+/g, '-').replace(/\//g, '_'))).toEqual({ notes: [] });
    });

    it('should drop invalid notes but keep valid ones', () => {
      const compact = JSON.stringify({
        n: [
          { i: 'good-id', t: 'Good' },
          { t: 'missing id' },
          { i: '', t: 'empty id' },
          'not-an-object',
        ],
      });
      const encoded = btoa(compact).replace(/\+/g, '-').replace(/\//g, '_').replace(/=+$/, '');
      const decoded = decodeState(encoded);
      expect(decoded.notes).toHaveLength(1);
      expect(decoded.notes[0].id).toBe('good-id');
    });

    it('should ignore unknown color values', () => {
      const compact = JSON.stringify({ n: [{ i: 'id-1', t: 'Title', k: 'chartreuse' }] });
      const encoded = btoa(compact).replace(/\+/g, '-').replace(/\//g, '_').replace(/=+$/, '');
      const decoded = decodeState(encoded);
      expect(decoded.notes).toHaveLength(1);
      expect(decoded.notes[0].color).toBeUndefined();
    });
  });

  describe('round-trip', () => {
    it('should preserve all note fields', () => {
      const notes: Note[] = [
        makeNote({ id: 'a', title: 'First', body: '', color: 'yellow' }),
        makeNote({ id: 'b', title: 'Second', body: 'With body', completed: true, pinned: true, color: 'orange' }),
      ];

      const decoded = decodeState(encodeState({ notes }));
      expect(decoded.notes).toEqual(notes);
    });

    it('should preserve unicode text', () => {
      const notes: Note[] = [
        makeNote({ id: 'u1', title: 'Привет мир 🌍', body: '日本語のテキスト' }),
      ];

      const decoded = decodeState(encodeState({ notes }));
      expect(decoded.notes).toEqual(notes);
    });

    it('should decode a legacy link without color or body keys', () => {
      // Compact format {n:[{i,t,b,c,p}]} predates the k color key.
      const compact = JSON.stringify({ n: [{ i: 'legacy-1', t: 'Legacy', c: 1, p: 1 }] });
      const encoded = btoa(compact).replace(/\+/g, '-').replace(/\//g, '_').replace(/=+$/, '');
      const decoded = decodeState(encoded);
      expect(decoded.notes).toHaveLength(1);
      expect(decoded.notes[0]).toEqual({
        id: 'legacy-1',
        title: 'Legacy',
        body: '',
        completed: true,
        pinned: true,
      });
      expect(decoded.notes[0].color).toBeUndefined();
    });

    it('should handle base64url padding variants', () => {
      const notes: Note[] = [makeNote()];
      const encoded = encodeState({ notes });
      const decodedWithPadding = decodeState(encoded);
      const decodedWithoutPadding = decodeState(encoded.replace(/=+$/, ''));

      expect(decodedWithPadding).toEqual(decodedWithoutPadding);
      expect(decodedWithPadding.notes).toEqual(notes);
    });
  });

  describe('generateId', () => {
    it('should produce unique ids', () => {
      const ids = new Set(Array.from({ length: 50 }, () => generateId()));
      expect(ids.size).toBe(50);
    });
  });
});
