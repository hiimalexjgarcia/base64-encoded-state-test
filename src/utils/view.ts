/**
 * Pure view-pipeline helpers: search, completion filter, pin sorting,
 * and note color selection. No DOM access — fully unit-testable.
 */

import Fuse from 'fuse.js/basic';
import { Note, NOTE_COLORS, NoteColor } from '../types';

export interface VisibleNotesOptions {
  query?: string;
  showCompleted?: boolean;
  /**
   * Current AppState revision. When provided, the Fuse index is reused for
   * as long as the revision is unchanged. Omit it for one-off searches.
   */
  revision?: number;
}

interface FuseCache {
  revision: number;
  fuse: Fuse<Note>;
}

let fuseCache: FuseCache | null = null;

/**
 * Sorts notes with pinned notes first, preserving relative order
 * within each group (stable sort).
 */
export const sortPinnedFirst = (notes: Note[]): Note[] =>
  [...notes].sort((a, b) => Number(!!b.pinned) - Number(!!a.pinned));

/**
 * Filters out completed notes unless showCompleted is true.
 */
export const filterByCompletion = (notes: Note[], showCompleted = false): Note[] =>
  showCompleted ? notes : notes.filter((n) => !n.completed);

/**
 * Fuzzy-searches notes by title and body; returns all notes for a
 * blank query.
 */
export const searchNotes = (notes: Note[], query: string, revision?: number): Note[] => {
  const trimmed = query.trim();

  if (!trimmed) {
    return notes;
  }

  let fuse: Fuse<Note>;
  if (revision === undefined) {
    fuse = new Fuse(notes, { keys: ['title', 'body'] });
  } else {
    if (!fuseCache || fuseCache.revision !== revision) {
      fuseCache = {
        revision,
        fuse: new Fuse(notes, { keys: ['title', 'body'] }),
      };
    }
    fuse = fuseCache.fuse;
  }

  return fuse.search(trimmed).map((r) => r.item);
};

/**
 * Runs the full visible-notes pipeline: search → completion filter →
 * pinned-first sort.
 */
export const getVisibleNotes = (
  notes: Note[],
  { query = '', showCompleted = false, revision }: VisibleNotesOptions = {},
): Note[] =>
  sortPinnedFirst(filterByCompletion(searchNotes(notes, query, revision), showCompleted));

/**
 * Picks a random note color.
 */
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

/**
 * Formats a notes count for display, e.g. "1 note", "2 notes". When a
 * filtered subset is on screen, the total is included, e.g. "2 of 5 notes".
 */
export const formatNotesCount = (count: number, total = count): string => {
  const noun = `note${total !== 1 ? 's' : ''}`;

  return total === count ? `${count} ${noun}` : `${count} of ${total} ${noun}`;
};
