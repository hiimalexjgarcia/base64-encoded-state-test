/**
 * Smoke test for the real index.html. jsdom tests otherwise build their own
 * toolbar fixture, so a change to index.html could silently break the IDs and
 * roles the app queries at startup.
 */

import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';

const html = readFileSync(resolve(process.cwd(), 'index.html'), 'utf8');
const doc = new DOMParser().parseFromString(html, 'text/html');

const byId = (id: string): HTMLElement | null => doc.getElementById(id);

describe('index.html', () => {
  it('contains every element id the app bootstraps against', () => {
    [
      'addNoteBtn',
      'copyLinkBtn',
      'clearCompletedBtn',
      'showCompletedCheckbox',
      'notesDisplayCount',
      'notesInputSearch',
      'notes',
    ].forEach((id) => {
      expect(byId(id)).not.toBeNull();
    });
  });

  it('exposes list semantics and labelled controls', () => {
    expect(byId('notes')?.getAttribute('role')).toBe('list');
    expect(byId('notes')?.getAttribute('aria-label')).toBe('Notes');
    expect(byId('notesInputSearch')?.getAttribute('aria-label')).toBe('Search notes');
    expect(byId('notesDisplayCount')?.getAttribute('aria-live')).toBe('polite');
    expect(doc.querySelector('[role="group"][aria-label="Note controls"]')).not.toBeNull();
  });

  it('boots from a module script without inline styles', () => {
    const script = doc.querySelector('script[type="module"]');
    expect(script?.getAttribute('src')).toBe('/src/index.ts');
    expect(doc.querySelectorAll('[style]')).toHaveLength(0);
  });

  it('publishes absolute social preview metadata', () => {
    const image = doc.querySelector('meta[property="og:image"]')?.getAttribute('content');

    expect(image).toMatch(/^https:\/\//);
    expect(doc.querySelector('meta[name="twitter:card"]')?.getAttribute('content'))
      .toBe('summary_large_image');
    expect(doc.querySelector('meta[property="og:title"]')?.getAttribute('content'))
      .toContain('Sticky Notes');
  });
});
