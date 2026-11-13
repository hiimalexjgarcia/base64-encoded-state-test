/**
 * Integration-test harness. It loads the real index.html body as the page
 * fixture and boots the real composition root against a fresh store, so tests
 * no longer need jest.resetModules() or a hand-maintained toolbar fixture.
 */

import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';
import { AppController, bootstrap } from '../../src/app/bootstrap';
import { Note } from '../../src/notes/model';
import { createNoteStore, NoteStore } from '../../src/notes/store';
import { encodeState } from '../../src/persistence/urlCodec';

const indexHtml = readFileSync(resolve(process.cwd(), 'index.html'), 'utf8');

export interface AppHarness {
  app: AppController;
  store: NoteStore;
  destroy: () => void;
}

let current: AppHarness | null = null;

/** Replaces the page body with the real index.html body markup. */
export const renderPage = (): void => {
  const doc = new DOMParser().parseFromString(indexHtml, 'text/html');
  document.body.innerHTML = doc.body.innerHTML;
};

const setReadyState = (state: DocumentReadyState): void => {
  Object.defineProperty(document, 'readyState', {
    value: state,
    configurable: true,
  });
};

/** Boots the app with the canonical `#/<encoded>` hash format. */
export const loadApp = (encoded = ''): AppHarness => loadAppWithHash(`/${encoded}`);

/** Boots the app with a raw hash body so non-canonical links can be tested. */
export const loadAppWithHash = (hash: string): AppHarness => {
  cleanupApp();
  renderPage();
  setReadyState('complete');
  window.history.replaceState(null, '', `/#${hash}`);

  const store = createNoteStore();
  const app = bootstrap(store);
  current = {
    app,
    store,
    destroy: (): void => app.destroy(),
  };

  return current;
};

/** Tears down the most recently loaded app, if any. */
export const cleanupApp = (): void => {
  current?.destroy();
  current = null;
};

export const makeNote = (overrides: Partial<Note> = {}): Note => ({
  id: 'a',
  title: 'Note A',
  body: '',
  ...overrides,
});

export const hashFor = (notes: Note[]): string => encodeState({ notes });

export const byId = <T extends HTMLElement>(id: string): T =>
  document.getElementById(id) as T;

export const noteEl = (id: string): HTMLElement | null => {
  const notes = document.querySelectorAll<HTMLElement>('#notes .note');
  for (const el of notes) {
    if (el.dataset.id === id) {
      return el;
    }
  }

  return null;
};

export const typeKey = (
  target: EventTarget,
  key: string,
  init: KeyboardEventInit = {},
): void => {
  target.dispatchEvent(new KeyboardEvent('keydown', { key, bubbles: true, ...init }));
};

export const fireBeforeUnload = (): Event => {
  const event = new Event('beforeunload', { cancelable: true });
  window.dispatchEvent(event);

  return event;
};
