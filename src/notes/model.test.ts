import {
  cycleColor,
  normalizeNote,
  randomColor,
  validateNote,
  Note,
  NOTE_COLORS,
  NOTE_VALIDATION,
  NoteColor,
} from './model';

describe('note model', () => {
  describe('validateNote', () => {
    it('returns true for a valid note', () => {
      const note: Note = {
        id: 'test-id',
        title: 'Test Title',
        body: 'Test Body',
      };

      expect(validateNote(note)).toBe(true);
    });

    it('returns false for nullish and non-object values', () => {
      expect(validateNote(null)).toBe(false);
      expect(validateNote(undefined)).toBe(false);
      expect(validateNote('string')).toBe(false);
      expect(validateNote(123)).toBe(false);
    });

    it('returns false for a note without an id', () => {
      expect(validateNote({ title: 'Test', body: 'Body' } as unknown as Note)).toBe(false);
    });

    it('enforces the id length bounds', () => {
      const note = (id: string): Note => ({ id, title: 'Test', body: 'Body' });

      expect(validateNote(note(''))).toBe(false);
      expect(validateNote(note('a'.repeat(NOTE_VALIDATION.ID_MAX_LENGTH + 1)))).toBe(false);
      expect(validateNote(note('a'.repeat(NOTE_VALIDATION.ID_MAX_LENGTH)))).toBe(true);
    });

    it('returns false for a missing or over-long title', () => {
      expect(validateNote({ id: 'test-id', body: 'Body' } as unknown as Note)).toBe(false);
      expect(validateNote({
        id: 'test-id',
        title: 'a'.repeat(NOTE_VALIDATION.TITLE_MAX_LENGTH + 1),
        body: 'Body',
      } as unknown as Note)).toBe(false);
    });

    it('returns false for an over-long body', () => {
      expect(validateNote({
        id: 'test-id',
        title: 'Title',
        body: 'a'.repeat(NOTE_VALIDATION.BODY_MAX_LENGTH + 1),
      } as unknown as Note)).toBe(false);
    });

    it('accepts an empty or missing body', () => {
      expect(validateNote({ id: 'test-id', title: 'Title', body: '' })).toBe(true);
      expect(validateNote({ id: 'test-id', title: 'Title' } as unknown as Note)).toBe(true);
    });
  });

  describe('normalizeNote', () => {
    it('fills in a missing body', () => {
      const note = { id: 'test-id', title: 'Title' } as Note;

      expect(normalizeNote(note).body).toBe('');
    });

    it('leaves an existing body untouched', () => {
      const note: Note = { id: 'test-id', title: 'Title', body: 'Text' };

      expect(normalizeNote(note)).toBe(note);
    });
  });

  describe('cycleColor', () => {
    it('maps undefined to the first color', () => {
      expect(cycleColor(undefined)).toBe(NOTE_COLORS[0]);
    });

    it('advances through the palette', () => {
      expect(cycleColor('yellow')).toBe('green');
      expect(cycleColor('green')).toBe('blue');
    });

    it('wraps around from the last color', () => {
      expect(cycleColor('orange')).toBe(NOTE_COLORS[0]);
    });

    it('maps unknown colors to the first color', () => {
      expect(cycleColor('chartreuse' as NoteColor)).toBe(NOTE_COLORS[0]);
    });

    it('never returns undefined', () => {
      NOTE_COLORS.forEach((color) => {
        expect(cycleColor(color)).toBeDefined();
      });
    });
  });

  describe('randomColor', () => {
    it('returns a known palette color', () => {
      for (let i = 0; i < 20; i++) {
        expect(NOTE_COLORS).toContain(randomColor());
      }
    });
  });
});
