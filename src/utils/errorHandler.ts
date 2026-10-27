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

  console.error(`[${module}.${method}]`, error);

  if (process.env.NODE_ENV === 'development' && !silent && error instanceof Error) {
    console.debug(`[${module}.${method}] details:`, error.stack);
  }
};
