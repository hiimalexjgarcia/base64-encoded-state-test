/**
 * Application entry point. The composition root lives in ./app/createApp so
 * this file only deals with startup timing and the CSS import.
 */

import { App, createApp } from './app/createApp';
import { createNoteStore } from './notes/store';
import './styles/app.css';

let app: App | null = null;

const start = (): void => {
  app = createApp(createNoteStore());
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
