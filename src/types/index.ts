/**
 * Application type definitions
 */

/**
 * A note in the application
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

/**
 * Application state shape
 */
export interface AppState {
  notes: Note[];
}

/**
 * Encoded state for URL storage
 */
export type EncodedState = string;

/**
 * Validation limits for notes
 */
export const NOTE_VALIDATION = {
  TITLE_MAX_LENGTH: 200,
  BODY_MAX_LENGTH: 10000,
  TITLE_MIN_LENGTH: 1,
  BODY_MIN_LENGTH: 0,
} as const;

/**
 * Context for error handling
 */
export interface ErrorContext {
  module?: string;
  method?: string;
  silent?: boolean;
}

/**
 * AppState instance type
 */
export interface IAppState {
  state: {
    get: () => AppState;
    getEncoded: () => EncodedState;
    setEncoded: (encoded: EncodedState) => void;
  };
  notes: {
    getAll: () => Note[];
    add: (note: Note) => void;
    update: (note: Note) => void;
    remove: (note: Note) => void;
    clearCompleted: () => void;
    setAll: (notes: Note[]) => void;
  };
  generateId: () => string;
  pubsub: {
    subscribe: (topic: string, callback: (...args: unknown[]) => void) => string;
    unsubscribe: (token: string) => void;
  };
}
