/**
 * Toolbar wiring: search, add, copy link, clear completed, completion
 * visibility, and keyboard shortcuts.
 */

import { getSearchInput, getShowCompletedCheckbox } from './dom';
import type { BoardController } from './board';
import type { CommitResult } from './inlineEditor';

const SEARCH_DEBOUNCE_MS = 100;

export interface ToolbarDeps {
  board: BoardController;
  editor: { commit: () => CommitResult };
  addNote: () => void;
  clearCompleted: () => void;
  buildShareUrl: () => string;
}

export type ToolbarCleanup = () => void;

const isTypingTarget = (target: EventTarget | null): boolean => {
  if (!(target instanceof HTMLElement)) {return false;}

  return (
    target.tagName === 'INPUT' ||
    target.tagName === 'TEXTAREA' ||
    target.isContentEditable
  );
};

export const createToolbar = (deps: ToolbarDeps): ToolbarCleanup => {
  const cleanups: Array<() => void> = [];
  let searchTimer: number | null = null;
  let labelTimer: number | null = null;

  const search = getSearchInput();
  if (search) {
    const scheduleRender = (): void => {
      if (searchTimer !== null) {
        window.clearTimeout(searchTimer);
      }
      searchTimer = window.setTimeout(() => {
        searchTimer = null;
        deps.board.render();
      }, SEARCH_DEBOUNCE_MS);
    };

    const onSearchChange = (): void => {
      // Commit an open editor before filtering so typing in the search box
      // cannot silently throw away an in-progress edit. Invalid drafts keep
      // the editor (and its error) on screen instead.
      if (deps.editor.commit() === 'invalid') {
        return;
      }
      scheduleRender();
    };

    search.addEventListener('input', onSearchChange, false);
    search.addEventListener('search', onSearchChange, false);
    cleanups.push(() => {
      search.removeEventListener('input', onSearchChange, false);
      search.removeEventListener('search', onSearchChange, false);
    });
  }

  const addBtn = document.getElementById('addNoteBtn');
  if (addBtn) {
    addBtn.addEventListener('click', deps.addNote);
    cleanups.push(() => addBtn.removeEventListener('click', deps.addNote));
  }

  const copyBtn = document.getElementById('copyLinkBtn') as HTMLButtonElement | null;
  if (copyBtn) {
    const onCopy = async (): Promise<void> => {
      // A copy action must not capture the previous saved state. Commit the
      // open draft first; an invalid draft keeps the editor and its error.
      if (deps.editor.commit() === 'invalid') {
        return;
      }

      // Rebuild the URL from state instead of reading location.href: the
      // address bar can be stale when replaceState failed, and copying it
      // would silently share an older board.
      const url = deps.buildShareUrl();
      try {
        await navigator.clipboard.writeText(url);
        const original = copyBtn.textContent;
        copyBtn.textContent = 'Copied!';
        labelTimer = window.setTimeout(() => {
          copyBtn.textContent = original;
          labelTimer = null;
        }, 1500);
      } catch {
        // eslint-disable-next-line no-alert
        window.prompt('Copy this link:', url);
      }
    };

    copyBtn.addEventListener('click', onCopy);
    cleanups.push(() => copyBtn.removeEventListener('click', onCopy));
  }

  const clearBtn = document.getElementById('clearCompletedBtn');
  if (clearBtn) {
    // Undo already covers accidental clears, so a confirm dialog would only
    // add friction on top of the recovery path.
    clearBtn.addEventListener('click', deps.clearCompleted);
    cleanups.push(() => clearBtn.removeEventListener('click', deps.clearCompleted));
  }

  const showCompleted = getShowCompletedCheckbox();
  if (showCompleted) {
    const onShowCompletedChange = (): void => {
      // Commit the draft first; undo the toggle if it can't be saved.
      if (deps.editor.commit() === 'invalid') {
        showCompleted.checked = !showCompleted.checked;

        return;
      }
      deps.board.render();
    };
    showCompleted.addEventListener('change', onShowCompletedChange);
    cleanups.push(() => showCompleted.removeEventListener('change', onShowCompletedChange));
  }

  const onKeydown = (event: KeyboardEvent): void => {
    if (event.ctrlKey || event.metaKey || event.altKey) {return;}
    if (isTypingTarget(event.target)) {return;}

    if (event.key === 'n' || event.key === 'N') {
      event.preventDefault();
      deps.addNote();
    } else if (event.key === '/') {
      event.preventDefault();
      getSearchInput()?.focus();
    }
  };
  document.addEventListener('keydown', onKeydown);
  cleanups.push(() => document.removeEventListener('keydown', onKeydown));

  return (): void => {
    cleanups.forEach((cleanup) => cleanup());
    if (searchTimer !== null) {
      window.clearTimeout(searchTimer);
      searchTimer = null;
    }
    if (labelTimer !== null) {
      window.clearTimeout(labelTimer);
      labelTimer = null;
    }
  };
};
