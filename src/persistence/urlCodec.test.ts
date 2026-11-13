import {
  encodeState,
  decodeState,
  decodeStateDetailed,
  generateId,
  isStateWithinBudget,
  MAX_ENCODED_LENGTH,
  MAX_STATE_BYTES,
} from './urlCodec';
import { Note, NOTE_VALIDATION } from '../notes/model';

const makeNote = (overrides: Partial<Note> = {}): Note => ({
  id: 'test-id',
  title: 'Test Title',
  body: 'Test Body',
  ...overrides,
});

const toBase64Url = (json: string): string =>
  btoa(json).replace(/\+/g, '-').replace(/\//g, '_').replace(/=+$/, '');

describe('urlCodec', () => {
  describe('encodeState', () => {
    it('returns an empty string for an empty board', () => {
      expect(encodeState({ notes: [] })).toBe('');
    });

    it('returns an empty string for a nullish state', () => {
      expect(encodeState({} as { notes: Note[] })).toBe('');
    });

    it('produces URL-safe base64url output', () => {
      expect(encodeState({ notes: [makeNote()] })).toMatch(/^[A-Za-z0-9_-]+$/);
    });

    it('omits falsy optional fields', () => {
      const note = makeNote({ completed: undefined, pinned: undefined, color: undefined, body: '' });

      expect(decodeState(encodeState({ notes: [note] })).notes[0]).toEqual({
        id: 'test-id',
        title: 'Test Title',
        body: '',
      });
    });

    it('includes all optional fields when set', () => {
      const note = makeNote({ completed: true, pinned: true, color: 'blue' });

      expect(decodeState(encodeState({ notes: [note] })).notes[0]).toEqual(note);
    });
  });

  describe('decodeState', () => {
    it('returns empty notes for an empty string', () => {
      expect(decodeState('')).toEqual({ notes: [] });
    });

    it('returns empty notes for invalid base64url', () => {
      expect(decodeState('invalid-base64!!')).toEqual({ notes: [] });
    });

    it('returns empty notes for non-object JSON', () => {
      expect(decodeState(toBase64Url('"just a string"'))).toEqual({ notes: [] });
    });

    it('returns empty notes for valid JSON without a notes array', () => {
      expect(decodeState(toBase64Url('{"x":1}'))).toEqual({ notes: [] });
    });

    it('drops invalid notes but keeps valid ones', () => {
      const encoded = toBase64Url(JSON.stringify({
        n: [
          { i: 'good-id', t: 'Good' },
          { t: 'missing id' },
          { i: '', t: 'empty id' },
          'not-an-object',
        ],
      }));
      const decoded = decodeState(encoded);

      expect(decoded.notes).toHaveLength(1);
      expect(decoded.notes[0].id).toBe('good-id');
    });

    it('rejects oversized encoded input without parsing it', () => {
      expect(decodeState('a'.repeat(MAX_ENCODED_LENGTH + 1))).toEqual({ notes: [] });
    });

    it('reports why a non-empty link failed', () => {
      expect(decodeStateDetailed('invalid-base64!!')).toEqual({
        state: { notes: [] },
        error: 'invalid-encoding',
      });
      expect(decodeStateDetailed('')).toEqual({
        state: { notes: [] },
        error: null,
      });
    });

    it('ignores unknown color values', () => {
      const encoded = toBase64Url(JSON.stringify({ n: [{ i: 'id-1', t: 'Title', k: 'chartreuse' }] }));
      const decoded = decodeState(encoded);

      expect(decoded.notes).toHaveLength(1);
      expect(decoded.notes[0].color).toBeUndefined();
    });

    it('drops duplicate ids, keeping the first occurrence', () => {
      const encoded = toBase64Url(JSON.stringify({
        n: [
          { i: 'same', t: 'First' },
          { i: 'same', t: 'Second' },
          { i: 'other', t: 'Other' },
        ],
      }));

      expect(decodeState(encoded).notes.map((n) => n.title)).toEqual(['First', 'Other']);
    });

    it('rejects an unsupported schema version', () => {
      const encoded = toBase64Url(JSON.stringify({ v: 2, n: [{ i: 'id-1', t: 'Future' }] }));

      expect(decodeState(encoded)).toEqual({ notes: [] });
    });

    it('encodes the current schema version', () => {
      const encoded = encodeState({ notes: [makeNote()] });
      const base64 = encoded.replace(/-/g, '+').replace(/_/g, '/');
      const padded = base64 + '='.repeat((4 - base64.length % 4) % 4);

      expect(JSON.parse(atob(padded)).v).toBe(1);
    });
  });

  describe('decodeStateDetailed', () => {
    it('reports an oversized link', () => {
      expect(decodeStateDetailed('a'.repeat(MAX_ENCODED_LENGTH + 1))).toEqual({
        state: { notes: [] },
        error: 'too-long',
      });
    });

    it('reports malformed JSON', () => {
      expect(decodeStateDetailed(toBase64Url('{"v":1,"n":['))).toEqual({
        state: { notes: [] },
        error: 'invalid-json',
      });
    });

    it('reports an invalid payload shape', () => {
      expect(decodeStateDetailed(toBase64Url('{"v":1}'))).toEqual({
        state: { notes: [] },
        error: 'invalid-shape',
      });
    });

    it('reports an unsupported schema version', () => {
      expect(decodeStateDetailed(toBase64Url('{"v":2,"n":[]}'))).toEqual({
        state: { notes: [] },
        error: 'unsupported-version',
      });
    });

    it('returns the decoded state without an error on success', () => {
      const state = { notes: [makeNote()] };

      expect(decodeStateDetailed(encodeState(state))).toEqual({ state, error: null });
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
      const state = { notes: Array.from({ length: 8 }, (_, index) => maxNote(index)) };

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

    it('treats a nullish board as within budget', () => {
      expect(isStateWithinBudget(null as unknown as { notes: Note[] })).toBe(true);
      expect(isStateWithinBudget({ notes: [] })).toBe(true);
    });
  });

  describe('round-trip', () => {
    it('preserves all note fields', () => {
      const notes: Note[] = [
        makeNote({ id: 'a', title: 'First', body: '', color: 'yellow' }),
        makeNote({
          id: 'b',
          title: 'Second',
          body: 'With body',
          completed: true,
          pinned: true,
          color: 'orange',
        }),
      ];

      expect(decodeState(encodeState({ notes })).notes).toEqual(notes);
    });

    it('preserves unicode text', () => {
      const notes: Note[] = [
        makeNote({ id: 'u1', title: 'Привет мир 🌍', body: '日本語のテキスト' }),
      ];

      expect(decodeState(encodeState({ notes })).notes).toEqual(notes);
    });

    it('decodes a legacy link without color or body keys', () => {
      const encoded = toBase64Url(JSON.stringify({ n: [{ i: 'legacy-1', t: 'Legacy', c: 1, p: 1 }] }));
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

    it('handles base64url padding variants', () => {
      const notes: Note[] = [makeNote()];
      const encoded = encodeState({ notes });

      expect(decodeState(encoded)).toEqual(decodeState(encoded.replace(/=+$/, '')));
    });
  });

  describe('generateId', () => {
    it('produces unique ids', () => {
      const ids = new Set(Array.from({ length: 50 }, () => generateId()));

      expect(ids.size).toBe(50);
    });
  });
});
