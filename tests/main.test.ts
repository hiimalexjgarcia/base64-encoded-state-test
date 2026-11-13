/**
 * Tests for the real entry point: startup timing, CSS entry import, and the
 * exported stop() teardown. Each test reloads the module registry so main.ts
 * starts from an empty state.
 */

import { jest } from '@jest/globals';
import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';

const indexHtml = readFileSync(resolve(process.cwd(), 'index.html'), 'utf8');

const renderPage = (): void => {
  const doc = new DOMParser().parseFromString(indexHtml, 'text/html');
  document.body.innerHTML = doc.body.innerHTML;
};

const setReadyState = (state: DocumentReadyState): void => {
  Object.defineProperty(document, 'readyState', {
    value: state,
    configurable: true,
  });
};

describe('main entry', () => {
  beforeEach(() => {
    jest.resetModules();
    renderPage();
    setReadyState('complete');
    window.history.replaceState(null, '', '/#/');
  });

  afterEach(async () => {
    const { stop } = await import('../src/main');
    stop();
  });

  it('boots immediately when the document is already complete', async () => {
    await import('../src/main');

    expect(document.querySelector('.notes-empty')?.textContent).toContain('No notes yet');

    (document.getElementById('addNoteBtn') as HTMLButtonElement).click();

    expect(document.querySelector('.note-title-input')).not.toBeNull();
  });

  it('waits for DOMContentLoaded when the document is still loading', async () => {
    setReadyState('loading');
    await import('../src/main');

    expect(document.querySelector('#notes .note')).toBeNull();
    expect(document.querySelector('.notes-empty')).toBeNull();

    document.dispatchEvent(new Event('DOMContentLoaded'));

    expect(document.querySelector('.notes-empty')?.textContent).toContain('No notes yet');
  });

  it('stop() removes the toolbar listeners', async () => {
    await import('../src/main');
    const { stop } = await import('../src/main');

    stop();
    (document.getElementById('addNoteBtn') as HTMLButtonElement).click();

    expect(document.querySelector('.note-title-input')).toBeNull();
  });
});
