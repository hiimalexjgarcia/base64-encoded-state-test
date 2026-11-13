import { jest } from '@jest/globals';
import {
  byId,
  cleanupApp,
  hashFor,
  loadApp,
  makeNote,
  noteEl,
} from '../support/appHarness';
import { NOTE_VALIDATION } from '../../src/notes/model';
import { decodeState } from '../../src/url/codec';

const decodeTitle = (encoded: string): string | undefined =>
  decodeState(encoded).state.notes[0]?.title;

afterEach(cleanupApp);

describe('copy link', () => {
  it('copies the share link and restores the button label', async () => {
    const writeText = jest.fn().mockResolvedValue(undefined);
    Object.defineProperty(navigator, 'clipboard', {
      value: { writeText },
      configurable: true,
    });
    loadApp(hashFor([makeNote({ id: 'a' })]));
    jest.useFakeTimers();

    try {
      const btn = byId<HTMLButtonElement>('copyLinkBtn');
      btn.click();
      await Promise.resolve();
      await Promise.resolve();

      expect(writeText).toHaveBeenCalledWith(window.location.href);
      expect(btn.textContent).toBe('Copied!');

      jest.advanceTimersByTime(1500);
      expect(btn.textContent).toBe('Copy link');
    } finally {
      jest.useRealTimers();
    }
  });

  it('commits an open draft before copying the link', async () => {
    const writeText = jest.fn().mockResolvedValue(undefined);
    Object.defineProperty(navigator, 'clipboard', {
      value: { writeText },
      configurable: true,
    });
    const { store } = loadApp(hashFor([makeNote({ id: 'a', title: 'Saved' })]));

    (noteEl('a')?.querySelector('.note-edit') as HTMLButtonElement).click();
    const input = document.querySelector('.note-title-input') as HTMLInputElement;
    input.value = 'Unsaved';
    input.dispatchEvent(new Event('input'));

    byId<HTMLButtonElement>('copyLinkBtn').click();
    await Promise.resolve();
    await Promise.resolve();

    const copied = writeText.mock.calls[0][0] as unknown as string;
    const encoded = copied.replace(/^.*#\/?/, '');

    expect(store.getNotes()[0].title).toBe('Unsaved');
    expect(decodeTitle(encoded)).toBe('Unsaved');
  });

  it('does not copy the link while the open draft is invalid', async () => {
    const writeText = jest.fn().mockResolvedValue(undefined);
    Object.defineProperty(navigator, 'clipboard', {
      value: { writeText },
      configurable: true,
    });
    loadApp(hashFor([makeNote({ id: 'a', title: 'Saved' })]));

    (noteEl('a')?.querySelector('.note-edit') as HTMLButtonElement).click();
    const input = document.querySelector('.note-title-input') as HTMLInputElement;
    input.value = '';
    input.dispatchEvent(new Event('input'));

    byId<HTMLButtonElement>('copyLinkBtn').click();
    await Promise.resolve();

    expect(writeText).not.toHaveBeenCalled();
    expect(document.querySelector('.note-title-input')).not.toBeNull();
    expect(document.querySelector('.note-edit-error')).not.toBeNull();
  });

  it('falls back to a prompt when clipboard access fails', async () => {
    const writeText = jest.fn().mockRejectedValue(new Error('denied'));
    Object.defineProperty(navigator, 'clipboard', {
      value: { writeText },
      configurable: true,
    });
    const promptSpy = jest.spyOn(window, 'prompt').mockImplementation(() => null);
    loadApp('');

    byId<HTMLButtonElement>('copyLinkBtn').click();
    await Promise.resolve();
    await Promise.resolve();

    expect(promptSpy).toHaveBeenCalledWith('Copy this link:', window.location.href);
  });

  it('copies the current query string with the canonical link', async () => {
    const writeText = jest.fn().mockResolvedValue(undefined);
    Object.defineProperty(navigator, 'clipboard', {
      value: { writeText },
      configurable: true,
    });
    loadApp('');
    window.history.replaceState(null, '', '/?utm=share#/');

    byId<HTMLButtonElement>('copyLinkBtn').click();
    await Promise.resolve();
    await Promise.resolve();

    expect(writeText).toHaveBeenCalledWith(`${window.location.origin}/?utm=share#/`);
  });

  it('copies the current state when replaceState failed and the bar is stale', async () => {
    const writeText = jest.fn().mockResolvedValue(undefined);
    Object.defineProperty(navigator, 'clipboard', {
      value: { writeText },
      configurable: true,
    });
    const { store } = loadApp(hashFor([makeNote({ id: 'a', title: 'Before' })]));
    const staleUrl = window.location.href;
    jest.spyOn(window.history, 'replaceState').mockImplementation(() => {
      throw new DOMException('blocked', 'SecurityError');
    });

    store.updateNote({ ...makeNote({ id: 'a', title: 'After' }) });
    expect(window.location.href).toBe(staleUrl);

    byId<HTMLButtonElement>('copyLinkBtn').click();
    await Promise.resolve();
    await Promise.resolve();

    const copied = writeText.mock.calls[0][0] as unknown as string;
    const encoded = copied.replace(/^.*#\/?/, '');

    expect(copied).toBe(`${window.location.origin}/#/${store.getEncoded()}`);
    expect(copied).not.toBe(staleUrl);
    expect(decodeTitle(encoded)).toBe('After');
  });
});

describe('URL guardrails', () => {
  const bigBody = 'x'.repeat(8000);

  it('shows one visible warning when the share link exceeds the threshold', () => {
    const { store } = loadApp(hashFor([
      makeNote({ id: 'a', title: 'Big 1', body: bigBody }),
      makeNote({ id: 'b', title: 'Big 2', body: bigBody }),
    ]));

    expect(document.getElementById('urlWarning')?.textContent).toMatch(/may be truncated/i);

    // Further edits reuse the same banner instead of piling up warnings.
    store.addNote(makeNote({ id: 'c', title: 'Small' }));
    expect(document.querySelectorAll('#urlWarning')).toHaveLength(1);
    expect(document.getElementById('urlWarning')?.textContent).toMatch(/may be truncated/i);
  });

  it('clears the warning once the share link is short enough', () => {
    const { store } = loadApp(hashFor([
      makeNote({ id: 'a', title: 'Big', body: bigBody }),
      makeNote({ id: 'b', title: 'Also big', body: bigBody }),
    ]));
    expect(document.getElementById('urlWarning')).not.toBeNull();

    store.setNotes([makeNote({ id: 'a', title: 'Small' })]);

    expect(document.getElementById('urlWarning')).toBeNull();
  });

  it('warns visibly when the address bar cannot be updated', () => {
    const { store } = loadApp('');
    jest.spyOn(window.history, 'replaceState').mockImplementation(() => {
      throw new DOMException('blocked', 'SecurityError');
    });

    store.addNote(makeNote({ id: 'a', title: 'Still here' }));

    expect(store.getNotes()).toHaveLength(1);
    expect(document.getElementById('urlWarning')?.textContent).toMatch(/address bar/i);
  });

  it('keeps the editor open when a save would exceed the URL budget', () => {
    const notes = Array.from({ length: 8 }, (_, index) => makeNote({
      id: `n${index}`,
      title: 'T',
      body: 'x'.repeat(9_300),
    }));
    const { store } = loadApp(hashFor(notes));

    (noteEl('n0')?.querySelector('.note-edit') as HTMLButtonElement).click();
    const body = document.querySelector('.note-body-input') as HTMLTextAreaElement;
    body.value = 'x'.repeat(NOTE_VALIDATION.BODY_MAX_LENGTH);
    body.dispatchEvent(new Event('input'));
    (document.querySelector('.note-actions button[aria-label="Save note"]') as HTMLButtonElement)
      .click();

    expect(document.querySelector('.note-edit-error')?.textContent).toMatch(/too large/i);
    expect(document.querySelector('.note-body-input')).not.toBeNull();
    expect(store.getNotes()[0].body).toHaveLength(9_300);
  });

  it('preserves query parameters when syncing the hash', () => {
    const { store } = loadApp('');
    window.history.replaceState(null, '', '/?utm=campaign#');

    store.addNote(makeNote({ id: 'a', title: 'Kept' }));

    expect(window.location.pathname).toBe('/');
    expect(window.location.search).toBe('?utm=campaign');
    expect(window.location.hash).toMatch(/^#\/.+/);
  });
});
