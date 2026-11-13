/**
 * Note store with immutable updates and typed mutation results.
 *
 * All state changes go through one commit path that enforces the URL write
 * budget. Mutations report why they failed so the UI can show an inline error
 * instead of silently dropping the change.
 */

import { handleError } from '../app/errors';
import {
  AppState,
  EncodedState,
  Note,
  normalizeNote,
  validateNote,
} from './model';
import {
  DecodeFailureReason,
  decodeStateDetailed,
  encodeState,
  isStateWithinBudget,
} from '../persistence/urlCodec';

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

const clone = <T>(value: T): T => {
  if (value === null || value === undefined) {
    return value;
  }
  try {
    return typeof structuredClone === 'function'
      ? structuredClone(value)
      : JSON.parse(JSON.stringify(value));
  } catch {
    return value;
  }
};

/**
 * Creates an isolated note store. The app uses one singleton, while tests can
 * create fresh instances without resetting the module registry.
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
        handleError(new Error('State is too large for a shareable URL'), {
          module: 'store',
          method: 'commit',
        });

        return { ok: false, reason: 'budget' };
      }

      state = next;
      revision += 1;
      publish();

      return { ok: true };
    } catch (error) {
      handleError(error, {
        module: 'store',
        method: 'commit',
      });

      return { ok: false, reason: 'invalid' };
    }
  };

  const invalid = (method: string, message: string): MutationResult => {
    handleError(new Error(message), {
      module: 'store',
      method,
    });

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
        handleError(error, {
          module: 'store',
          method: 'getEncoded',
        });

        return '';
      }
    },

    /**
     * Decodes and loads a URL state in one pass. A decode failure leaves the
     * current board untouched and returns the reason so the UI can preserve
     * the original link and explain what happened.
     */
    loadEncoded: (encoded: EncodedState): LoadResult => {
      const result = decodeStateDetailed(encoded);
      if (result.error) {
        return result;
      }

      const committed = commit(() => result.state);
      if (!committed.ok) {
        return {
          state: { notes: [] },
          error: result.error ?? 'too-long',
        };
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

/** Singleton store used by the running application. */
const noteStore = createNoteStore();

export default noteStore;
