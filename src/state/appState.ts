/**
 * Application state management with immutable updates
 * Uses simple callback system to notify subscribers of state changes
 */

import Fuse from 'fuse.js';
import { AppState as AppStateType, Note, EncodedState, IAppState } from '../types';
import { handleError } from '../utils/errorHandler';
import { validateNote } from '../utils/validation';
import { encodeState, decodeState, generateId } from '../utils/urlState';

/**
 * Creates and manages application state with immutable updates
 * @returns State management interface
 */
const createAppState = (): IAppState => {
  // Initial state
  let state: AppStateType = {
    notes: []
  };

  /**
   * Ensures state has a valid notes array
   * @param s - State to normalize
   * @returns Normalized state with notes array
   */
  const normalizeState = (s: AppStateType): AppStateType => {
    return {
      ...s,
      notes: Array.isArray(s.notes) ? s.notes : []
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
   * Publishes state change events with diff information
   * @param newState - New state after update
   * @param oldState - Previous state
   */
  const publishStateChange = (newState: AppStateType, oldState: AppStateType): void => {
    // Ensure both states have notes arrays
    const safeNewState = normalizeState(newState);
    const safeOldState = normalizeState(oldState);

    // Always publish full state change
    const appStateChangedCallbacks = subscribers['appStateChanged'];
    if (appStateChangedCallbacks) {
      appStateChangedCallbacks.forEach(callback => callback({ obj: cloneState(safeNewState) }));
    }

    // Publish notes-specific events
    if (safeNewState.notes !== safeOldState.notes) {
      const notesStateChangedCallbacks = subscribers['notesStateChanged'];
      if (notesStateChangedCallbacks) {
        notesStateChangedCallbacks.forEach(callback => callback(cloneState(safeNewState.notes)));
      }

      // Calculate diff for created notes
      const oldNotes = safeOldState.notes || [];
      const newNotes = safeNewState.notes || [];
      const notesCreated = newNotes.filter(
        newNote => !oldNotes.some(oldNote => oldNote.id === newNote.id)
      );
      const notesDeleted = oldNotes.filter(
        oldNote => !newNotes.some(newNote => newNote.id === oldNote.id)
      );

      if (notesCreated.length > 0) {
        const notesCreatedCallbacks = subscribers['notesCreated'];
        if (notesCreatedCallbacks) {
          notesCreatedCallbacks.forEach(callback => callback(cloneState(notesCreated)));
        }
      }
      if (notesDeleted.length > 0) {
        const notesDeletedCallbacks = subscribers['notesDeleted'];
        if (notesDeletedCallbacks) {
          notesDeletedCallbacks.forEach(callback => callback(cloneState(notesDeleted)));
        }
      }
    }
  };

  /**
   * Updates state immutably
   * @param updater - Function that receives current state and returns new state
   */
  const setState = (updater: (current: AppStateType) => AppStateType): void => {
    try {
      const oldState = normalizeState(cloneState(state));
      const newState = normalizeState(updater(normalizeState(cloneState(state))));

      // Validate new state structure
      if (!newState || typeof newState !== 'object') {
        handleError(new Error('Invalid state: must be an object'), {
          module: 'state',
          method: 'setState'
        });
        return;
      }

      state = newState;
      publishStateChange(newState, oldState);

    } catch (error) {
      handleError(error, {
        module: 'state',
        method: 'setState'
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

          const decoded = decodeState(encoded);
          
          // Ensure decoded has a notes property
          const notes = Array.isArray(decoded.notes) ? decoded.notes : [];
          
          // Validate each note
          const validatedNotes = notes.filter(note => validateNote(note));

          setState(() => ({ ...decoded, notes: validatedNotes }));

        } catch (error) {
          handleError(error, {
            module: 'state',
            method: 'setEncoded'
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
            method: 'getEncoded'
          });
          return encodeState({ notes: [] });
        }
      }
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
            method: 'notes.add'
          });
          return;
        }

        setState((currentState) => ({
          ...currentState,
          notes: [...currentState.notes, note]
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
            method: 'notes.remove'
          });
          return;
        }

        setState((currentState) => ({
          ...currentState,
          notes: currentState.notes.filter(n => n.id !== note.id)
        }));
      },

      /**
       * Searches notes using Fuse.js
       * @param query - Search query
       * @returns Search results
       */
      search: (query: string): Array<{ item: Note; score: number }> => {
        if (!query || typeof query !== 'string' || query.trim().length === 0) {
          return state.notes.map(note => ({ item: note, score: 0 }));
        }

        try {
          const fuse = new Fuse(state.notes, {
            useExtendedSearch: true,
            keys: ['title', 'body']
          });
          return fuse.search(query) as Array<{ item: Note; score: number }>;
        } catch (error) {
          handleError(error, {
            module: 'state',
            method: 'notes.search',
            silent: true
          });
          return [];
        }
      }
    },

    /**
     * ID generation
     */
    generateId: generateId,

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
      }
    }
  };
};

// Singleton instance
const AppState = createAppState();

// Export both the factory and the singleton for testing
export { createAppState };
export default AppState;
