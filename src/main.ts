/**
 * Application entry point. The composition root lives in ./app/bootstrap so
 * this file only deals with startup timing and the CSS import.
 */

import { AppController, bootstrap } from './app/bootstrap';
import './styles/app.css';

let app: AppController | null = null;

const start = (): void => {
  app = bootstrap();
};

if (document.readyState === 'loading') {
  document.addEventListener('DOMContentLoaded', start, { once: true });
} else {
  start();
}

/** Tears down the running app. Exposed for tests and future hot reload. */
export const stop = (): void => {
  app?.destroy();
  app = null;
};
