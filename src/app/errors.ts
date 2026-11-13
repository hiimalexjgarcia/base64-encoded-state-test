/**
 * Application error logging shared by the store and UI modules.
 */

export interface ErrorContext {
  module?: string;
  method?: string;
  silent?: boolean;
}

/**
 * Handles errors consistently across the application.
 * @param error - The error to handle
 * @param context - Context information for debugging
 */
export const handleError = (error: unknown, context: ErrorContext = {}): void => {
  const { module = 'app', method = 'unknown', silent = false } = context;

  // eslint-disable-next-line no-console
  console.error(`[${module}.${method}]`, error);

  if (import.meta.env?.DEV && !silent && error instanceof Error) {
    // eslint-disable-next-line no-console
    console.debug(`[${module}.${method}] details:`, error.stack);
  }
};
