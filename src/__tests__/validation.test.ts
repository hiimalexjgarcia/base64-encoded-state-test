import { validateNote } from '../utils/validation';
import { NOTE_VALIDATION } from '../types';
import { Note } from '../types';

describe('validation utils', () => {
  describe('validateNote', () => {
    it('should return true for a valid note', () => {
      const note: Note = {
        id: 'test-id',
        title: 'Test Title',
        body: 'Test Body',
      };
      expect(validateNote(note)).toBe(true);
    });

    it('should return false for null', () => {
      expect(validateNote(null)).toBe(false);
    });

    it('should return false for undefined', () => {
      expect(validateNote(undefined)).toBe(false);
    });

    it('should return false for non-object', () => {
      expect(validateNote('string')).toBe(false);
      expect(validateNote(123)).toBe(false);
    });

    it('should return false for note without id', () => {
      const note = {
        title: 'Test',
        body: 'Body',
      };
      expect(validateNote(note as unknown as Note)).toBe(false);
    });

    it('should return false for note with empty id', () => {
      const note = {
        id: '',
        title: 'Test',
        body: 'Body',
      };
      expect(validateNote(note as unknown as Note)).toBe(false);
    });

    it('should return false for note without title', () => {
      const note = {
        id: 'test-id',
        body: 'Body',
      };
      expect(validateNote(note as unknown as Note)).toBe(false);
    });

    it('should return false for note with title exceeding max length', () => {
      const note = {
        id: 'test-id',
        title: 'a'.repeat(NOTE_VALIDATION.TITLE_MAX_LENGTH + 1),
        body: 'Body',
      };
      expect(validateNote(note as unknown as Note)).toBe(false);
    });

    it('should return false for note with body exceeding max length', () => {
      const note = {
        id: 'test-id',
        title: 'Title',
        body: 'a'.repeat(NOTE_VALIDATION.BODY_MAX_LENGTH + 1),
      };
      expect(validateNote(note as unknown as Note)).toBe(false);
    });

    it('should return true for note with empty body', () => {
      const note = {
        id: 'test-id',
        title: 'Title',
        body: '',
      };
      expect(validateNote(note)).toBe(true);
    });

    it('should return true for note without body', () => {
      const note = {
        id: 'test-id',
        title: 'Title',
      };
      expect(validateNote(note as unknown as Note)).toBe(true);
    });
  });
});
