/**
 * Centralized error handling utility
 */

import { ErrorContext } from '../types';

/**
 * Handles errors consistently across the application
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
