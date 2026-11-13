/**
 * Note store with immutable updates and typed mutation results.
 *
 * All state changes go through one commit path that enforces the URL write
 * budget. Mutations report why they failed so the UI can show an inline error
 * instead of silently dropping the change.
 */

import {
  AppState,
  EncodedState,
  Note,
  normalizeNote,
  validateNote,
} from './model';
import {
  DecodeFailureReason,
  decodeState,
  encodeState,
  isStateWithinBudget,
} from '../url/codec';

/** Logs an unexpected store failure for debugging. */
const logError = (error: unknown, method: string): void => {
  // eslint-disable-next-line no-console
  console.error(`[store.${method}]`, error);
};

export type MutationFailureReason = 'invalid' | 'budget';

export type MutationResult =
  | { ok: true }
  | { ok: false; reason: MutationFailureReason };

export interface LoadResult {
  state: AppState;
  error: DecodeFailureReason | null;
}

export interface NoteStore {
  getState: () => AppState;
  getNotes: () => Note[];
  getRevision: () => number;
  getEncoded: () => EncodedState;
  loadEncoded: (encoded: EncodedState) => LoadResult;
  subscribe: (listener: () => void) => () => void;
  addNote: (note: Note) => MutationResult;
  updateNote: (note: Note) => MutationResult;
  removeNote: (note: Note) => MutationResult;
  clearCompleted: () => MutationResult;
  setNotes: (notes: Note[]) => MutationResult;
}

const normalizeState = (state: AppState): AppState => ({
  ...state,
  notes: Array.isArray(state.notes) ? state.notes : [],
});

const clone = <T>(value: T): T => structuredClone(value);

/**
 * Creates an isolated note store. The app creates one instance at startup,
 * while tests can create fresh instances without resetting the module
 * registry.
 */
export const createNoteStore = (): NoteStore => {
  let state: AppState = { notes: [] };
  // Monotonic revision, bumped on every committed state change. The board
  // uses it to cache the Fuse index without relying on array identity.
  let revision = 0;
  const listeners = new Set<() => void>();

  const publish = (): void => {
    listeners.forEach((listener) => listener());
  };

  /**
   * Commits a state update. Returns a result instead of throwing so callers
   * can distinguish validation failures from URL-budget failures.
   */
  const commit = (updater: (current: AppState) => AppState): MutationResult => {
    try {
      const next = normalizeState(updater(normalizeState(clone(state))));

      if (!isStateWithinBudget(next)) {
        // The URL is the only persistence layer, so a board that cannot be
        // encoded within the decoder's limit must never become app state.
        logError(new Error('State is too large for a shareable URL'), 'commit');

        return { ok: false, reason: 'budget' };
      }

      state = next;
      revision += 1;
      publish();

      return { ok: true };
    } catch (error) {
      logError(error, 'commit');

      return { ok: false, reason: 'invalid' };
    }
  };

  const invalid = (method: string, message: string): MutationResult => {
    logError(new Error(message), method);

    return { ok: false, reason: 'invalid' };
  };

  return {
    getState: (): AppState => clone(state),

    getNotes: (): Note[] => clone(state.notes),

    getRevision: (): number => revision,

    getEncoded: (): EncodedState => {
      try {
        return encodeState(state);
      } catch (error) {
        logError(error, 'getEncoded');

        return '';
      }
    },

    /**
     * Decodes and loads a URL state in one pass. A decode failure leaves the
     * current board untouched and returns the reason so the UI can preserve
     * the original link and explain what happened.
     */
    loadEncoded: (encoded: EncodedState): LoadResult => {
      const result = decodeState(encoded);
      if (result.error) {
        return result;
      }

      const committed = commit(() => result.state);
      if (!committed.ok) {
        // The only commit failure after a successful decode is the URL budget.
        return { state: { notes: [] }, error: 'too-long' };
      }

      return result;
    },

    subscribe: (listener: () => void): (() => void) => {
      listeners.add(listener);

      return (): void => {
        listeners.delete(listener);
      };
    },

    addNote: (note: Note): MutationResult => {
      if (!validateNote(note)) {
        return invalid('addNote', 'Invalid note: validation failed');
      }

      return commit((current) => ({
        ...current,
        notes: [...current.notes, normalizeNote(note)],
      }));
    },

    updateNote: (note: Note): MutationResult => {
      if (!note || !note.id) {
        return invalid('updateNote', 'Invalid note: missing id');
      }

      if (!validateNote(note)) {
        return invalid('updateNote', 'Invalid note: validation failed');
      }

      const normalized = normalizeNote(note);

      return commit((current) => ({
        ...current,
        notes: current.notes.map((item) => item.id === normalized.id ? normalized : item),
      }));
    },

    removeNote: (note: Note): MutationResult => {
      if (!note || !note.id) {
        return invalid('removeNote', 'Invalid note: missing id');
      }

      return commit((current) => ({
        ...current,
        notes: current.notes.filter((item) => item.id !== note.id),
      }));
    },

    clearCompleted: (): MutationResult => commit((current) => ({
      ...current,
      notes: current.notes.filter((note) => !note.completed),
    })),

    setNotes: (notes: Note[]): MutationResult => commit((current) => ({
      ...current,
      notes: Array.isArray(notes)
        ? notes.filter((note) => validateNote(note)).map(normalizeNote)
        : [],
    })),
  };
};
