import {
  encodeState,
  decodeState,
  decodeStateDetailed,
  generateId,
  isStateWithinBudget,
  MAX_ENCODED_LENGTH,
  MAX_STATE_BYTES,
} from '../utils/urlState';
import { Note, NOTE_VALIDATION } from '../types';

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

    it('should reject oversized encoded input without parsing it', () => {
      const oversized = 'a'.repeat(MAX_ENCODED_LENGTH + 1);
      expect(decodeState(oversized)).toEqual({ notes: [] });
    });

    it('should report why a non-empty link failed', () => {
      expect(decodeStateDetailed('invalid-base64!!')).toEqual({
        state: { notes: [] },
        error: 'invalid-encoding',
      });
      expect(decodeStateDetailed('')).toEqual({
        state: { notes: [] },
        error: null,
      });
    });

    it('should ignore unknown color values', () => {
      const compact = JSON.stringify({ n: [{ i: 'id-1', t: 'Title', k: 'chartreuse' }] });
      const encoded = btoa(compact).replace(/\+/g, '-').replace(/\//g, '_').replace(/=+$/, '');
      const decoded = decodeState(encoded);
      expect(decoded.notes).toHaveLength(1);
      expect(decoded.notes[0].color).toBeUndefined();
    });

    it('should drop duplicate ids, keeping the first occurrence', () => {
      const compact = JSON.stringify({
        n: [
          { i: 'same', t: 'First' },
          { i: 'same', t: 'Second' },
          { i: 'other', t: 'Other' },
        ],
      });
      const encoded = btoa(compact).replace(/\+/g, '-').replace(/\//g, '_').replace(/=+$/, '');
      const decoded = decodeState(encoded);

      expect(decoded.notes.map((n) => n.title)).toEqual(['First', 'Other']);
    });

    it('should reject an unsupported schema version', () => {
      const compact = JSON.stringify({ v: 2, n: [{ i: 'id-1', t: 'Future' }] });
      const encoded = btoa(compact).replace(/\+/g, '-').replace(/\//g, '_').replace(/=+$/, '');

      expect(decodeState(encoded)).toEqual({ notes: [] });
    });

    it('should encode the current schema version', () => {
      const encoded = encodeState({ notes: [makeNote()] });
      const base64 = encoded.replace(/-/g, '+').replace(/_/g, '/');
      const padded = base64 + '='.repeat((4 - base64.length % 4) % 4);
      const json = atob(padded);

      expect(JSON.parse(json).v).toBe(1);
    });
  });

  describe('decodeStateDetailed', () => {
    const encodeJson = (json: string): string =>
      btoa(json).replace(/\+/g, '-').replace(/\//g, '_').replace(/=+$/, '');

    it('reports an oversized link', () => {
      expect(decodeStateDetailed('a'.repeat(MAX_ENCODED_LENGTH + 1))).toEqual({
        state: { notes: [] },
        error: 'too-long',
      });
    });

    it('reports malformed JSON', () => {
      expect(decodeStateDetailed(encodeJson('{"v":1,"n":['))).toEqual({
        state: { notes: [] },
        error: 'invalid-json',
      });
    });

    it('reports an invalid payload shape', () => {
      expect(decodeStateDetailed(encodeJson('{"v":1}'))).toEqual({
        state: { notes: [] },
        error: 'invalid-shape',
      });
    });

    it('reports an unsupported schema version', () => {
      expect(decodeStateDetailed(encodeJson('{"v":2,"n":[]}'))).toEqual({
        state: { notes: [] },
        error: 'unsupported-version',
      });
    });

    it('returns the decoded state without an error on success', () => {
      const state = { notes: [makeNote()] };

      expect(decodeStateDetailed(encodeState(state))).toEqual({
        state,
        error: null,
      });
    });
  });

  describe('size contract', () => {
    const maxNote = (index: number): Note => ({
      id: `${index}${'i'.repeat(NOTE_VALIDATION.ID_MAX_LENGTH - 1)}`,
      title: 'T'.repeat(NOTE_VALIDATION.TITLE_MAX_LENGTH),
      body: 'x'.repeat(NOTE_VALIDATION.BODY_MAX_LENGTH),
      completed: true,
      pinned: true,
      color: 'yellow',
    });

    it('round-trips the largest board the per-note limits allow', () => {
      const notes = Array.from({ length: 7 }, (_, index) => maxNote(index));
      const state = { notes };

      expect(isStateWithinBudget(state)).toBe(true);
      const encoded = encodeState(state);
      expect(encoded.length).toBeGreaterThan(0);
      expect(encoded.length).toBeLessThanOrEqual(MAX_ENCODED_LENGTH);
      expect(decodeState(encoded)).toEqual(state);
    });

    it('refuses to emit a link that the decoder would reject', () => {
      const notes = Array.from({ length: 8 }, (_, index) => maxNote(index));
      const state = { notes };

      expect(isStateWithinBudget(state)).toBe(false);
      expect(encodeState(state)).toBe('');
    });

    it('measures multi-byte text against the byte budget', () => {
      // 18,750 four-byte emoji are 75,000 UTF-8 bytes even though the
      // JavaScript string is half as long.
      const notes = [makeNote({ id: 'emoji', title: 'Emoji', body: '😀'.repeat(18_750) })];

      expect(isStateWithinBudget({ notes })).toBe(false);
      expect(encodeState({ notes })).toBe('');
      expect(MAX_STATE_BYTES).toBe(75_000);
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
