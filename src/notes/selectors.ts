/**
 * Pure view-pipeline selectors: search, completion filter, and pin sorting.
 * No DOM access — fully unit-testable.
 */

import Fuse from 'fuse.js/basic';
import { Note } from './model';

export interface VisibleNotesOptions {
  query?: string;
  showCompleted?: boolean;
  /**
   * Current store revision. When provided, the Fuse index is reused for as
   * long as the revision is unchanged. Omit it for one-off searches.
   */
  revision?: number;
}

export type VisibleNotesSelector = (
  notes: Note[],
  options?: VisibleNotesOptions,
) => Note[];

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

const createSearchIndex = (notes: Note[]): Fuse<Note> =>
  new Fuse(notes, { keys: ['title', 'body'] });

/** Fuzzy-matches notes by title and body, returning all notes for a blank query. */
const matchNotes = (
  notes: Note[],
  query: string,
  index: Fuse<Note> | null = null,
): Note[] => {
  const trimmed = query.trim();
  if (!trimmed) {
    return notes;
  }

  return (index ?? createSearchIndex(notes)).search(trimmed).map((result) => result.item);
};

/**
 * Runs the full visible-notes pipeline without caching: search →
 * completion filter → pinned-first sort.
 */
export const getVisibleNotes = (
  notes: Note[],
  { query = '', showCompleted = false }: VisibleNotesOptions = {},
): Note[] => sortPinnedFirst(filterByCompletion(matchNotes(notes, query), showCompleted));

/**
 * Creates a selector that caches the Fuse index across calls with the same
 * store revision. Keeping the cache in a closure avoids module-level state.
 */
export const createVisibleNotesSelector = (): VisibleNotesSelector => {
  let cachedRevision: number | null = null;
  let cachedFuse: Fuse<Note> | null = null;

  return (notes, { query = '', showCompleted = false, revision } = {}) => {
    const useCache = revision !== undefined && query.trim() !== '';
    if (useCache && (!cachedFuse || cachedRevision !== revision)) {
      cachedFuse = createSearchIndex(notes);
      cachedRevision = revision;
    }

    const matched = matchNotes(notes, query, useCache ? cachedFuse : null);

    return sortPinnedFirst(filterByCompletion(matched, showCompleted));
  };
};
