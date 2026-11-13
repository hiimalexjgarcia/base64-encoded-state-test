import { jest } from '@jest/globals';
import {
  byId,
  cleanupApp,
  hashFor,
  loadApp,
  makeNote,
  noteEl,
  typeKey,
} from '../support/appHarness';

afterEach(cleanupApp);

describe('undo toast', () => {
  it('deletes a note and restores it via the undo toast', () => {
    const { store } = loadApp(hashFor([
      makeNote({ id: 'a', title: 'First' }),
      makeNote({ id: 'b', title: 'Second' }),
    ]));

    (noteEl('a')?.querySelector('.note-delete') as HTMLButtonElement).click();
    expect(store.getNotes().map((n) => n.id)).toEqual(['b']);

    const toast = document.querySelector('#undoToast') as HTMLElement;
    expect(toast.textContent).toContain('Note deleted.');
    expect(toast.getAttribute('role')).toBe('region');
    expect(toast.querySelector('[role="status"]')?.getAttribute('aria-live')).toBe('polite');
    (toast.querySelector('button') as HTMLButtonElement).click();

    expect(store.getNotes().map((n) => n.id)).toEqual(['a', 'b']);
    expect(document.querySelector('#undoToast')).toBeNull();
  });

  it('replaces an existing undo toast when another note is deleted', () => {
    const { store } = loadApp(hashFor([
      makeNote({ id: 'a', title: 'First' }),
      makeNote({ id: 'b', title: 'Second' }),
    ]));

    (noteEl('a')?.querySelector('.note-delete') as HTMLButtonElement).click();
    (noteEl('b')?.querySelector('.note-delete') as HTMLButtonElement).click();

    expect(store.getNotes()).toEqual([]);
    expect(document.querySelectorAll('#undoToast')).toHaveLength(1);

    (document.querySelector('#undoToast button') as HTMLButtonElement).click();
    expect(store.getNotes().map((n) => n.id)).toEqual(['b']);
  });

  it('pauses the undo timeout while the Undo button is focused', () => {
    loadApp(hashFor([makeNote({ id: 'a', title: 'First' })]));
    jest.useFakeTimers();
    try {
      (noteEl('a')?.querySelector('.note-delete') as HTMLButtonElement).click();
      const undoBtn = document.querySelector('#undoToast button') as HTMLButtonElement;
      expect(undoBtn).not.toBeNull();

      // Showing the toast focuses Undo, so the countdown stays paused.
      jest.advanceTimersByTime(6000);
      expect(document.querySelector('#undoToast')).not.toBeNull();

      undoBtn.blur();
      jest.advanceTimersByTime(5999);
      expect(document.querySelector('#undoToast')).not.toBeNull();
      jest.advanceTimersByTime(1);
      expect(document.querySelector('#undoToast')).toBeNull();
    } finally {
      jest.useRealTimers();
    }
  });

  it('pauses the undo timeout while the toast is hovered', () => {
    loadApp(hashFor([makeNote({ id: 'a', title: 'First' })]));
    jest.useFakeTimers();
    try {
      (noteEl('a')?.querySelector('.note-delete') as HTMLButtonElement).click();
      const toast = document.querySelector('#undoToast') as HTMLElement;
      (toast.querySelector('button') as HTMLButtonElement).blur();

      toast.dispatchEvent(new MouseEvent('mouseenter'));
      jest.advanceTimersByTime(6000);
      expect(document.querySelector('#undoToast')).not.toBeNull();

      toast.dispatchEvent(new MouseEvent('mouseleave'));
      jest.advanceTimersByTime(6000);
      expect(document.querySelector('#undoToast')).toBeNull();
    } finally {
      jest.useRealTimers();
    }
  });

  it('drops the undo history when navigating to another board', () => {
    const { store } = loadApp(hashFor([makeNote({ id: 'a', title: 'Old board' })]));

    (noteEl('a')?.querySelector('.note-delete') as HTMLButtonElement).click();
    expect(document.querySelector('#undoToast')).not.toBeNull();

    window.history.replaceState(
      null,
      '',
      `/#/${hashFor([makeNote({ id: 'b', title: 'New board' })])}`,
    );
    window.dispatchEvent(new Event('hashchange'));

    expect(document.querySelector('#undoToast')).toBeNull();
    expect(store.getNotes().map((n) => n.id)).toEqual(['b']);
  });

  it('dismisses the undo toast with its dismiss button', () => {
    const { store } = loadApp(hashFor([
      makeNote({ id: 'a', title: 'First' }),
      makeNote({ id: 'b', title: 'Second' }),
    ]));

    (noteEl('a')?.querySelector('.note-delete') as HTMLButtonElement).click();
    (document.querySelector('.undo-toast-dismiss') as HTMLButtonElement).click();

    expect(document.querySelector('#undoToast')).toBeNull();
    expect(store.getNotes().map((n) => n.id)).toEqual(['b']);
  });

  it('dismisses the undo toast on Escape', () => {
    const { store } = loadApp(hashFor([
      makeNote({ id: 'a', title: 'First' }),
      makeNote({ id: 'b', title: 'Second' }),
    ]));

    (noteEl('a')?.querySelector('.note-delete') as HTMLButtonElement).click();
    const undoBtn = document.querySelector('#undoToast button') as HTMLButtonElement;
    undoBtn.focus();
    typeKey(undoBtn, 'Escape');

    expect(document.querySelector('#undoToast')).toBeNull();
    expect(store.getNotes().map((n) => n.id)).toEqual(['b']);
  });
});

describe('clear completed', () => {
  it('clears completed notes and can undo the clear', () => {
    const { store } = loadApp(hashFor([
      makeNote({ id: 'a', title: 'Active' }),
      makeNote({ id: 'b', title: 'Done 1', completed: true }),
      makeNote({ id: 'c', title: 'Done 2', completed: true }),
    ]));

    byId<HTMLButtonElement>('clearCompletedBtn').click();
    expect(store.getNotes().map((n) => n.id)).toEqual(['a']);
    expect(document.querySelector('#undoToast')?.textContent).toContain('2 notes cleared.');

    (document.querySelector('#undoToast button') as HTMLButtonElement).click();
    expect(store.getNotes().map((n) => n.id)).toEqual(['a', 'b', 'c']);
  });

  it('does nothing when there are no completed notes to clear', () => {
    const { store } = loadApp(hashFor([makeNote({ id: 'a', title: 'Active' })]));

    byId<HTMLButtonElement>('clearCompletedBtn').click();

    expect(store.getNotes()).toHaveLength(1);
    expect(document.querySelector('#undoToast')).toBeNull();
  });
});
