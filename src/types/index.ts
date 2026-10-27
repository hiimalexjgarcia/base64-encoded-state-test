/**
 * Application type definitions
 */

/**
 * A note in the application
 */
export interface Note {
  id: string;
  title: string;
  body: string;
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
    remove: (note: Note) => void;
    search: (query: string) => Array<{ item: Note; score: number }>;
  };
  pubsub: {
    subscribe: (topic: string, callback: (...args: any[]) => void) => string;
    unsubscribe: (token: string) => void;
  };
}
