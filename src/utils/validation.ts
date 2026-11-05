/**
 * Input validation utilities
 */

import { Note, NOTE_VALIDATION } from '../types';

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
    (n.body === undefined || (typeof n.body === 'string' && n.body.length <= NOTE_VALIDATION.BODY_MAX_LENGTH)) &&
    (n.completed === undefined || typeof n.completed === 'boolean')
  );
};

/**
 * Sanitizes a string for safe display
 * @param str - The string to sanitize
 * @returns Sanitized string
 */
export const sanitizeString = (str: unknown): string => {
  if (str === null || str === undefined) {return '';}
  if (typeof str !== 'string') {return String(str);}

  // Basic HTML escaping for XSS prevention
  return str
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#39;');
};

