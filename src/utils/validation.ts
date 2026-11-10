/**
 * Input validation utilities
 */

import { Note, NoteColor, NOTE_COLORS, NOTE_VALIDATION } from '../types';

/**
 * Validates a note object
 * @param note - The note to validate
 * @returns True if valid, false otherwise
 */
export const validateNote = (note: unknown): note is Note => {
  if (!note || typeof note !== 'object') {
    return false;
  }

  const n = note as Record<string, unknown>;

  return (
    typeof n.id === 'string' &&
    n.id.length > 0 &&
    typeof n.title === 'string' &&
    n.title.length >= NOTE_VALIDATION.TITLE_MIN_LENGTH &&
    n.title.length <= NOTE_VALIDATION.TITLE_MAX_LENGTH &&
    (n.body === undefined || typeof n.body === 'string' && n.body.length <= NOTE_VALIDATION.BODY_MAX_LENGTH) &&
    (n.completed === undefined || typeof n.completed === 'boolean') &&
    (n.pinned === undefined || typeof n.pinned === 'boolean') &&
    (n.color === undefined || typeof n.color === 'string' && NOTE_COLORS.includes(n.color as NoteColor))
  );
};

