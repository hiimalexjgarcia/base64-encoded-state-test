/**
 * Application state management with immutable updates
 * Uses simple callback system to notify subscribers of state changes
 */

import { AppState as AppStateType, Note, EncodedState, IAppState } from '../types';
import { handleError } from '../utils/errorHandler';
import { normalizeNote, validateNote } from '../utils/validation';
import { encodeState, decodeState, generateId } from '../utils/urlState';

/**
 * Creates and manages application state with immutable updates
 * @returns State management interface
 */
const createAppState = (): IAppState => {
  // Initial state
  let state: AppStateType = {
    notes: [],
  };

  // Monotonic revision, bumped on every committed state change. The view
  // layer uses it to cache derived data (the Fuse index) without relying on
  // array identity, since getAll() returns a fresh clone each call.
  let revision = 0;

  /**
   * Ensures state has a valid notes array
   * @param s - State to normalize
   * @returns Normalized state with notes array
   */
  const normalizeState = (s: AppStateType): AppStateType => {
    return {
      ...s,
      notes: Array.isArray(s.notes) ? s.notes : [],
    };
  };

  // Type for subscription callbacks
  type Callback<T = unknown> = (data: T) => void;

  // Map of event types to their callbacks with unique ids
  const subscribers: Record<string, Map<string, Callback>> = {};
  let nextSubscriberId = 0;

  /**
   * Deep clones an object
   * @param obj - Object to clone
   * @returns Cloned object
   */
  const cloneState = <T>(obj: T): T => {
    if (obj === null || obj === undefined) {
      return obj;
    }
    try {
      return typeof structuredClone === 'function' ? structuredClone(obj) : JSON.parse(JSON.stringify(obj));
    } catch {
      return obj;
    }
  };

  /**
   * Publishes state change events
   * @param newState - New state after update
   */
  const publishStateChange = (newState: AppStateType): void => {
    const safeNewState = normalizeState(newState);
    const appStateChangedCallbacks = subscribers['appStateChanged'];
    if (appStateChangedCallbacks) {
      appStateChangedCallbacks.forEach(callback => callback({ obj: cloneState(safeNewState) }));
    }
  };

  /**
   * Updates state immutably
   * @param updater - Function that receives current state and returns new state
   */
  const setState = (updater: (current: AppStateType) => AppStateType): void => {
    try {
      const newState = normalizeState(updater(normalizeState(cloneState(state))));

      if (!newState || typeof newState !== 'object') {
        handleError(new Error('Invalid state: must be an object'), {
          module: 'state',
          method: 'setState',
        });

        return;
      }

      state = newState;
      revision += 1;
      publishStateChange(newState);

    } catch (error) {
      handleError(error, {
        module: 'state',
        method: 'setState',
      });
    }
  };

  return {
    /**
     * State management methods
     */
    state: {
      /**
       * Gets current state (cloned for immutability)
       * @returns Current state
       */
      get: (): AppStateType => cloneState(state),

      /**
       * Gets the current monotonic state revision.
       * @returns Revision number (bumped on every state change)
       */
      getRevision: (): number => revision,

      /**
       * Sets state from URL-safe encoded string
       * @param encoded - URL-safe encoded state string
       */
      setEncoded: (encoded: EncodedState): void => {
        try {
          if (!encoded || typeof encoded !== 'string') {
            // Reset to default state
            setState(() => ({ notes: [] }));

            return;
          }

          // decodeState validates and normalizes every note (and drops
          // duplicate ids), so there is no need to validate them again here.
          const decoded = decodeState(encoded);
          const notes = Array.isArray(decoded.notes) ? decoded.notes : [];

          setState(() => ({ ...decoded, notes }));

        } catch (error) {
          handleError(error, {
            module: 'state',
            method: 'setEncoded',
          });
          // Reset to default state on error
          setState(() => ({ notes: [] }));
        }
      },

      /**
       * Gets current state as URL-safe encoded string
       * @returns URL-safe encoded state
       */
      getEncoded: (): EncodedState => {
        try {
          return encodeState(state);
        } catch (error) {
          handleError(error, {
            module: 'state',
            method: 'getEncoded',
          });

          return encodeState({ notes: [] });
        }
      },
    },

    /**
     * Notes management methods
     */
    notes: {
      /**
       * Gets all notes (cloned for immutability)
       * @returns Array of notes
       */
      getAll: (): Note[] => cloneState(state.notes || []),

      /**
       * Adds a note to state
       * @param note - Note to add (must have id, title, body)
       */
      add: (note: Note): void => {
        if (!validateNote(note)) {
          handleError(new Error('Invalid note: validation failed'), {
            module: 'state',
            method: 'notes.add',
          });

          return;
        }

        setState((currentState) => ({
          ...currentState,
          notes: [...currentState.notes, normalizeNote(note)],
        }));
      },

      /**
       * Updates a note in state
       * @param note - Note to update
       */
      update: (note: Note): void => {
        if (!note || !note.id) {
          handleError(new Error('Invalid note: missing id'), {
            module: 'state',
            method: 'notes.update',
          });

          return;
        }

        if (!validateNote(note)) {
          handleError(new Error('Invalid note: validation failed'), {
            module: 'state',
            method: 'notes.update',
          });

          return;
        }

        const normalized = normalizeNote(note);
        setState((currentState) => ({
          ...currentState,
          notes: currentState.notes.map(n => n.id === normalized.id ? normalized : n),
        }));
      },

      /**
       * Removes a note from state
       * @param note - Note to remove
       */
      remove: (note: Note): void => {
        if (!note || !note.id) {
          handleError(new Error('Invalid note: missing id'), {
            module: 'state',
            method: 'notes.remove',
          });

          return;
        }

        setState((currentState) => ({
          ...currentState,
          notes: currentState.notes.filter(n => n.id !== note.id),
        }));
      },

      /**
       * Removes all completed notes from state
       */
      clearCompleted: (): void => {
        setState((currentState) => ({
          ...currentState,
          notes: currentState.notes.filter(n => !n.completed),
        }));
      },

      /**
       * Replaces the entire notes array (used for undo restores)
       * @param notes - Notes to set; invalid entries are dropped
       */
      setAll: (notes: Note[]): void => {
        setState((currentState) => ({
          ...currentState,
          notes: Array.isArray(notes)
            ? notes.filter(note => validateNote(note)).map(normalizeNote)
            : [],
        }));
      },
    },

    /**
     * ID generation
     */
    generateId,

    /**
     * Pub/Sub subscription methods
     */
    pubsub: {
      /**
       * Subscribes to a pubsub topic
       * @param topic - Topic to subscribe to
       * @param callback - Callback function
       * @returns Subscription token
       */
      subscribe: (topic: string, callback: (...args: unknown[]) => void): string => {
        if (!subscribers[topic]) {
          subscribers[topic] = new Map();
        }
        const id = `${topic}-${nextSubscriberId++}`;
        subscribers[topic].set(id, callback as Callback);

        return id;
      },

      /**
       * Unsubscribes from a pubsub topic
       * @param token - Subscription token
       */
      unsubscribe: (token: string): void => {
        const [topic] = token.split('-');
        if (subscribers[topic]) {
          subscribers[topic].delete(token);
          if (subscribers[topic].size === 0) {
            delete subscribers[topic];
          }
        }
      },
    },
  };
};

// Singleton instance
const AppState = createAppState();

// Export both the factory and the singleton for testing
export { createAppState };
export default AppState;
