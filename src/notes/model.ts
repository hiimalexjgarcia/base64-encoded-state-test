/**
 * Note domain model: types, limits, palette, and validation.
 */

export const NOTE_COLORS = ['yellow', 'green', 'blue', 'pink', 'orange'] as const;
export type NoteColor = (typeof NOTE_COLORS)[number];

export interface Note {
  id: string;
  title: string;
  body: string;
  completed?: boolean;
  pinned?: boolean;
  color?: NoteColor;
}

/** Application state shape. */
export interface AppState {
  notes: Note[];
}

/** Encoded state for URL storage. */
export type EncodedState = string;

/** Validation limits for notes. */
export const NOTE_VALIDATION = {
  ID_MAX_LENGTH: 128,
  TITLE_MAX_LENGTH: 200,
  BODY_MAX_LENGTH: 10000,
  TITLE_MIN_LENGTH: 1,
  BODY_MIN_LENGTH: 0,
} as const;

/**
 * Validates a note object.
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
    n.id.length <= NOTE_VALIDATION.ID_MAX_LENGTH &&
    typeof n.title === 'string' &&
    n.title.length >= NOTE_VALIDATION.TITLE_MIN_LENGTH &&
    n.title.length <= NOTE_VALIDATION.TITLE_MAX_LENGTH &&
    (n.body === undefined || typeof n.body === 'string' && n.body.length <= NOTE_VALIDATION.BODY_MAX_LENGTH) &&
    (n.completed === undefined || typeof n.completed === 'boolean') &&
    (n.pinned === undefined || typeof n.pinned === 'boolean') &&
    (n.color === undefined || typeof n.color === 'string' && NOTE_COLORS.includes(n.color as NoteColor))
  );
};

/**
 * Ensures a note has the required fields the rest of the app relies on.
 * Notes decoded from older links may omit `body`; store it as an empty
 * string instead of leaking `undefined` into rendering or encoding.
 * Callers must validate the note first.
 */
export const normalizeNote = (note: Note): Note =>
  note.body === undefined ? { ...note, body: '' } : note;

/** Picks a random note color. */
export const randomColor = (): NoteColor =>
  NOTE_COLORS[Math.floor(Math.random() * NOTE_COLORS.length)];

/**
 * Returns the next color in the palette, wrapping around. A missing or
 * unknown color maps to the first palette entry.
 */
export const cycleColor = (color?: NoteColor): NoteColor => {
  if (!color) {
    return NOTE_COLORS[0];
  }
  const idx = NOTE_COLORS.indexOf(color);
  if (idx < 0) {
    return NOTE_COLORS[0];
  }

  return NOTE_COLORS[(idx + 1) % NOTE_COLORS.length];
};
