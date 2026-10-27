import { validateNote, createNoteFromForm, sanitizeString } from '../utils/validation';
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

  describe('sanitizeString', () => {
    it('should return empty string for null', () => {
      expect(sanitizeString(null)).toBe('');
    });

    it('should return empty string for undefined', () => {
      expect(sanitizeString(undefined)).toBe('');
    });

    it('should convert non-string to string', () => {
      expect(sanitizeString(123)).toBe('123');
      expect(sanitizeString(true)).toBe('true');
    });

    it('should escape HTML special characters', () => {
      expect(sanitizeString('<script>')).toBe('&lt;script&gt;');
      expect(sanitizeString('&')).toBe('&amp;');
      expect(sanitizeString('"test"')).toBe('&quot;test&quot;');
      expect(sanitizeString('\'test\'')).toBe('&#39;test&#39;');
    });

    it('should not modify safe strings', () => {
      expect(sanitizeString('Hello World')).toBe('Hello World');
      expect(sanitizeString('Test 123')).toBe('Test 123');
    });
  });

  describe('createNoteFromForm', () => {
    it('should create note data from valid form', () => {
      const formData = new FormData();
      formData.set('note', 'Test Title');
      formData.set('detail', 'Test Body');

      const result = createNoteFromForm(formData);
      expect(result).toEqual({
        title: 'Test Title',
        body: 'Test Body',
      });
    });

    it('should return null for empty title', () => {
      const formData = new FormData();
      formData.set('note', '');
      formData.set('detail', 'Test Body');

      const result = createNoteFromForm(formData);
      expect(result).toBeNull();
    });

    it('should trim whitespace from title and body', () => {
      const formData = new FormData();
      formData.set('note', '  Test Title  ');
      formData.set('detail', '  Test Body  ');

      const result = createNoteFromForm(formData);
      expect(result).toEqual({
        title: 'Test Title',
        body: 'Test Body',
      });
    });

    it('should return null for title exceeding max length', () => {
      const formData = new FormData();
      formData.set('note', 'a'.repeat(NOTE_VALIDATION.TITLE_MAX_LENGTH + 1));
      formData.set('detail', 'Test Body');

      const result = createNoteFromForm(formData);
      expect(result).toBeNull();
    });

    it('should return null for body exceeding max length', () => {
      const formData = new FormData();
      formData.set('note', 'Test Title');
      formData.set('detail', 'a'.repeat(NOTE_VALIDATION.BODY_MAX_LENGTH + 1));

      const result = createNoteFromForm(formData);
      expect(result).toBeNull();
    });

    it('should handle missing detail field', () => {
      const formData = new FormData();
      formData.set('note', 'Test Title');

      const result = createNoteFromForm(formData);
      expect(result).toEqual({
        title: 'Test Title',
        body: '',
      });
    });
  });
});
